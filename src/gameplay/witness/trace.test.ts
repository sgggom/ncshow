import { describe, expect, it } from 'vitest';
import { tracePointer } from './trace';
import type { Puzzle } from './rules';
const p: Puzzle={id:'trace',name:'',category:'maze',width:3,height:3,start:[0,6],end:[6,0],endDirection:'top',dots:[],gaps:[],symbols:[],solution:[]};
describe('continuous Witness tracing',()=>{
  it('tracks partial edges without committing a whole edge',()=>{
    for(const x of [.1,.7,1,1.5,1.9]){
      const result=tracePointer(p,[[0,6]],[x,5.9]);
      expect(result.path).toEqual([[0,6]]);expect(result.display).toEqual([[0,6],[x,6]]);
    }
  });
  it('handles fast swipes over multiple vertices and turns',()=>{
    const result=tracePointer(p,[[0,6]],[4.8,6]);
    expect(result.path).toEqual([[0,6],[2,6],[4,6]]);
    expect(result.display.at(-1)).toEqual([4.8,6]);
    expect(tracePointer(p,result.path,[4,4.8]).display.at(-1)).toEqual([4,4.8]);
  });
  it('retracts the visible line continuously before undoing the vertex',()=>{
    const path=[[0,6],[2,6],[4,6]];
    expect(tracePointer(p,path,[3.3,6])).toEqual({path,display:[[0,6],[2,6],[3.3,6]]});
    expect(tracePointer(p,path,[2,6]).path).toEqual([[0,6],[2,6]]);
  });
  it('blocks broken edges and self-intersections',()=>{
    expect(tracePointer({...p,gaps:[[1,6]]},[[0,6]],[1,6]).display).toEqual([[0,6]]);
    const path=[[0,6],[2,6],[2,4],[0,4]];
    expect(tracePointer(p,path,[0,5]).display).toEqual(path);
  });
  it('allows retreating from a rejected endpoint',()=>{
    const path=[[4,2],[6,2],[6,0]];
    expect(tracePointer(p,path,[6,1]).display).toEqual([[4,2],[6,2],[6,1]]);
  });
});
