import type { BeadPatternData } from './beadProgress';
import './beadActivityDialog.css';

/** Native modal keeps pointer and keyboard input off the underlying game. */
export const showBeadActivityDialog = (patterns: readonly BeadPatternData[]): Promise<void> => {
  const dialog = document.createElement('dialog');
  dialog.className = 'bead-activity-dialog';
  dialog.setAttribute('aria-labelledby', 'bead-activity-title');
  dialog.innerHTML = `
    <section class="bead-activity-card">
      <div class="bead-activity-heading">
        <div class="bead-activity-stars" aria-hidden="true"><span>★</span><span>★</span></div>
        <h2 id="bead-activity-title">收集完成！</h2>
        <div class="bead-activity-stars bead-activity-stars--right" aria-hidden="true"><span>★</span><span>★</span></div>
      </div>
      <div class="bead-activity-collection" role="list" aria-label="本局收集的拼豆作品"></div>
      <form method="dialog"><button class="bead-activity-confirm" autofocus>开心收下</button></form>
    </section>`;
  const collection = dialog.querySelector('.bead-activity-collection')!;
  patterns.forEach((pattern, index) => {
    const card = document.createElement('figure');
    card.className = 'bead-activity-art';
    card.setAttribute('role', 'listitem');
    card.style.setProperty('--art-order', String(index));
    const stamp = document.createElement('span');
    stamp.className = 'bead-activity-stamp';
    stamp.textContent = '✓';
    stamp.setAttribute('aria-hidden', 'true');
    const image = document.createElement('img');
    image.src = `./bead-patterns/${pattern.id}.svg`;
    image.alt = pattern.name;
    image.draggable = false;
    const caption = document.createElement('figcaption');
    caption.textContent = pattern.name;
    card.append(stamp, image, caption);
    collection.append(card);
  });
  return new Promise((resolve) => {
    dialog.addEventListener('close', () => { dialog.remove(); resolve(); }, { once: true });
    document.body.append(dialog);
    dialog.showModal();
  });
};
