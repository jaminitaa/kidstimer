import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_TIMER_MS, STORAGE_KEY } from '../core/constants';
import { startTimer, type Timer } from '../core/timer';
import { createStorage, parsePersisted, serializeState } from './storage';
import { DEFAULT_PERSISTED, initialState, type AppState } from './state';

const settings = { ringDirection: 'fills', passcode: '2580' } as const;
const running: Timer = { status: 'running', totalMs: 600_000, endsAt: 1_600_000 };
const paused: Timer = { status: 'paused', totalMs: 600_000, remainingMs: 120_000 };
const raw = (value: unknown): string => JSON.stringify(value);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('parsePersisted', () => {
  it('falls back to defaults for bad input', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(parsePersisted(null)).toEqual(DEFAULT_PERSISTED);
    expect(parsePersisted('not json')).toEqual(DEFAULT_PERSISTED);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(parsePersisted('[]')).toEqual(DEFAULT_PERSISTED);
    expect(parsePersisted('null')).toEqual(DEFAULT_PERSISTED);
    expect(parsePersisted('42')).toEqual(DEFAULT_PERSISTED);
  });

  it('judges settings and timer separately', () => {
    const badTimer = { status: 'running', totalMs: 600000, endsAt: null };
    expect(parsePersisted(raw({ settings, timer: badTimer }))).toEqual({ settings, timer: null });
    const badSettings = { ringDirection: 'sideways', passcode: '25' };
    expect(parsePersisted(raw({ settings: badSettings, timer: null }))).toEqual(DEFAULT_PERSISTED);
    expect(parsePersisted(raw({ settings: badSettings, timer: running }))).toEqual({
      settings: DEFAULT_PERSISTED.settings,
      timer: running,
    });
  });

  it('accepts a null passcode', () => {
    const noCode = { ringDirection: 'empties', passcode: null };
    expect(parsePersisted(raw({ settings: noCode, timer: null })).settings).toEqual(noCode);
  });

  it('rejects passcodes that are not four digits', () => {
    for (const passcode of ['258', '25800', 'abcd', 2580]) {
      const result = parsePersisted(raw({ settings: { ringDirection: 'fills', passcode }, timer: null }));
      expect(result).toEqual(DEFAULT_PERSISTED);
    }
  });

  it('rejects bad timers', () => {
    const bad: unknown[] = [
      { ...running, totalMs: 0 },
      { ...running, totalMs: -1 },
      { ...running, totalMs: MAX_TIMER_MS + 1 },
      { ...running, totalMs: 'x' },
      { ...running, endsAt: 'soon' },
      { ...running, endsAt: null },
      { ...paused, remainingMs: -1 },
      { ...paused, remainingMs: 600_001 },
      { ...paused, remainingMs: null },
      { status: 'idle', totalMs: 600_000 },
      'running',
      null,
    ];
    for (const timer of bad) {
      expect(parsePersisted(raw({ settings, timer })).timer).toBeNull();
    }
  });

  it('keeps a timer with the maximum length and a zero remainder', () => {
    const edge: Timer = { status: 'paused', totalMs: MAX_TIMER_MS, remainingMs: 0 };
    expect(parsePersisted(raw({ settings, timer: edge })).timer).toEqual(edge);
  });
});

describe('serializeState', () => {
  const base = initialState({ settings, timer: null });

  it('round-trips a running and a paused timer', () => {
    for (const timer of [running, paused]) {
      const state: AppState = { ...base, timer };
      expect(parsePersisted(serializeState(state))).toEqual({ settings, timer });
    }
  });

  it('saves settings and timer only', () => {
    const state: AppState = {
      ...base,
      timer: startTimer(600_000, 1),
      overlay: 'keypad',
      entry: '12',
    };
    const text = serializeState(state);
    expect(Object.keys(JSON.parse(text)).sort()).toEqual(['settings', 'timer']);
    for (const word of ['entry', 'lock', 'overlay']) {
      expect(text).not.toContain(word);
    }
  });
});

describe('createStorage', () => {
  it('loads what it saved under the storage key', () => {
    const data = new Map<string, string>();
    const storage = createStorage({
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => void data.set(key, value),
    });
    const state: AppState = { ...initialState({ settings, timer: null }), timer: paused };
    storage.save(state);
    expect(data.has(STORAGE_KEY)).toBe(true);
    expect(storage.load()).toEqual({ settings, timer: paused });
  });

  it('returns defaults and warns once when reading throws', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const storage = createStorage({
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => undefined,
    });
    expect(storage.load()).toEqual(DEFAULT_PERSISTED);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('does not throw and warns when writing throws', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const storage = createStorage({
      getItem: () => null,
      setItem: () => {
        throw new Error('full');
      },
    });
    expect(() => storage.save(initialState(DEFAULT_PERSISTED))).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
