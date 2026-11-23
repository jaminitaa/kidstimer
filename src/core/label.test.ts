import { describe, expect, it } from 'vitest';
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
