import { describe, expect, it } from 'vitest';
import { activeBeadSection, beadSections, orderedBeads, loadBeadSequence, loadBeadJarQueue, type BeadPatternData } from './beadProgress';

const pattern: BeadPatternData = {
  id: 'sections', name: '分区', width: 17, height: 12,
  data: Array.from({ length: 12 }, (_, y) => Array.from({ length: 17 }, (_, x) => (
    (x < 7 && y < 10) || (x === 16 && y === 11) ? '#FF0000' : null
  ))),
};

describe('bead sections', () => {
  it('pads edge sections to equal rectangles and includes every bead exactly once', () => {
    const sections = beadSections(pattern);
    expect(sections).toHaveLength(6);
    expect(sections.every(({ width, height }) => width === 7 && height === 10)).toBe(true);
    expect(orderedBeads(pattern)).toHaveLength(71);
    expect(new Set(orderedBeads(pattern).map(({ x, y }) => `${x},${y}`)).size).toBe(71);
    expect(sections[5].beads).toEqual([{ x: 16, y: 11, color: '#FF0000' }]);
  });

  it('stays in the current section until complete and skips empty sections', () => {
    expect(activeBeadSection(pattern, 69)).toMatchObject({ x: 0, y: 0, end: 70 });
    expect(activeBeadSection(pattern, 70)).toMatchObject({ x: 14, y: 10, start: 70 });
    expect(activeBeadSection(pattern, 71)).toBeUndefined();
  });

  it('finishes each section before moving to the next column', () => {
    const solid = { ...pattern, width: 14, height: 20,
      data: Array.from({ length: 20 }, () => Array<string | null>(14).fill('#FFFFFF')) };
    const beads = orderedBeads(solid);
    expect(beads[69]).toMatchObject({ x: 6, y: 9 });
    expect(beads[70]).toMatchObject({ x: 7, y: 0 });
    expect(beads[140]).toMatchObject({ x: 0, y: 10 });
  });

  it('migrates legacy pending beads without losing earned counts and reloads consistently', () => {
    const values = new Map([
      ['number-connect.bead-progress.v1', JSON.stringify({ patternId: pattern.id, collected: 69 })],
      ['number-connect.bead-jar.v1', JSON.stringify({ beads: [{}, {}] })],
    ]);
    const storage = { getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); } };
    const sequence = loadBeadSequence([pattern], storage);
    expect(sequence.progress.collected).toBe(69);
    const queue = loadBeadJarQueue([pattern], sequence.progress, storage);
    expect(queue.map(({ x, y }) => [x, y])).toEqual([[6, 9], [16, 11]]);
    expect(loadBeadSequence([pattern], storage)).toEqual(sequence);
    expect(loadBeadJarQueue([pattern], sequence.progress, storage)).toEqual(queue);
  });
});
