import { describe, expect, it } from 'vitest';
import { stageFor } from './stage';

describe('stageFor', () => {
  it.each([
    [300_001, 'calm'],
    [300_000, 'warm'],
    [60_001, 'warm'],
    [60_000, 'hot'],
    [1, 'hot'],
    [0, 'done'],
    [-5, 'done'],
  ])('stageFor(%d) is %s', (ms, stage) => {
    expect(stageFor(ms)).toBe(stage);
  });
});
