import { expect, type Page } from '@playwright/test';

/** Shared by the layout specs: screen sizes, and where things sit on the timer screen. */

export type Size = { readonly width: number; readonly height: number };
export type Box = {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
};
export type Point = { readonly x: number; readonly y: number };
export type Geometry = {
  readonly viewport: Size;
  readonly page: Size;
  readonly ring: Box;
  readonly center: Point;
  readonly innerRadius: number;
  readonly digits: Box;
  /** The emoji line under the digits, or null when it is not showing. */
  readonly label: Box | null;
  /** "Time's up!", or null when it is not showing. */
  readonly timesUp: Box | null;
  readonly panel: Box | null;
};

export const PHONE_PORTRAIT: Size = { width: 393, height: 852 };
export const PHONE_LANDSCAPE: Size = { width: 852, height: 393 };
export const TABLET: Size = { width: 1180, height: 820 };
export const TV: Size = { width: 1920, height: 1080 };
export const LAPTOP: Size = { width: 1280, height: 800 };

/** Allowance for sub-pixel rounding in layout. */
export const EPSILON = 0.5;

export const sizeName = ({ width, height }: Size): string => `${width}x${height}`;

/**
 * Reads where the ring, the digits, the emoji line and "Time's up!" (when showing) and the
 * open lock panel (if any) are on screen.
 */
export function measure(page: Page, panelTestId: string | null): Promise<Geometry> {
  return page.evaluate((panelId) => {
    const find = (selector: string): Element => {
      const el = document.querySelector(selector);
      if (el === null) throw new Error(`Nothing matches ${selector}.`);
      return el;
    };
    const boxOf = (el: Element) => {
      const { left, top, right, bottom } = el.getBoundingClientRect();
      return { left, top, right, bottom };
    };
    const boxIfShowing = (testId: string) => {
      const el = find(`[data-testid="${testId}"]`);
      return el.getClientRects().length === 0 ? null : boxOf(el);
    };
    const track = find('[data-testid="ring-track"]') as SVGCircleElement;
    const svg = track.ownerSVGElement;
    if (svg === null) throw new Error('The ring track is not inside an <svg>.');
    const ring = svg.getBoundingClientRect();
    const unitsToPx = ring.width / svg.viewBox.baseVal.width;
    const strokeInnerEdge = track.r.baseVal.value - Number(track.getAttribute('stroke-width')) / 2;
    const doc = document.documentElement;
    return {
      viewport: { width: doc.clientWidth, height: doc.clientHeight },
      page: { width: doc.scrollWidth, height: doc.scrollHeight },
      ring: boxOf(svg),
      center: { x: ring.left + ring.width / 2, y: ring.top + ring.height / 2 },
      innerRadius: strokeInnerEdge * unitsToPx,
      digits: boxOf(find('[data-testid="digits"]')),
      label: boxIfShowing('timer-label'),
      timesUp: boxIfShowing('times-up'),
      panel: panelId === null ? null : boxOf(find(`[data-testid="${panelId}"]`)),
    };
  }, panelTestId);
}

export function expectNoScroll(g: Geometry): void {
  expect(g.page.width, 'page is wider than the screen').toBeLessThanOrEqual(g.viewport.width);
  expect(g.page.height, 'page is taller than the screen').toBeLessThanOrEqual(g.viewport.height);
}

export function expectInViewport(box: Box, viewport: Size, what: string): void {
  expect(box.left, `${what}: left edge off screen`).toBeGreaterThanOrEqual(-EPSILON);
  expect(box.top, `${what}: top edge off screen`).toBeGreaterThanOrEqual(-EPSILON);
  expect(box.right, `${what}: right edge off screen`).toBeLessThanOrEqual(viewport.width + EPSILON);
  expect(box.bottom, `${what}: bottom edge off screen`).toBeLessThanOrEqual(
    viewport.height + EPSILON,
  );
}

/** Every corner of `box` lies within the inner edge of the ring's stroke. */
export function expectBoxInsideRing(box: Box, g: Geometry, what: string): void {
  const corners: readonly Point[] = [
    { x: box.left, y: box.top },
    { x: box.right, y: box.top },
    { x: box.left, y: box.bottom },
    { x: box.right, y: box.bottom },
  ];
  for (const corner of corners) {
    const distance = Math.hypot(corner.x - g.center.x, corner.y - g.center.y);
    expect(distance, `a corner of the ${what} crosses the ring`).toBeLessThanOrEqual(
      g.innerRadius + EPSILON,
    );
  }
}

export function overlaps(a: Box, b: Box): boolean {
  const apart =
    a.right <= b.left + EPSILON ||
    b.right <= a.left + EPSILON ||
    a.bottom <= b.top + EPSILON ||
    b.bottom <= a.top + EPSILON;
  return !apart;
}
