import { describe, expect, it } from 'vitest';
import rawData from './originalPuzzles.json';
import community from './puzzles.json';
import report from '../../../public/witness/ttws/import-report.json';
import { validate } from './rules';
import { tracePointer } from './trace';
const data = rawData.map(p => ({ ...p, source: 'ttws' as const }));
describe('ttws original puzzle import',()=>{
  it('accounts for every source record without exposing unsupported puzzles',()=>{
    expect(report.records).toHaveLength(195);
    expect(data).toHaveLength(report.imported);
    expect(data.length).toBe(78);
    expect(new Set([...data,...community].map(p=>p.id)).size).toBe(data.length+community.length);
    expect(report.records.filter(r=>r.status==='imported').map(r=>r.id).sort()).toEqual(data.map(p=>p.id).sort());
  });
  it('validates every imported solution using the actual runtime rules',()=>{
    for(const p of data)expect(validate(p,p.solution),p.name).toBeNull();
  });
  it('can trace every imported solution through the continuous input model',()=>{
    for(const p of data){
      let path=[p.start];
      for(const point of p.solution.slice(1))path=tracePointer(p,path,point).path;
      expect(validate(p,path),p.name).toBeNull();
    }
  });
});
