import { afterEach, describe, expect, it, vi } from 'vitest';
import { MARK_MINUTES } from '../core/constants';
import { createSound, dingNotes, TUNE_NOTES, type Note } from './sound';

const LONGEST_DING_S = 1.5;
const TUNE_MIN_S = 2;
const TUNE_MAX_S = 5;
const LOWEST_HZ = 300;
const HIGHEST_HZ = 1600;
const LOUDEST_GAIN = 0.35;
const UNKNOWN_MINUTES = 7;

const lengthOf = (notes: readonly Note[]): number =>
  Math.max(...notes.map((n) => n.at + n.duration)) - Math.min(...notes.map((n) => n.at));

type Param = {
  value: number;
  setValueAtTime: ReturnType<typeof vi.fn>;
  linearRampToValueAtTime: ReturnType<typeof vi.fn>;
  exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
};

const param = (): Param => ({
  value: 1,
  setValueAtTime: vi.fn(),
  linearRampToValueAtTime: vi.fn(),
  exponentialRampToValueAtTime: vi.fn(),
});

/** Every value an AudioParam was given, directly or through a scheduled change. */
const valuesOf = (p: Param): number[] => [
  p.value,
  ...[p.setValueAtTime, p.linearRampToValueAtTime, p.exponentialRampToValueAtTime].flatMap(
    (fn) => fn.mock.calls.map((call) => call[0] as number),
  ),
];

type FakeOscillator = {
  type: string;
  frequency: Param;
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
};

