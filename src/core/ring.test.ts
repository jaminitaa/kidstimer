import { describe, expect, it } from 'vitest';
import { ringDash, ringFraction } from './ring';

describe('ringFraction', () => {
  it('empties: solid part shrinks as time runs out', () => {
    expect(ringFraction(450_000, 900_000, 'empties')).toBe(0.5);
    expect(ringFraction(900_000, 900_000, 'empties')).toBe(1);
    expect(ringFraction(0, 900_000, 'empties')).toBe(0);
  });

  it('fills: solid part grows as time runs out', () => {
    expect(ringFraction(900_000, 900_000, 'fills')).toBe(0);
    expect(ringFraction(0, 900_000, 'fills')).toBe(1);
    expect(ringFraction(225_000, 900_000, 'fills')).toBe(0.75);
  });

  it('clamps and handles a missing total', () => {
    expect(ringFraction(999_999, 900_000, 'empties')).toBe(1);
    expect(ringFraction(-5, 900_000, 'empties')).toBe(0);
    expect(ringFraction(100, 0, 'empties')).toBe(0);
    expect(ringFraction(100, 0, 'fills')).toBe(1);
  });
});

describe('ringDash', () => {
  it('draws from 12 o clock clockwise in both modes', () => {
    expect(ringDash(0.25, 'empties', 1000)).toEqual({ dasharray: '250 1000', dashoffset: -750 });
    expect(ringDash(0.25, 'fills', 1000)).toEqual({ dasharray: '250 1000', dashoffset: 0 });
  });
});
