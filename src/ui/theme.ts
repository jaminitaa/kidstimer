import type { Stage } from '../core/stage';

export type StageColors = {
  readonly bg: string;
  readonly ring: string;
  readonly track: string;
  readonly digits: string;
};

/**
 * Bright backgrounds with near-black digits: sky blue, sunny orange, coral, party purple.
 * The ring is a deep shade of the stage color and the used-up part (track) a pale one.
 * theme.test.ts enforces the contrast minimums (digits 7, ring 3, ring vs track 2).
 */
export const STAGE_COLORS: Readonly<Record<Stage, StageColors>> = {
  calm: { bg: '#6cc4fb', ring: '#1e40af', track: '#d6efff', digits: '#0a1a36' },
  warm: { bg: '#ffb23f', ring: '#a33600', track: '#ffe8c4', digits: '#2e1500' },
  hot: { bg: '#ff8a7a', ring: '#a3122a', track: '#ffd9d3', digits: '#2a0608' },
  done: { bg: '#c39bff', ring: '#5b1cc4', track: '#f0e6ff', digits: '#1d0842' },
};

// WCAG 2 relative luminance (https://www.w3.org/TR/WCAG21/#dfn-relative-luminance).
const HEX_COLOR = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const CHANNEL_MAX = 255;
const LINEAR_LIMIT = 0.03928;
const LINEAR_SLOPE = 12.92;
const GAMMA_OFFSET = 0.055;
const GAMMA = 2.4;
const WEIGHT_R = 0.2126;
const WEIGHT_G = 0.7152;
const WEIGHT_B = 0.0722;
const FLARE = 0.05;

function linear(channelHex: string): number {
  const c = Number.parseInt(channelHex, 16) / CHANNEL_MAX;
  return c <= LINEAR_LIMIT ? c / LINEAR_SLOPE : ((c + GAMMA_OFFSET) / (1 + GAMMA_OFFSET)) ** GAMMA;
}

function luminance(hex: string): number {
  const match = HEX_COLOR.exec(hex);
  if (match === null) {
    throw new Error(`Expected a 6-digit hex color like #1a2b3c, got "${hex}"`);
  }
  const [, r = '', g = '', b = ''] = match;
  return WEIGHT_R * linear(r) + WEIGHT_G * linear(g) + WEIGHT_B * linear(b);
}

/** WCAG 2 contrast ratio between two 6-digit hex colors, from 1 to 21. Order does not matter. */
export function contrastRatio(hexA: string, hexB: string): number {
  const a = luminance(hexA);
  const b = luminance(hexB);
  return (Math.max(a, b) + FLARE) / (Math.min(a, b) + FLARE);
}

/** Marks `el` with the stage and sets the --stage-* color variables the stylesheets read. */
export function applyStage(el: HTMLElement, stage: Stage): void {
  const { bg, ring, track, digits } = STAGE_COLORS[stage];
  el.dataset.stage = stage;
  el.style.setProperty('--stage-bg', bg);
  el.style.setProperty('--stage-ring', ring);
  el.style.setProperty('--stage-track', track);
  el.style.setProperty('--stage-digits', digits);
}
