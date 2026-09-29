import { describe, expect, it } from 'vitest';
import { createBeadSectionLevel } from './beadSectionLevel';
import { beadSections, type BeadPatternData } from './beadProgress';
import { areNeighborCells } from '../../game/topology';

const pattern: BeadPatternData = { id: 'test', name: 'Test', width: 20, height: 20,
  data: Array.from({ length: 20 }, (_, y) => Array.from({ length: 20 }, (_, x) => (
    x >= 2 && y >= 2 ? '#FF9900' : null
  ))) };

describe('bead game section levels', () => {
  it('creates a solvable 7 by 10 board for every nonempty section, including padded edges', () => {
    const sections = beadSections(pattern).filter(({ beads }) => beads.length);
    sections.forEach((section, index) => {
      const level = createBeadSectionLevel(pattern, section.start);
      expect([level.columns, level.rows]).toEqual([7, 10]);
      expect(level.activeCells.every(({ x, y }) => pattern.data[y + section.y]?.[x + section.x])).toBe(true);
      expect(level.levelId).toBe(index + 1);
      expect(new Set(level.solutionPath.map(({ x, y }) => `${x},${y}`)).size).toBe(section.beads.length);
      expect(level.solutionPath.every((cell, i, path) => i === 0 || areNeighborCells(path[i - 1], cell, level.boardShape))).toBe(true);
    });
  });

  it('resumes inside a section and advances only at its bead boundary', () => {
    const first = beadSections(pattern)[0];
    expect(createBeadSectionLevel(pattern, first.end - 1).levelId).toBe(1);
    expect(createBeadSectionLevel(pattern, first.end).levelId).toBe(2);
  });

  it('does not create an extra game after all sections are complete', () => {
    const total = beadSections(pattern).at(-1)!.end;
    expect(() => createBeadSectionLevel(pattern, total)).toThrow('已经完成');
  });
});

it('covers disconnected artwork with valid strokes without filling holes', async () => {
  const { createBeadSectionLevels } = await import('./beadSectionLevel');
  const sparse: BeadPatternData = { id: 'sparse', name: 'Sparse', width: 7, height: 10,
    data: Array.from({ length: 10 }, (_, y) => Array.from({ length: 7 }, (_, x) => (
      (y === 0 && x <= 1) || (x === 6 && y === 9) ? '#FF9900' : null
    ))) };
  const levels = createBeadSectionLevels(sparse, 0);
  expect(levels).toHaveLength(2);
  expect(levels.flatMap((level) => level.activeCells)).toHaveLength(3);
  expect(levels.some((level) => level.activeCells.length === 1)).toBe(true);
  expect(new Set(levels.flatMap((level) => level.activeCells.map(({ x, y }) => `${x},${y}`))))
    .toEqual(new Set(['0,0', '1,0', '6,9']));
});
