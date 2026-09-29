import { describe, expect, it } from 'vitest';
import puzzles from './puzzles.json';
import { validate, type Puzzle } from './rules';
const base: Puzzle={id:'test',name:'test',category:'maze',width:2,height:2,start:[0,4],end:[4,0],endDirection:'top',dots:[],gaps:[],symbols:[],solution:[]};
const path=[[0,4],[2,4],[2,2],[2,0],[4,0]];
describe('Witness rule validation',()=>{
  it('accepts every imported reference solution',()=>{expect(puzzles).toHaveLength(36);for(const p of puzzles)expect(validate(p,p.solution),p.id).toBeNull();});
  it('rejects incomplete, crossing and blocked paths',()=>{
    expect(validate(base,path.slice(0,-1))).not.toBeNull();
    expect(validate(base,[[0,4],[2,4],[0,4],...path.slice(1)])).not.toBeNull();
    expect(validate({...base,gaps:[[2,3]]},path)).not.toBeNull();
  });
  it('requires dots on vertices and edges',()=>{
    expect(validate({...base,dots:[[2,3],[2,2]]},path)).toBeNull();
    expect(validate({...base,dots:[[0,2]]},path)).not.toBeNull();
  });
  it('separates square colors by connected regions',()=>{
    const a={x:1,y:1,type:'square',color:'white'},b={x:3,y:1,type:'square',color:'black'};
    expect(validate({...base,symbols:[a,b]},path)).toBeNull();
    expect(validate({...base,symbols:[a,{...b,x:1,y:3}]},path)).not.toBeNull();
  });
  it('pairs stars with exactly one same-color symbol in their region',()=>{
    const star={x:1,y:1,type:'star',color:'yellow'};
    expect(validate({...base,symbols:[star]},path)).not.toBeNull();
    expect(validate({...base,symbols:[star,{...star,y:3,type:'square'}]},path)).toBeNull();
    expect(validate({...base,symbols:[star,{...star,x:3}]},path)).not.toBeNull();
  });
  it('counts triangle sides exactly',()=>{
    const triangle={x:1,y:3,type:'triangle',color:'orange',count:2};
    expect(validate({...base,symbols:[triangle]},path)).toBeNull();
    expect(validate({...base,symbols:[{...triangle,count:1}]},path)).not.toBeNull();
  });
});