/** An AudioContext stand-in: starts suspended, resume() makes it run, nodes are spies. */
function fakeAudio(currentTime = 0) {
  const oscillators: FakeOscillator[] = [];
  const gains: { gain: Param }[] = [];
  const ctx = {
    state: 'suspended' as AudioContextState,
    currentTime,
    destination: {},
    resume: vi.fn(async () => {
      ctx.state = 'running';
    }),
    createOscillator: vi.fn((): FakeOscillator => {
      const osc = { type: 'sine', frequency: param(), connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
      oscillators.push(osc);
      return osc;
    }),
    createGain: vi.fn(() => {
      const gain = { gain: param(), connect: vi.fn() };
      gains.push(gain);
      return gain;
    }),
  };
  const makeContext = vi.fn(() => ctx as unknown as AudioContext);
  const started = () => oscillators.filter((o) => o.start.mock.calls.length === 1);
  return { ctx, oscillators, gains, makeContext, started };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('dingNotes', () => {
  it('rings more times as the end nears', () => {
    expect(dingNotes(15)).toHaveLength(1);
    expect(dingNotes(10)).toHaveLength(1);
    expect(dingNotes(5)).toHaveLength(2);
    expect(dingNotes(3)).toHaveLength(2);
    expect(dingNotes(1)).toHaveLength(3);
  });

  it('rings once for a value that is not a mark', () => {
    expect(dingNotes(UNKNOWN_MINUTES)).toHaveLength(1);
    expect(dingNotes(0)).toHaveLength(1);
    expect(dingNotes(Number.NaN)).toHaveLength(1);
  });

  it('keeps every ding under 1.5 seconds, with strikes in order', () => {
    for (const minutes of MARK_MINUTES) {
      const notes = dingNotes(minutes);
      expect(lengthOf(notes)).toBeLessThan(LONGEST_DING_S);
      const starts = notes.map((n) => n.at);
      expect(starts).toEqual([...starts].sort((a, b) => a - b));
    }
  });
});

describe('TUNE_NOTES', () => {
  it('has at least 4 notes, rises overall and lasts 2 to 5 seconds', () => {
    expect(TUNE_NOTES.length).toBeGreaterThanOrEqual(4);
    const first = TUNE_NOTES[0];
    const last = TUNE_NOTES[TUNE_NOTES.length - 1];
    expect(last?.freq).toBeGreaterThan(first?.freq ?? Infinity);
    expect(last?.freq).toBe(Math.max(...TUNE_NOTES.map((n) => n.freq)));
    expect(lengthOf(TUNE_NOTES)).toBeGreaterThanOrEqual(TUNE_MIN_S);
    expect(lengthOf(TUNE_NOTES)).toBeLessThanOrEqual(TUNE_MAX_S);
  });
});

describe('note pitches', () => {
  it('stay between 300 and 1600 Hz so nothing is shrill or muddy', () => {
    const all = [...TUNE_NOTES, ...MARK_MINUTES.flatMap((m) => dingNotes(m))];
    for (const note of all) {
      expect(note.freq).toBeGreaterThanOrEqual(LOWEST_HZ);
      expect(note.freq).toBeLessThanOrEqual(HIGHEST_HZ);
      expect(note.duration).toBeGreaterThan(0);
    }
  });
});

describe('createSound', () => {
  it('is locked until unlock() and unlocked after', async () => {
    const audio = fakeAudio();
    const sound = createSound(audio.makeContext);
    expect(sound.isUnlocked()).toBe(false);
    await sound.unlock();
    expect(audio.ctx.resume).toHaveBeenCalledTimes(1);
    expect(sound.isUnlocked()).toBe(true);
  });

  it('creates the audio context only once, on the first unlock', async () => {
    const audio = fakeAudio();
    const sound = createSound(audio.makeContext);
    expect(audio.makeContext).not.toHaveBeenCalled();
    await sound.unlock();
    await sound.unlock();
    expect(audio.makeContext).toHaveBeenCalledTimes(1);
    expect(audio.ctx.resume).toHaveBeenCalledTimes(1);
  });

  it('plays nothing before unlock, without throwing', () => {
    const audio = fakeAudio();
    const sound = createSound(audio.makeContext);
    expect(() => sound.play({ kind: 'ding', minutes: 5 })).not.toThrow();
    expect(() => sound.play({ kind: 'tune' })).not.toThrow();
    expect(audio.oscillators).toHaveLength(0);
  });

  it('starts one oscillator per note', async () => {
    const audio = fakeAudio();
    const sound = createSound(audio.makeContext);
    await sound.unlock();
    sound.play({ kind: 'ding', minutes: 5 });
    expect(audio.started()).toHaveLength(2);
    sound.play({ kind: 'tune' });
    expect(audio.started()).toHaveLength(2 + TUNE_NOTES.length);
  });

  it('schedules each note from the current audio time at its own pitch', async () => {
    const audio = fakeAudio(42);
    const sound = createSound(audio.makeContext);
    await sound.unlock();
    sound.play({ kind: 'tune' });
    const starts = audio.oscillators.map((o) => o.start.mock.calls[0]?.[0] as number);
    const stops = audio.oscillators.map((o) => o.stop.mock.calls[0]?.[0] as number);
    TUNE_NOTES.forEach((note, i) => {
      expect(audio.oscillators[i]?.frequency.setValueAtTime).toHaveBeenCalledWith(
        note.freq,
        starts[i],
      );
      expect(starts[i]! - starts[0]!).toBeCloseTo(note.at - TUNE_NOTES[0]!.at);
      expect(stops[i]! - starts[i]!).toBeCloseTo(note.duration);
    });
    expect(starts[0]).toBeGreaterThanOrEqual(42);
  });

  it('never sets a gain louder than 0.35', async () => {
    const audio = fakeAudio();
    const sound = createSound(audio.makeContext);
    await sound.unlock();
    for (const minutes of MARK_MINUTES) sound.play({ kind: 'ding', minutes });
    sound.play({ kind: 'tune' });
    const values = audio.gains.flatMap((g) => valuesOf(g.gain));
    expect(Math.max(...values)).toBeLessThanOrEqual(LOUDEST_GAIN);
    expect(Math.max(...values)).toBeGreaterThan(0);
  });

  it('plays nothing while the device has paused the audio', async () => {
    const audio = fakeAudio();
    const sound = createSound(audio.makeContext);
    await sound.unlock();
    audio.ctx.state = 'interrupted';
    expect(sound.isUnlocked()).toBe(false);
    sound.play({ kind: 'tune' });
    expect(audio.oscillators).toHaveLength(0);
  });

  it('warns and does not throw when a sound cannot be played', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const audio = fakeAudio();
    const sound = createSound(audio.makeContext);
    await sound.unlock();
    audio.ctx.createOscillator.mockImplementationOnce(() => {
      throw new Error('audio device lost');
    });
    expect(() => sound.play({ kind: 'ding', minutes: 15 })).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('stays locked and warns once when the audio context cannot be made', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sound = createSound(() => {
      throw new Error('no audio here');
    });
    await expect(sound.unlock()).resolves.toBeUndefined();
    expect(sound.isUnlocked()).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('stays locked and warns once when resume is refused', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const audio = fakeAudio();
    audio.ctx.resume.mockRejectedValueOnce(new Error('NotAllowedError'));
    const sound = createSound(audio.makeContext);
    await expect(sound.unlock()).resolves.toBeUndefined();
    expect(sound.isUnlocked()).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    await sound.unlock();
    expect(sound.isUnlocked()).toBe(true);
  });

  it('asks Safari to treat the sound as playback so the silent switch does not mute it', async () => {
    const audioSession = { type: 'auto' };
    vi.stubGlobal('navigator', { audioSession });
    const sound = createSound(fakeAudio().makeContext);
    expect(audioSession.type).toBe('auto');
    await sound.unlock();
    expect(audioSession.type).toBe('playback');
  });

  it('unlocks normally where there is no audio session', async () => {
    for (const nav of [{}, undefined]) {
      vi.stubGlobal('navigator', nav);
      const sound = createSound(fakeAudio().makeContext);
      await sound.unlock();
      expect(sound.isUnlocked()).toBe(true);
    }
  });
});
