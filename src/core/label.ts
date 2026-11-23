import { MAX_LABEL_SYMBOLS } from './constants';

let segmenter: Intl.Segmenter | null | undefined;

/** Built on first use and reused; null in a browser that has no Intl.Segmenter. */
function graphemeSegmenter(): Intl.Segmenter | null {
  if (segmenter === undefined) {
    segmenter =
      typeof Intl.Segmenter === 'function'
        ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
        : null;
  }
  return segmenter;
}

function split(text: string): readonly string[] {
  const found = graphemeSegmenter();
  if (found === null) return Array.from(text);
  return Array.from(found.segment(text), ({ segment }) => segment);
}

/**
 * The symbols of `text` (an emoji built from several code points is one), without whitespace.
 * A browser too old to count emojis properly counts by character instead.
 */
export function symbolsOf(text: string): readonly string[] {
  return split(text).filter((symbol) => symbol.trim() !== '');
}

/** The first few symbols of `text`, joined with nothing between them. */
export function clampLabel(text: string): string {
  return symbolsOf(text).slice(0, MAX_LABEL_SYMBOLS).join('');
}

export function isValidLabel(value: unknown): value is string {
  return typeof value === 'string' && clampLabel(value) === value;
}
