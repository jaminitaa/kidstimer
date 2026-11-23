import { MARK_MINUTES, MS_PER_MINUTE } from '../core/constants';
import { stageFor, type Stage } from '../core/stage';
import type { SoundEffect } from '../core/tick';

/** One tone: pitch in Hz; start (from the first note) and length in seconds. */
export type Note = { readonly freq: number; readonly at: number; readonly duration: number };

export type Sound = {
  /** Call from a tap or key press: browsers only allow sound to start inside one. */
  unlock(): Promise<void>;
  isUnlocked(): boolean;
  play(effect: SoundEffect): void;
};

// Pitches in Hz (equal temperament, A4 = 440).
const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const A5 = 880;
const C6 = 1046.5;

/** A ding is one bell pitch, struck more often as the color stage gets hotter. */
const DING_PITCH = A5;
const DING_RING_S = 0.9;
const DING_GAP_S = 0.25;
const STRIKES_BY_STAGE: Readonly<Record<Stage, number>> = { calm: 1, warm: 2, hot: 3, done: 1 };

/** The end: a quick climb up a major chord, a skip back, then a long high note. */
export const TUNE_NOTES: readonly Note[] = [
  { freq: C5, at: 0, duration: 0.3 },
  { freq: E5, at: 0.2, duration: 0.3 },
  { freq: G5, at: 0.4, duration: 0.3 },
  { freq: C6, at: 0.6, duration: 0.45 },
  { freq: G5, at: 1.0, duration: 0.25 },
  { freq: C6, at: 1.25, duration: 1.25 },
];

type Voice = { readonly wave: OscillatorType; readonly peakGain: number };

/** Dings are pure bell tones; the tune is a brighter music-box sound, so the two never blur. */
const VOICES: Readonly<Record<SoundEffect['kind'], Voice>> = {
  ding: { wave: 'sine', peakGain: 0.3 },
  tune: { wave: 'triangle', peakGain: 0.22 },
};
const ATTACK_S = 0.01;
/** Exponential fades cannot reach zero, so they end here (inaudible). */
const SILENT_GAIN = 0.0001;
/** Scheduling a little ahead keeps the first note's attack from being clipped. */
const LEAD_S = 0.03;

/** 1 strike at 15 and 10 minutes, 2 at 5 and 3, 3 at 1. Anything else gets 1. */
export function dingNotes(minutes: number): readonly Note[] {
  const isMark = (MARK_MINUTES as readonly number[]).includes(minutes);
  const strikes = isMark ? STRIKES_BY_STAGE[stageFor(minutes * MS_PER_MINUTE)] : 1;
  return Array.from({ length: strikes }, (_, i) => ({
    freq: DING_PITCH,
    at: i * DING_GAP_S,
    duration: DING_RING_S,
  }));
}

/** One note: a quick rise to its peak, then a bell-like exponential fade. */
function strike(ctx: AudioContext, note: Note, start: number, voice: Voice): void {
  const begin = start + note.at;
  const end = begin + note.duration;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = voice.wave;
  osc.frequency.setValueAtTime(note.freq, begin);
  gain.gain.value = 0;
  gain.gain.setValueAtTime(SILENT_GAIN, begin);
  gain.gain.linearRampToValueAtTime(voice.peakGain, begin + ATTACK_S);
  gain.gain.exponentialRampToValueAtTime(SILENT_GAIN, end);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(begin);
  osc.stop(end);
}

/** Safari's Audio Session API, which TypeScript's DOM types do not include yet. */
type AudioSessionNavigator = Navigator & { readonly audioSession?: { type: string } };

/** Lets the iPhone play the dings with the silent switch on, where Safari supports it. */
function preferPlaybackSession(): void {
  if (typeof navigator === 'undefined') return;
  const session = (navigator as AudioSessionNavigator).audioSession;
  if (session !== undefined) session.type = 'playback';
}

/**
 * Dings and the end tune, made in the browser (no sound files). Silent until unlock()
 * has run inside a tap or key press, and while the device has paused the audio.
 */
export function createSound(makeContext: () => AudioContext): Sound {
  let ctx: AudioContext | null = null;
  const isUnlocked = (): boolean => ctx !== null && ctx.state === 'running';

  return {
    isUnlocked,
    async unlock() {
      if (isUnlocked()) return;
      try {
        preferPlaybackSession();
        ctx ??= makeContext();
        await ctx.resume();
      } catch (error) {
        console.warn('Sound could not be turned on; the next tap will try again.', error);
      }
    },
    play(effect) {
      if (ctx === null || !isUnlocked()) return;
      const notes = effect.kind === 'tune' ? TUNE_NOTES : dingNotes(effect.minutes);
      const start = ctx.currentTime + LEAD_S;
      try {
        for (const note of notes) strike(ctx, note, start, VOICES[effect.kind]);
      } catch (error) {
        console.warn(`Could not play the ${effect.kind}.`, error);
      }
    },
  };
}
