import { describe, expect, it } from 'vitest';
import { detectCrossing } from './marks';

describe('detectCrossing', () => {
  it.each([
    [900_001, 900_000, { kind: 'ding', minutes: 15 }],
    [900_000, 899_750, null],
    [600_000, 599_900, null],
    [300_100, 299_900, { kind: 'ding', minutes: 5 }],
    [180_050, 179_990, { kind: 'ding', minutes: 3 }],
    [60_010, 60_000, { kind: 'ding', minutes: 1 }],
    [400_000, 50_000, { kind: 'ding', minutes: 1 }],
    [250, 0, { kind: 'end' }],
    [400_000, 0, { kind: 'end' }],
    [0, 0, null],
    [100_000, 400_000, null],
  ])('detectCrossing(%d, %d)', (prev, cur, expected) => {
    expect(detectCrossing(prev, cur)).toEqual(expected);
  });
});
