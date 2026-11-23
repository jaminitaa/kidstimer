import { MAX_TIMER_MS, STORAGE_KEY } from '../core/constants';
import { isValidPasscode } from '../core/passcode';
import type { Timer } from '../core/timer';
import { DEFAULT_PERSISTED, type AppState, type Persisted, type Settings } from './state';

export type StorageBackend = Pick<Storage, 'getItem' | 'setItem'>;

type Raw = Readonly<Record<string, unknown>>;

const isRecord = (value: unknown): value is Raw =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

function parseSettings(value: unknown): Settings {
  if (!isRecord(value)) return DEFAULT_PERSISTED.settings;
  const { ringDirection, passcode } = value;
  const directionOk = ringDirection === 'empties' || ringDirection === 'fills';
  const passcodeOk = passcode === null || (typeof passcode === 'string' && isValidPasscode(passcode));
  if (!directionOk || !passcodeOk) return DEFAULT_PERSISTED.settings;
  return { ringDirection, passcode };
}

function parseTimer(value: unknown): Timer | null {
  if (!isRecord(value)) return null;
  const { status, totalMs } = value;
  if (!isFiniteNumber(totalMs) || totalMs <= 0 || totalMs > MAX_TIMER_MS) return null;
  if (status === 'running') {
    return isFiniteNumber(value.endsAt) ? { status, totalMs, endsAt: value.endsAt } : null;
  }
  if (status === 'paused') {
    const { remainingMs } = value;
    const ok = isFiniteNumber(remainingMs) && remainingMs >= 0 && remainingMs <= totalMs;
    return ok ? { status, totalMs, remainingMs } : null;
  }
  return null;
}

/** Reads saved data. Each part is judged on its own; it never throws. */
export function parsePersisted(raw: string | null): Persisted {
  if (raw === null) return DEFAULT_PERSISTED;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    console.warn('Saved timer data is not valid JSON; starting fresh.', error);
    return DEFAULT_PERSISTED;
  }
  if (!isRecord(data)) return DEFAULT_PERSISTED;
  return { settings: parseSettings(data.settings), timer: parseTimer(data.timer) };
}

/** Only settings and the timer are saved; keypad, lock and overlay are never stored. */
export function serializeState(state: AppState): string {
  return JSON.stringify({ settings: state.settings, timer: state.timer });
}

/** Keeps data for this visit only; nothing survives closing the app. */
function memoryBackend(): StorageBackend {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
  };
}

/**
 * The browser's storage, read through `read` (for example `() => window.localStorage`).
 * With all site data blocked, merely reading it throws; then the timer still works for
 * this visit, keeping its data in memory, and says so once in the console.
 */
export function deviceStorage(read: () => StorageBackend): StorageBackend {
  try {
    return read();
  } catch (error) {
    console.warn(
      'This browser blocks saved data; the timer will forget everything when closed.',
      error,
    );
    return memoryBackend();
  }
}

export function createStorage(backend: StorageBackend): {
  load(): Persisted;
  save(state: AppState): void;
} {
  return {
    load() {
      try {
        return parsePersisted(backend.getItem(STORAGE_KEY));
      } catch (error) {
        console.warn('Could not read saved timer data; starting fresh.', error);
        return DEFAULT_PERSISTED;
      }
    },
    save(state) {
      try {
        backend.setItem(STORAGE_KEY, serializeState(state));
      } catch (error) {
        console.warn('Could not save timer data.', error);
      }
    },
  };
}
