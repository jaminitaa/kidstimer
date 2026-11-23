import { MAX_TIMER_MINUTES, MIN_TIMER_MINUTES } from './constants';

export type MinutesResult =
  | { readonly ok: true; readonly minutes: number }
  | { readonly ok: false; readonly message: string };

const ASCII_DIGITS_ONLY = /^[0-9]+$/;

const fail = (message: string): MinutesResult => ({ ok: false, message });

/** Checks the custom-minutes box: a whole number from 1 to 1440. */
export function parseCustomMinutes(raw: string): MinutesResult {
  const text = raw.trim();
  if (text === '') return fail('Type a number of minutes.');
  if (!ASCII_DIGITS_ONLY.test(text)) return fail('Use a whole number, like 20.');
  const minutes = Number(text);
  if (minutes < MIN_TIMER_MINUTES) return fail(`At least ${MIN_TIMER_MINUTES} minute.`);
  if (minutes > MAX_TIMER_MINUTES) {
    return fail(`${MAX_TIMER_MINUTES} minutes (24 hours) is the most.`);
  }
  return { ok: true, minutes };
}
