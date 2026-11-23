// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { Stage } from '../core/stage';
import { applyStage, contrastRatio, STAGE_COLORS } from './theme';

const STAGES: readonly Stage[] = ['calm', 'warm', 'hot', 'done'];

const channels = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 0xff, b: n & 0xff };
};

describe('contrastRatio', () => {
  it('follows the WCAG 2 formula', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
    expect(contrastRatio('#767676', '#FFFFFF')).toBeCloseTo(4.54, 2);
  });

  it('gives the same ratio whichever color comes first', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(contrastRatio('#000000', '#ffffff'), 10);
  });

  it('rejects anything but a 6-digit hex color', () => {
    for (const bad of ['#fff', 'red', '#12345g', '123456', '#1234567']) {
      expect(() => contrastRatio(bad, '#000000')).toThrow(/6-digit hex/);
    }
  });
});

describe('STAGE_COLORS', () => {
  it('uses 6-digit hex strings', () => {
    for (const stage of STAGES) {
      for (const color of Object.values(STAGE_COLORS[stage])) {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it('keeps digits, ring and track readable in every stage', () => {
    for (const stage of STAGES) {
      const c = STAGE_COLORS[stage];
      expect(contrastRatio(c.digits, c.bg)).toBeGreaterThanOrEqual(7); // digits read across a room
      expect(contrastRatio(c.ring, c.bg)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(c.ring, c.track)).toBeGreaterThanOrEqual(2); // time left vs time gone
    }
  });

  it('has four distinct backgrounds', () => {
    expect(new Set(Object.values(STAGE_COLORS).map((c) => c.bg)).size).toBe(4);
  });

  it('starts cool and turns warm as the end nears', () => {
    const calm = channels(STAGE_COLORS.calm.bg);
    expect(calm.b).toBeGreaterThan(calm.r);
    for (const stage of ['warm', 'hot'] as const) {
      const warm = channels(STAGE_COLORS[stage].bg);
      expect(warm.r).toBeGreaterThan(warm.b);
    }
  });
});

describe('applyStage', () => {
  it('sets data-stage and the stage color variables', () => {
    const el = document.createElement('div');
    applyStage(el, 'hot');
    expect(el.dataset.stage).toBe('hot');
    expect(el.style.getPropertyValue('--stage-bg')).toBe(STAGE_COLORS.hot.bg);
    expect(el.style.getPropertyValue('--stage-ring')).toBe(STAGE_COLORS.hot.ring);
    expect(el.style.getPropertyValue('--stage-track')).toBe(STAGE_COLORS.hot.track);
    expect(el.style.getPropertyValue('--stage-digits')).toBe(STAGE_COLORS.hot.digits);
  });

  it('replaces the previous stage', () => {
    const el = document.createElement('div');
    applyStage(el, 'calm');
    applyStage(el, 'done');
    expect(el.dataset.stage).toBe('done');
    expect(el.style.getPropertyValue('--stage-bg')).toBe(STAGE_COLORS.done.bg);
  });
});
