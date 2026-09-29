import { BoardShape, cellKey, type Cell, type LevelData } from '../../game/types';
import { findPath } from '../../game/pathGenerator';
import { areNeighborCells } from '../../game/topology';
import { activeBeadSection, beadSections, type BeadPatternData } from './beadProgress';

const levelCache = new WeakMap<BeadPatternData, Map<number, LevelData[]>>();

// Exceptional disconnected artwork is covered by separate strokes in the same
// fixed section. No stroke may invent cells or jump across an empty pixel.
const coverWithPaths = (cells: Cell[], width: number, height: number, seed: number): Cell[][] => {
  const remaining = new Map(cells.map((cell) => [cellKey(cell), cell]));
  const result: Cell[][] = [];
  while (remaining.size > 0) {
    const component = [remaining.values().next().value!];
    const visited = new Set([cellKey(component[0])]);
    for (let i = 0; i < component.length; i += 1) {
      for (const candidate of remaining.values()) {
        const key = cellKey(candidate);
        if (!visited.has(key) && areNeighborCells(component[i], candidate, BoardShape.Rectangle)) {
          visited.add(key);
          component.push(candidate);
        }
      }
    }
    const complete = findPath(height, width, visited, 'square',
      component.length, seed, { crossingMode: 'maximum', maxNodes: 30000 });
    if (complete) {
      result.push(complete);
      complete.forEach((cell) => remaining.delete(cellKey(cell)));
      continue;
    }
    const degree = (cell: Cell): number => [...remaining.values()]
      .filter((other) => areNeighborCells(cell, other, BoardShape.Rectangle)).length;
    let current: Cell | undefined = component.sort((a, b) => degree(a) - degree(b))[0];
    const stroke: Cell[] = [];
    while (current) {
      stroke.push(current);
      remaining.delete(cellKey(current));
      current = [...remaining.values()]
        .filter((candidate) => areNeighborCells(current!, candidate, BoardShape.Rectangle))
        .sort((a, b) => degree(a) - degree(b))[0];
    }
    result.push(stroke);
  }
  return result;
};

export const createBeadSectionLevels = (pattern: BeadPatternData, collected: number): LevelData[] => {
  const section = activeBeadSection(pattern, collected);
  if (!section) throw new Error('拼豆图案已经完成');
  const cached = levelCache.get(pattern)?.get(section.start);
  if (cached) return cached;
  const cells = section.beads.map(({ x, y }) => ({ x: x - section.x, y: y - section.y }));
  const levelId = beadSections(pattern).filter(({ beads }) => beads.length > 0)
    .findIndex(({ start }) => start === section.start) + 1;
  const levels = coverWithPaths(cells, section.width, section.height, section.start).map((solutionPath): LevelData => ({
    levelId,
    boardShape: BoardShape.Rectangle,
    columns: section.width,
    rows: section.height,
    activeCells: solutionPath.map((cell) => ({ ...cell })),
    solutionPath,
    pathSource: 'generated',
  }));
  const cache = levelCache.get(pattern) ?? new Map<number, LevelData[]>();
  cache.set(section.start, levels);
  levelCache.set(pattern, cache);
  return levels;
};

export const createBeadSectionLevel = (pattern: BeadPatternData, collected: number): LevelData => (
  createBeadSectionLevels(pattern, collected)[0]
);
