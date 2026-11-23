import { describe, expect, it } from 'vitest';
import { soundEffectFor } from './tick';

describe('soundEffectFor', () => {
  it('is silent without a previous tick', () => {
    expect(soundEffectFor(null, { at: 0, remainingMs: 300_000 })).toBeNull();
  });

  it('dings when a mark is crossed', () => {
    expect(
      soundEffectFor({ at: 0, remainingMs: 300_100 }, { at: 250, remainingMs: 299_850 }),
    ).toEqual({ kind: 'ding', minutes: 5 });
  });

  it('plays the tune at the end', () => {
    expect(soundEffectFor({ at: 0, remainingMs: 200 }, { at: 250, remainingMs: 0 })).toEqual({
      kind: 'tune',
    });
  });

  it('is silent after the page was asleep', () => {
    expect(
      soundEffectFor({ at: 0, remainingMs: 300_100 }, { at: 2001, remainingMs: 298_099 }),
    ).toBeNull();
    expect(soundEffectFor({ at: 0, remainingMs: 200 }, { at: 9000, remainingMs: 0 })).toBeNull();
  });

  it('is silent when either side has no running timer', () => {
    expect(
      soundEffectFor({ at: 0, remainingMs: null }, { at: 250, remainingMs: 299_000 }),
    ).toBeNull();
    expect(
      soundEffectFor({ at: 0, remainingMs: 300_100 }, { at: 250, remainingMs: null }),
    ).toBeNull();
  });
});
