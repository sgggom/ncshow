export type Point = [number, number];
export interface Symbol { x: number; y: number; type: string; color: string; count?: number }
export interface Puzzle {
  source?: 'ttws'; sourceLine?: number;
  id: string; name: string; category: string; width: number; height: number;
  start: number[]; end: number[]; endDirection: string; dots: number[][]; gaps: number[][];
  symbols: Symbol[]; solution: number[][];
}
export const key = (p: number[]): string => p.join(',');
export const same = (a: number[], b: number[]): boolean => key(a) === key(b);
export function canStep(p: Puzzle, a: number[], b: number[]): boolean {
  return b.length === 2 && b.every(Number.isInteger) && b[0] % 2 === 0 && b[1] % 2 === 0
    && b[0] >= 0 && b[1] >= 0 && b[0] <= p.width * 2 && b[1] <= p.height * 2
    && Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 2
    && !p.gaps.some(g => same(g, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]));
}
export function validate(p: Puzzle, path: number[][]): string | null {
  if (!path.length || !same(path[0], p.start) || !same(path[path.length - 1], p.end)) return '从圆形起点连到伸出的终点。';
  if (new Set(path.map(key)).size !== path.length || path.slice(1).some((b, i) => !canStep(p, path[i], b))) return '路线不能交叉，也不能穿过断口。';
  const walls = new Set(path.slice(1).map((b, i) => key([(b[0] + path[i][0]) / 2, (b[1] + path[i][1]) / 2])));
  const touched = new Set([...path.map(key), ...walls]);
  if (p.dots.some(d => !touched.has(key(d)))) return '还没经过所有黑点。';
  for (const s of p.symbols) {
    if (s.type === 'triangle' && [[1,0],[-1,0],[0,1],[0,-1]].filter(([x,y]) => walls.has(key([s.x+x,s.y+y]))).length !== s.count) return '三角形数量必须等于该格被路线经过的边数。';
  }
  const remaining = new Set<string>();
  for (let x=1;x<p.width*2;x+=2) for(let y=1;y<p.height*2;y+=2) remaining.add(key([x,y]));
  while(remaining.size) {
    const first = remaining.values().next().value!;
    const region = new Set([first]); const queue = [first]; remaining.delete(first);
    for(const cell of queue) {
      const [x,y]=cell.split(',').map(Number);
      for(const [dx,dy] of [[2,0],[-2,0],[0,2],[0,-2]]) {
        const n=key([x+dx,y+dy]);
        if(remaining.has(n) && !walls.has(key([x+dx/2,y+dy/2]))) {remaining.delete(n);region.add(n);queue.push(n);}
      }
    }
    const symbols=p.symbols.filter(s=>region.has(key([s.x,s.y])));
    if(new Set(symbols.filter(s=>s.type==='square').map(s=>s.color)).size>1) return '不同颜色的方块要被路线分到不同区域。';
    if(symbols.some(s=>s.type==='star' && symbols.filter(t=>t.color===s.color).length!==2)) return '每颗星星所在区域，必须恰好有两个同色符号。';
  }
  return null;
}
