import { expect, it } from 'vitest';
import { formatRemaining } from './format';

it.each([
  [900_000, '15:00'], [899_001, '15:00'], [899_000, '14:59'],
  [300_000, '05:00'], [1, '00:01'], [0, '00:00'], [-5, '00:00'],
  [Number.NaN, '00:00'], [28_800_000, '480:00'], [86_400_000, '1440:00'],
])('formatRemaining(%d) is %s', (ms, text) => {
  expect(formatRemaining(ms)).toBe(text);
});
