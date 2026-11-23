import { describe, expect, it } from 'vitest';
import { parseCustomMinutes } from './validate';

describe('parseCustomMinutes', () => {
  it.each([['20', 20], [' 15 ', 15], ['1', 1], ['1440', 1440], ['007', 7]])('%j ok', (raw, m) =>
    expect(parseCustomMinutes(raw)).toEqual({ ok: true, minutes: m }));

  it.each([
    ['', 'Type a number of minutes.'], ['   ', 'Type a number of minutes.'],
    ['abc', 'Use a whole number, like 20.'], ['1.5', 'Use a whole number, like 20.'],
    ['1e2', 'Use a whole number, like 20.'], ['-3', 'Use a whole number, like 20.'],
    ['+5', 'Use a whole number, like 20.'], ['１５', 'Use a whole number, like 20.'],
    ['0', 'At least 1 minute.'], ['1441', '1440 minutes (24 hours) is the most.'],
    ['99999999999999999999', '1440 minutes (24 hours) is the most.'],
  ])('%j rejected', (raw, message) =>
    expect(parseCustomMinutes(raw)).toEqual({ ok: false, message }));
});
