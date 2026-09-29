export const bindFeatureCarousel = (list: HTMLElement, previous: HTMLButtonElement, next: HTMLButtonElement): void => {
  const step = (): number => (list.firstElementChild as HTMLElement).offsetWidth
    + (Number.parseFloat(getComputedStyle(list).columnGap) || 0);
  const update = (): void => {
    previous.disabled = list.scrollLeft <= 1;
    next.disabled = list.scrollLeft + list.clientWidth >= list.scrollWidth - 1;
  };
  const move = (direction: number): void => {
    list.scrollBy({ left: direction * step(), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  list.addEventListener('scroll', update, { passive: true });
  list.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    move(event.key === 'ArrowRight' ? 1 : -1);
  });
  let drag: { id: number; x: number; scroll: number } | undefined;
  let moved = false;
  list.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, scroll: list.scrollLeft };
    moved = false;
  });
  list.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const delta = (event.clientX - drag.x) * list.clientWidth / list.getBoundingClientRect().width;
    if (!moved && Math.abs(delta) < 8) return;
    moved = true;
    list.classList.add('is-dragging');
    list.setPointerCapture(drag.id);
    list.scrollLeft = drag.scroll - delta;
  });
  const release = (): void => {
    if (drag && list.hasPointerCapture(drag.id)) list.releasePointerCapture(drag.id);
    drag = undefined;
    list.classList.remove('is-dragging');
  };
  window.addEventListener('pointerup', release);
  list.addEventListener('pointercancel', release);
  list.addEventListener('lostpointercapture', release);
  list.addEventListener('dragstart', (event) => event.preventDefault());
  list.addEventListener('click', (event) => {
    if (!moved || event.detail === 0) return;
    event.preventDefault();
    event.stopPropagation();
    moved = false;
  }, true);
  new ResizeObserver(update).observe(list);
  update();
};
