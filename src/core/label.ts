import { MAX_LABEL_SYMBOLS } from './constants';

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/** The symbols of `text` (an emoji built from several code points is one), without whitespace. */
export function symbolsOf(text: string): readonly string[] {
  return Array.from(segmenter.segment(text), ({ segment }) => segment).filter(
    (symbol) => symbol.trim() !== '',
  );
}

/** The first few symbols of `text`, joined with nothing between them. */
export function clampLabel(text: string): string {
  return symbolsOf(text).slice(0, MAX_LABEL_SYMBOLS).join('');
}

export function isValidLabel(value: unknown): value is string {
  return typeof value === 'string' && clampLabel(value) === value;
}
