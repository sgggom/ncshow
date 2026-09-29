import { canStep, same, type Puzzle } from './rules';

/** Project the finger onto grid edges, keeping partial edges out of rule validation. */
export function tracePointer(puzzle: Puzzle, path: number[][], cursor: number[]): { path: number[][]; display: number[][] } {
  const next = path.slice();
  for (let i = 0; i < 64 && next.length; i++) {
    const head = next[next.length - 1];
    if (i > 0 && same(head, puzzle.end)) return { path: next, display: next };
    const delta = cursor.map((v, axis) => v - head[axis]);
    const axis = Math.abs(delta[0]) >= Math.abs(delta[1]) ? 0 : 1;
    const distance = Math.abs(delta[axis]);
    if (distance < 0.001) break;
    const target = head.slice();
    target[axis] += Math.sign(delta[axis]) * 2;
    const backwards = next.length > 1 && same(target, next[next.length - 2]);
    if (!canStep(puzzle, head, target) || (!backwards && next.some(p => same(p, target)))) break;
    // Only commit at the junction, rather than jumping ahead halfway along an edge.
    if (distance >= 1.96) {
      if (backwards) next.pop();
      else next.push(target);
      continue;
    }
    const tip = head.slice();
    tip[axis] += delta[axis];
    return { path: next, display: [...(backwards ? next.slice(0, -1) : next), tip] };
  }
  return { path: next, display: next };
}
