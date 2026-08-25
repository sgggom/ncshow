import { describe, expect, it } from 'vitest';
import {
  comboSoundBracketGroupRange,
  encodeComboSoundCompositionConfig,
  isComboSoundArrangement,
  isComboSoundPattern,
  normalizeComboSoundCommas,
  normalizeComboSoundPattern,
  parseComboSoundArrangement,
  parseComboSoundCompositionConfig,
  parseComboSoundPattern,
  remapComboSoundArrangementAfterRemoval,
} from '../game/types';

describe('connection sound composition syntax', () => {
  it('parses fixed notes and random-choice groups as sequence tokens', () => {
    expect(parseComboSoundPattern('1,[2,3,4],5,8')).toEqual([[1], [2, 3, 4], [5], [8]]);
    expect(parseComboSoundPattern('[1,2,3]')).toEqual([[1, 2, 3]]);
    expect(parseComboSoundPattern('9,10,[10,11]')).toEqual([[9], [10], [10, 11]]);
    expect(parseComboSoundPattern('1，[2，3]，8')).toEqual([[1], [2, 3], [8]]);
  });

  it('normalizes Chinese commas and migrates compact legacy patterns', () => {
    expect(normalizeComboSoundPattern('1，[2，3]，8')).toBe('1,[2,3],8');
    expect(normalizeComboSoundCommas('1，，2')).toBe('1,2');
    expect(normalizeComboSoundCommas('1，,2')).toBe('1,2');
    expect(parseComboSoundPattern('1，，[2，3]')).toEqual([[1], [2, 3]]);
    expect(normalizeComboSoundPattern('1[234]58')).toBe('1,[2,3,4],5,8');
  });

  it('rejects empty, incomplete, nested, and out-of-range groups', () => {
    expect(isComboSoundPattern('')).toBe(false);
    expect(isComboSoundPattern('12')).toBe(false);
    expect(isComboSoundPattern('1,[],2')).toBe(false);
    expect(isComboSoundPattern('1,[2,3')).toBe(false);
    expect(isComboSoundPattern('1,[[2,3]]')).toBe(false);
    expect(isComboSoundPattern('1,[2,9]')).toBe(true);
    expect(isComboSoundPattern('1,[9,12]')).toBe(false);
  });

  it('resolves either bracket to the complete random-choice group', () => {
    expect(comboSoundBracketGroupRange('1,[2,3,4],5,8', 2)).toEqual({ start: 2, end: 9 });
    expect(comboSoundBracketGroupRange('1,[2,3,4],5,8', 8)).toEqual({ start: 2, end: 9 });
    expect(comboSoundBracketGroupRange('1,[2,3,4],5,8', 5)).toBeUndefined();
  });
});

describe('connection sound arrangement syntax', () => {
  it('parses comma-separated melody numbers and random melody groups', () => {
    expect(parseComboSoundArrangement('1,2,[3,4],12')).toEqual([[1], [2], [3, 4], [12]]);
    expect(isComboSoundArrangement('1,2,[3,4],12', 12)).toBe(true);
  });

  it('rejects malformed separators, groups, and melody numbers', () => {
    expect(parseComboSoundArrangement('1 2')).toBeUndefined();
    expect(parseComboSoundArrangement('1,,2')).toEqual([[1], [2]]);
    expect(parseComboSoundArrangement('[1,]')).toBeUndefined();
    expect(parseComboSoundArrangement('0,1')).toBeUndefined();
    expect(parseComboSoundArrangement('1,[2,3')).toBeUndefined();
    expect(isComboSoundArrangement('1,3', 2)).toBe(false);
  });

  it('removes deleted melodies and renumbers later melody references', () => {
    expect(remapComboSoundArrangementAfterRemoval('1,2,[3,4],12', 2)).toBe('1,[2,3],11');
    expect(remapComboSoundArrangementAfterRemoval('[2],1', 2)).toBe('1');
  });
});

describe('connection sound composition clipboard config', () => {
  it('round-trips the suite and every melody with versioned JSON', () => {
    const encoded = encodeComboSoundCompositionConfig(
      ['1,2,3', '8,[6,7],5'],
      '1,[1,2],2',
    );
    expect(parseComboSoundCompositionConfig(encoded)).toEqual({
      arrangement: '1,[1,2],2',
      patterns: ['1,2,3', '8,[6,7],5'],
    });
  });

  it('normalizes Chinese commas and legacy melody syntax while importing', () => {
    expect(parseComboSoundCompositionConfig(JSON.stringify({
      type: 'number-connect-sound-composition',
      version: 1,
      arrangement: '1，2',
      melodies: ['123', '8[67]5'],
    }))).toEqual({
      arrangement: '1,2',
      patterns: ['1,2,3', '8,[6,7],5'],
    });
  });

  it('rejects unrelated, malformed, or out-of-range clipboard data', () => {
    expect(parseComboSoundCompositionConfig('not json')).toBeUndefined();
    expect(parseComboSoundCompositionConfig(JSON.stringify({
      type: 'other', version: 1, arrangement: '1', melodies: ['1,2'],
    }))).toBeUndefined();
    expect(parseComboSoundCompositionConfig(JSON.stringify({
      type: 'number-connect-sound-composition', version: 2, arrangement: '1', melodies: ['1,2'],
    }))).toBeUndefined();
    expect(parseComboSoundCompositionConfig(JSON.stringify({
      type: 'number-connect-sound-composition', version: 1, arrangement: '2', melodies: ['1,2'],
    }))).toBeUndefined();
  });
});
