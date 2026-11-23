import { afterEach, describe, expect, it, vi } from 'vitest';
import { clampLabel, isValidLabel, symbolsOf } from './label';

describe('symbolsOf', () => {
  it('splits emojis into whole symbols', () => {
    expect(symbolsOf('\u{1F6CF}\u{FE0F}\u{1F4A4}')).toEqual(['\u{1F6CF}\u{FE0F}', '\u{1F4A4}']);
  });
  it('keeps a family, a flag and a skin tone as one symbol each', () => {
    expect(symbolsOf('👨‍👩‍👧‍👦🇨🇦👍🏽')).toEqual(['👨‍👩‍👧‍👦', '🇨🇦', '👍🏽']);
  });
  it('leaves out spaces, tabs and line breaks', () => {
    expect(symbolsOf(' 👟 \t🚗\n')).toEqual(['👟', '🚗']);
  });
  it('gives nothing for an empty string', () => {
    expect(symbolsOf('')).toEqual([]);
  });
});

describe('clampLabel', () => {
  it.each([
    ['', ''],
    ['👟🚗', '👟🚗'],
    ['👟 🚗', '👟🚗'],
    ['📺🛏️💤👟🚗🛝', '📺🛏️💤👟'],
    ['👨‍👩‍👧‍👦👟🚗🛝📺', '👨‍👩‍👧‍👦👟🚗🛝'],
    ['bath!', 'bath'],
    ['<b>hi</b>', '<b>h'],
  ])('%j becomes %j', (input, expected) => {
    expect(clampLabel(input)).toBe(expected);
  });
  it('never cuts a symbol in half', () => {
    expect(symbolsOf(clampLabel('🇨🇦🇨🇦🇨🇦🇨🇦🇨🇦'))).toEqual(['🇨🇦', '🇨🇦', '🇨🇦', '🇨🇦']);
  });
});

describe('isValidLabel', () => {
  it.each(['', '👟🚗', '📺🛏️💤👟'])('accepts %j', (value) => {
    expect(isValidLabel(value)).toBe(true);
  });
  it.each([['📺🛏️💤👟🚗'], ['👟 🚗'], [42], [null], [undefined], [['👟']]])(
    'rejects %j',
    (value) => {
      expect(isValidLabel(value)).toBe(false);
    },
  );
});

describe('in a browser without Intl.Segmenter', () => {
  const original = Intl.Segmenter;
  const withoutSegmenter = () => {
    Object.defineProperty(Intl, 'Segmenter', { value: undefined, configurable: true });
    vi.resetModules();
    return import('./label');
  };
  afterEach(() => {
    Object.defineProperty(Intl, 'Segmenter', { value: original, configurable: true });
    vi.resetModules();
  });

  it('can still be imported', async () => {
    await expect(withoutSegmenter()).resolves.toBeDefined();
  });
  it('splits by character and leaves out whitespace', async () => {
    const label = await withoutSegmenter();
    expect(label.symbolsOf('👟 🚗')).toEqual(['👟', '🚗']);
  });
  it('still keeps the first 4 symbols', async () => {
    const label = await withoutSegmenter();
    expect(label.clampLabel('abcdef')).toBe('abcd');
  });
});
