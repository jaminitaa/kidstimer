import { describe, expect, it } from 'vitest';
import { msUntil, parseTimeValue } from './untilTime';

const at = (h: number, m: number, s: number): Date => new Date(2026, 10, 22, h, m, s);

describe('parseTimeValue', () => {
  it('parses HH:MM', () => {
    expect(parseTimeValue('09:30')).toEqual({ hours: 9, minutes: 30 });
    expect(parseTimeValue('00:00')).toEqual({ hours: 0, minutes: 0 });
    expect(parseTimeValue('23:59')).toEqual({ hours: 23, minutes: 59 });
  });
  it('rejects bad values', () => {
    for (const bad of ['', '24:00', '09:60', '9:3x', '0930']) expect(parseTimeValue(bad)).toBeNull();
  });
});

describe('msUntil', () => {
  it('counts to a later time today', () => {
    expect(msUntil({ hours: 9, minutes: 30 }, at(9, 0, 0))).toBe(1_800_000);
    expect(msUntil({ hours: 9, minutes: 30 }, at(9, 10, 30))).toBe(1_170_000);
  });
  it('rolls to tomorrow when now or already passed', () => {
    expect(msUntil({ hours: 9, minutes: 30 }, at(9, 30, 0))).toBe(86_400_000);
    expect(msUntil({ hours: 9, minutes: 30 }, at(9, 30, 20))).toBe(86_380_000);
    expect(msUntil({ hours: 8, minutes: 0 }, at(17, 0, 0))).toBe(54_000_000);
  });
  it('never exceeds 24 hours across a clock change', () => {
    const ms = msUntil({ hours: 9, minutes: 0 }, new Date(2026, 9, 31, 9, 0, 0));
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(86_400_000);
  });
});
