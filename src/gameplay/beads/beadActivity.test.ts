import { describe, expect, it } from 'vitest';
import { loadBeadActivity, recordBeadActivityPattern, saveBeadActivity } from './beadActivity';
const patterns = Array.from({ length: 9 }, (_, i) => ({ id: `p${i}`, name: `图案${i}`, width: 1, height: 1, data: [['#ffffff']] }));
const storage = () => {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
};
describe('five-pattern bead activity', () => {
  it('keeps the current group from legacy progress', () => {
    expect(loadBeadActivity(patterns, 'p4', storage()).completed).toEqual(['p0', 'p1', 'p2', 'p3']);
    expect(loadBeadActivity(patterns, 'p7', storage()).completed).toEqual(['p5', 'p6']);
  });
  it('persists all five until acknowledgement and starts a fresh group afterwards', () => {
    const store = storage();
    let activity = { completed: [] as string[] };
    for (const pattern of patterns.slice(0, 5)) activity = recordBeadActivityPattern(activity, pattern.id);
    expect(recordBeadActivityPattern(activity, 'p4')).toEqual(activity);
    saveBeadActivity(activity, store);
    expect(loadBeadActivity(patterns, 'p5', store).completed).toHaveLength(5);
    saveBeadActivity({ completed: [] }, store);
    expect(loadBeadActivity(patterns, 'p5', store).completed).toEqual([]);
  });
  it('supports groups crossing the end of the pattern sequence', () => {
    let activity = { completed: [] as string[] };
    for (const id of ['p5', 'p6', 'p7', 'p8', 'p0']) activity = recordBeadActivityPattern(activity, id);
    const store = storage();
    saveBeadActivity(activity, store);
    expect(loadBeadActivity(patterns, 'p1', store).completed).toEqual(['p5', 'p6', 'p7', 'p8', 'p0']);
  });
});
