import { describe, expect, it } from 'vitest';
import { appendDigit, checkPasscode, deleteDigit, INITIAL_LOCK, isLockedOut, isValidPasscode } from './passcode';

describe('passcode entry', () => {
  it('validates', () => {
    expect(isValidPasscode('2580')).toBe(true);
    for (const bad of ['', '258', '25800', '25a0', '２５８０']) expect(isValidPasscode(bad)).toBe(false);
  });
  it('appends and deletes digits', () => {
    expect(appendDigit('25', '8')).toBe('258');
    expect(appendDigit('2580', '1')).toBe('2580');
    expect(appendDigit('25', 'x')).toBe('25');
    expect(appendDigit('25', '12')).toBe('25');
    expect(deleteDigit('258')).toBe('25');
    expect(deleteDigit('')).toBe('');
  });
});

describe('checkPasscode', () => {
  it('accepts the right code', () => {
    expect(checkPasscode(INITIAL_LOCK, '2580', '2580', 0)).toEqual({ lock: INITIAL_LOCK, outcome: 'ok' });
  });
  it('locks for 30 seconds after three wrong codes', () => {
    const w1 = checkPasscode(INITIAL_LOCK, '0000', '2580', 0);
    expect(w1).toEqual({ lock: { wrongCount: 1, lockedUntil: null }, outcome: 'wrong' });
    const w2 = checkPasscode(w1.lock, '0000', '2580', 0);
    const w3 = checkPasscode(w2.lock, '0000', '2580', 5_000);
    expect(w3.outcome).toBe('wrong');
    expect(w3.lock).toEqual({ wrongCount: 0, lockedUntil: 35_000 });
    expect(isLockedOut(w3.lock, 34_999)).toBe(true);
    expect(isLockedOut(w3.lock, 35_000)).toBe(false);
    expect(isLockedOut(INITIAL_LOCK, 0)).toBe(false);
    expect(checkPasscode(w2.lock, '2580', '2580', 0).lock).toEqual(INITIAL_LOCK);
  });
});
