export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60_000;
export const MARK_MINUTES = [15, 10, 5, 3, 1] as const;
export const PRESET_MINUTES = [5, 10, 15, 30] as const;
export const ADD_TIME_MINUTES = [1, 5] as const;
export const MIN_TIMER_MINUTES = 1;
export const MIN_TIMER_MS = MIN_TIMER_MINUTES * MS_PER_MINUTE;
export const MAX_TIMER_MINUTES = 1440;
export const MAX_TIMER_MS = MAX_TIMER_MINUTES * MS_PER_MINUTE;
export const WARM_AT_MS = 5 * MS_PER_MINUTE;
export const HOT_AT_MS = 1 * MS_PER_MINUTE;
export const PASSCODE_LENGTH = 4;
export const HOLD_MS = 2000;
export const MAX_WRONG_CODES = 3;
export const LOCKOUT_MS = 30_000;
export const OVERLAY_IDLE_MS = 10_000;
export const TICK_MS = 250;
export const STALE_TICK_MS = 2000;
export const STORAGE_KEY = 'kidstimer.v1';
export const PREVIEW_PORT = 4173;
export const MAX_LABEL_SYMBOLS = 4;
export const QUICK_PICKS: readonly {
  readonly id: string;
  readonly name: string;
  readonly label: string;
}[] = [
  { id: 'tv', name: 'TV', label: '\u{1F4FA}' },
  { id: 'bed', name: 'Bed and zzz', label: '\u{1F6CF}\u{FE0F}\u{1F4A4}' },
  { id: 'shoes', name: 'Shoes and car', label: '\u{1F45F}\u{1F697}' },
  { id: 'slide', name: 'Slide', label: '\u{1F6DD}' },
];
