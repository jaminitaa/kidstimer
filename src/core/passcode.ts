import { LOCKOUT_MS, MAX_WRONG_CODES, PASSCODE_LENGTH } from './constants';

export type LockState = { readonly wrongCount: number; readonly lockedUntil: number | null };

export const INITIAL_LOCK: LockState = { wrongCount: 0, lockedUntil: null };

const ASCII_DIGIT = /^[0-9]$/;
const PASSCODE_PATTERN = new RegExp(`^[0-9]{${PASSCODE_LENGTH}}$`);

export function isValidPasscode(code: string): boolean {
  return PASSCODE_PATTERN.test(code);
}

/** Adds one digit to the entry; ignores non-digits and anything past the passcode length. */
export function appendDigit(entry: string, digit: string): string {
  if (!ASCII_DIGIT.test(digit) || entry.length >= PASSCODE_LENGTH) return entry;
  return entry + digit;
}

export function deleteDigit(entry: string): string {
  return entry.slice(0, -1);
}

export function isLockedOut(lock: LockState, now: number): boolean {
  return lock.lockedUntil !== null && now < lock.lockedUntil;
}

/** Checks an entry. A right code clears the count; the last allowed wrong code starts the wait. */
export function checkPasscode(
  lock: LockState,
  entry: string,
  passcode: string,
  now: number,
): { readonly lock: LockState; readonly outcome: 'ok' | 'wrong' } {
  if (entry === passcode) return { lock: INITIAL_LOCK, outcome: 'ok' };
  const wrongCount = lock.wrongCount + 1;
  if (wrongCount >= MAX_WRONG_CODES) {
    return { lock: { wrongCount: 0, lockedUntil: now + LOCKOUT_MS }, outcome: 'wrong' };
  }
  return { lock: { wrongCount, lockedUntil: null }, outcome: 'wrong' };
}
