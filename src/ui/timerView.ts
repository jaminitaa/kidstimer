import type { AppState } from '../app/state';
import { formatRemaining } from '../core/format';
import { symbolsOf } from '../core/label';
import { ringDash, ringFraction, type RingDirection } from '../core/ring';
import { stageFor } from '../core/stage';
import { remainingMs } from '../core/timer';
import { applyStage } from './theme';
import type { View } from './view';

const SVG_NS = 'http://www.w3.org/2000/svg';
const TIMES_UP_TEXT = "Time's up!";

// Ring geometry in SVG user units. The viewBox is scaled to the ring's diameter, so the
// stroke is 8% of it. styles/timer.css sizes the digits to fit inside the stroke's inner edge.
const VIEWBOX_SIZE = 100;
const RING_STROKE = 8;
const RING_CENTER = VIEWBOX_SIZE / 2;
const RING_RADIUS = (VIEWBOX_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
/** An SVG circle's path starts at 3 o'clock; turn it back a quarter so the arc starts at 12. */
const START_AT_TOP = `rotate(-90 ${RING_CENTER} ${RING_CENTER})`;

type Parts = {
  readonly root: HTMLElement;
  readonly arc: SVGCircleElement;
  readonly digits: HTMLElement;
  readonly label: HTMLElement;
  readonly timesUp: HTMLElement;
};

/** Writes only real changes, so a redraw every animation frame stays cheap. */
function setAttr(el: Element, name: string, value: string): void {
  if (el.getAttribute(name) !== value) el.setAttribute(name, value);
}

function setText(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

function element(tag: string, className: string, testId: string): HTMLElement {
  const el = document.createElement(tag);
  el.className = className;
  el.dataset.testid = testId;
  return el;
}

function circle(className: string, testId: string): SVGCircleElement {
  const el = document.createElementNS(SVG_NS, 'circle');
  el.setAttribute('class', className);
  el.setAttribute('data-testid', testId);
  el.setAttribute('cx', String(RING_CENTER));
  el.setAttribute('cy', String(RING_CENTER));
  el.setAttribute('r', String(RING_RADIUS));
  el.setAttribute('stroke-width', String(RING_STROKE));
  return el;
}

/** The faded full-circle track, with the solid arc drawn on top of it. */
function ring(): { readonly svg: SVGSVGElement; readonly arc: SVGCircleElement } {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'ring');
  svg.setAttribute('viewBox', `0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`);
  svg.setAttribute('aria-hidden', 'true');
  const arc = circle('ring-arc', 'ring-arc');
  arc.setAttribute('transform', START_AT_TOP);
  svg.append(circle('ring-track', 'ring-track'), arc);
  return { svg, arc };
}

function build(): Parts {
  const root = element('section', 'timer-screen', 'timer-screen');
  root.setAttribute('aria-label', 'Timer');
  const { svg, arc } = ring();
  const digits = element('div', 'digits', 'digits');
  digits.setAttribute('role', 'timer');
  const label = element('div', 'timer-label', 'timer-label');
  label.hidden = true;
  const timesUp = element('div', 'times-up', 'times-up');
  timesUp.textContent = TIMES_UP_TEXT;
  timesUp.hidden = true;
  // Hangs under the digits, so the readout's own box is just the digits and they stay centred.
  const below = document.createElement('div');
  below.className = 'readout-below';
  below.append(label, timesUp);
  const readout = document.createElement('div');
  readout.className = 'readout';
  readout.append(digits, below);
  const center = document.createElement('div');
  center.className = 'ring-center';
  center.append(readout);
  const box = document.createElement('div');
  box.className = 'ring-box';
  box.append(svg, center);
  root.append(box);
  return { root, arc, digits, label, timesUp };
}

function symbol(text: string): HTMLElement {
  const el = document.createElement('span');
  el.className = 'timer-label-symbol';
  el.textContent = text;
  return el;
}

/** One element per symbol, so the line can space them evenly. Rebuilt only when it changes. */
function drawLabel(el: HTMLElement, label: string): void {
  if (el.textContent !== label) el.replaceChildren(...symbolsOf(label).map(symbol));
  const empty = label === '';
  if (el.hidden !== empty) el.hidden = empty;
}

function drawArc(arc: SVGCircleElement, fraction: number, direction: RingDirection): void {
  const dash = ringDash(fraction, direction, RING_CIRCUMFERENCE);
  setAttr(arc, 'stroke-dasharray', dash.dasharray);
  setAttr(arc, 'stroke-dashoffset', String(dash.dashoffset));
  // A round line cap would still draw a dot for a zero-length arc.
  setAttr(arc, 'visibility', fraction > 0 ? 'visible' : 'hidden');
}

function render(parts: Parts, state: AppState, now: number): void {
  const { timer } = state;
  if (timer === null) return;
  const left = remainingMs(timer, now);
  const stage = stageFor(left);
  const text = formatRemaining(left);
  const direction = state.settings.ringDirection;
  setText(parts.digits, text);
  setAttr(parts.digits, 'data-len', String(text.length));
  if (parts.root.dataset.stage !== stage) applyStage(parts.root, stage);
  const finished = stage === 'done';
  if (parts.timesUp.hidden === finished) parts.timesUp.hidden = !finished;
  drawLabel(parts.label, state.label);
  drawArc(parts.arc, ringFraction(left, timer.totalMs, direction), direction);
}

/**
 * The running screen: a ring around big minutes:seconds digits, with the emoji line (if any)
 * under them. It has no controls.
 */
export function createTimerView(): View {
  const parts = build();
  return {
    el: parts.root,
    update: (state, now) => render(parts, state, now),
  };
}
