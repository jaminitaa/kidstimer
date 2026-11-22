# Kids Timer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A kid-proof countdown timer web app (minutes:seconds, progress ring, dings, color stages, passcode lock) that runs offline on an iPhone, an iPad and a MacBook mirrored to a TV.

**Architecture:** All timer rules are pure functions that take the clock as an argument (`src/core`). One immutable `AppState` changes only through a reducer (`src/app`). Views are plain DOM modules that read state and dispatch actions (`src/ui`). Sound, screen wake and the tick loop are thin adapters (`src/platform`), wired together in `src/main.ts`.

**Tech Stack:** TypeScript 7, Vite 8, no UI framework, Vitest 5 (+ jsdom, v8 coverage), Playwright 1.65, vite-plugin-pwa 2. Node 22 and npm 10 are installed. ngrok is NOT installed on this machine.

**Spec:** `docs/superpowers/specs/2026-11-22-kids-timer-design.md`. Read it before starting any task. Where this plan and the spec disagree, the spec wins; say so in your report.

## Global Constraints

- Time is shown as minutes:seconds only. Hours are never shown, anywhere.
- Spoken reminders are out of scope. Do not build them.
- Spec values, verbatim: dings at 15, 10, 5, 3, 1 minutes left; presets 5, 10, 15, 30 minutes; custom 1 to 1440 whole minutes; longest timer 24 hours; warm stage at 5 minutes or less, hot at 1 minute or less; passcode 4 digits; hold 2 seconds to open the keypad; 3 wrong codes then a 30-second wait; keypad and controls close after 10 seconds untouched; add-time buttons +1 and +5 minutes.
- Every such value lives in `src/core/constants.ts`. No magic numbers elsewhere.
- No data leaves the device. No network calls at runtime. No analytics. No web fonts or remote assets.
- No secrets in the repo. The ngrok domain is read from `.env.local` (git-ignored).
- Immutable data: never mutate a state object or array; return new ones. Mark type fields `readonly`.
- Files under 400 lines, functions under 50 lines, nesting 4 levels at most.
- Errors are never swallowed silently: handle, and `console.warn` with context when recovering.
- Tests first (red, then green). Unit tests sit next to the code as `*.test.ts`. DOM tests start with `// @vitest-environment jsdom`.
- Coverage gate: 80% lines, branches, functions and statements over `src/**` (excluding `src/main.ts`).
- Kid-proofing is the product: while a timer exists, nothing changes it except through the passcode. Never add a visible control to the timer screen.
- No flashing or strobing. Stage changes are smooth transitions. Respect `prefers-reduced-motion`.
- Target browsers: Safari on iPhone and iPad (including the home-screen copy), Safari and Chrome on macOS. Everything must work with touch, with a trackpad click, and with the keyboard.
- Commits: `<type>: <description>` (feat, fix, refactor, docs, test, chore). No attribution or co-author lines.
- The owner is not available during the build. When you make a judgment call this plan does not pin, append one entry to `docs/decisions-log.md` (context, what you chose, why) and carry on.
- Library versions above may be newer than you remember. If a tool behaves unexpectedly, read its current docs before guessing.

## Review Focus

Conditions the spec implies but does not spell out, most likely first. Each is pinned by a test in the task named.

1. **Saved data is corrupt or from another shape** (bad JSON, missing fields, `NaN` end time): the app opens cleanly, keeps whatever part is valid, never shows a blank page. Task 4.
2. **The device slept or the tab was hidden across a ding or the end:** correct time and color on return, no sound replayed, remaining time never negative. Tasks 2 and 8.
3. **Storage throws** (private browsing, quota): the app still works for the session and warns in the console. Task 4.
4. **Fast or sloppy fingers on the lock:** more than 4 digits typed quickly, digits while locked out, a hold released early, a hold that drifts. Tasks 3, 4 and 7.
5. **Odd text in the custom-minutes box:** spaces, `1e2`, `1.5`, `-3`, `+5`, full-width digits, leading zeros. Task 3.

---

### Task 1: Project scaffold and the time format

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts` (placeholder that renders nothing yet), `src/core/constants.ts`, `src/core/format.ts`
- Modify: `.gitignore` (add `/dist`, `/test-results`, `/playwright-report`, `/blob-report`)
- Test: `src/core/format.test.ts`

**Interfaces:**
- Produces: `formatRemaining(remainingMs: number): string`; every constant listed below; npm scripts `dev`, `build`, `preview`, `typecheck`, `test`, `test:coverage`.

- [ ] **Step 1: Scaffold.** `npm init -y`, then install dev dependencies: `vite`, `typescript`, `vitest`, `@vitest/coverage-v8`, `jsdom`. Strict TypeScript (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`). Vitest coverage config: provider v8, include `src/**/*.ts`, exclude `src/main.ts` and `**/*.test.ts`, thresholds 80 for all four measures. `index.html` has `<div id="app"></div>`, `lang="en"`, viewport meta with `viewport-fit=cover`, and title "Kids Timer".

- [ ] **Step 2: Write `src/core/constants.ts`** with exactly these exports:

```ts
export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60_000;
export const MARK_MINUTES = [15, 10, 5, 3, 1] as const;
export const PRESET_MINUTES = [5, 10, 15, 30] as const;
export const ADD_TIME_MINUTES = [1, 5] as const;
export const MIN_TIMER_MINUTES = 1;
export const MAX_TIMER_MINUTES = 1440;
export const MAX_TIMER_MS = MAX_TIMER_MINUTES * MS_PER_MINUTE;
export const WARM_AT_MS = 5 * MS_PER_MINUTE;
export const HOT_AT_MS = 1 * MS_PER_MINUTE;
export const PASSCODE_LENGTH = 4;
export const HOLD_MS = 2000;
export const MAX_WRONG_CODES = 3;
export const LOCKOUT_MS = 30_000;
export const OVERLAY_IDLE_MS = 10_000;
export const TICK_MS = 250;
export const STALE_TICK_MS = 2000;
export const STORAGE_KEY = 'kidstimer.v1';
export const PREVIEW_PORT = 4173;
```

- [ ] **Step 3: Write the failing test** `src/core/format.test.ts`:

```ts
it.each([
  [900_000, '15:00'], [899_001, '15:00'], [899_000, '14:59'],
  [300_000, '05:00'], [1, '00:01'], [0, '00:00'], [-5, '00:00'],
  [Number.NaN, '00:00'], [28_800_000, '480:00'], [86_400_000, '1440:00'],
])('formatRemaining(%d) is %s', (ms, text) => {
  expect(formatRemaining(ms)).toBe(text);
});
```

- [ ] **Step 4:** Run `npx vitest run src/core/format.test.ts`. Expected: FAIL, `formatRemaining` not found.
- [ ] **Step 5: Implement `formatRemaining`.** Round up to the whole second, minutes padded to at least 2 digits, seconds always 2 digits.
- [ ] **Step 6:** Run `npm test` and `npm run typecheck` and `npm run build`. Expected: all pass.
- [ ] **Step 7: Commit** `chore: scaffold project and add time format`.

---

### Task 2: Core timer rules

**Files:**
- Create: `src/core/timer.ts`, `src/core/marks.ts`, `src/core/stage.ts`, `src/core/ring.ts`, `src/core/tick.ts`
- Test: one `*.test.ts` beside each

**Interfaces:**
- Consumes: constants from Task 1.
- Produces:

```ts
// timer.ts
export type Timer =
  | { readonly status: 'running'; readonly totalMs: number; readonly endsAt: number }
  | { readonly status: 'paused'; readonly totalMs: number; readonly remainingMs: number };
export function startTimer(durationMs: number, now: number): Timer;
export function remainingMs(timer: Timer, now: number): number;   // never below 0
export function isDone(timer: Timer, now: number): boolean;       // remaining is 0
export function pauseTimer(timer: Timer, now: number): Timer;
export function resumeTimer(timer: Timer, now: number): Timer;
export function addTime(timer: Timer, addMs: number, now: number): Timer;

// marks.ts
export type Crossing = { readonly kind: 'ding'; readonly minutes: number } | { readonly kind: 'end' };
export function detectCrossing(prevRemainingMs: number, curRemainingMs: number): Crossing | null;

// stage.ts
export type Stage = 'calm' | 'warm' | 'hot' | 'done';
export function stageFor(remainingMs: number): Stage;

// ring.ts
export type RingDirection = 'empties' | 'fills';
export function ringFraction(remainingMs: number, totalMs: number, direction: RingDirection): number;
export function ringDash(fraction: number, direction: RingDirection, circumference: number):
  { readonly dasharray: string; readonly dashoffset: number };

// tick.ts
export type TickSnapshot = { readonly at: number; readonly remainingMs: number | null }; // null: no running timer
export type SoundEffect = { readonly kind: 'ding'; readonly minutes: number } | { readonly kind: 'tune' };
export function soundEffectFor(prev: TickSnapshot | null, cur: TickSnapshot): SoundEffect | null;
```

- [ ] **Step 1: Write the failing tests.**

`timer.test.ts` (with `const T0 = 1_000_000`):
```ts
const t = startTimer(600_000, T0);
expect(t).toEqual({ status: 'running', totalMs: 600_000, endsAt: T0 + 600_000 });
expect(remainingMs(t, T0 + 1_000)).toBe(599_000);
expect(remainingMs(t, T0 + 700_000)).toBe(0);            // slept past the end: clamps
expect(isDone(t, T0 + 600_000)).toBe(true);
const p = pauseTimer(t, T0 + 100_000);
expect(p).toEqual({ status: 'paused', totalMs: 600_000, remainingMs: 500_000 });
expect(remainingMs(p, T0 + 999_999)).toBe(500_000);      // frozen
expect(resumeTimer(p, T0 + 200_000)).toEqual({ status: 'running', totalMs: 600_000, endsAt: T0 + 700_000 });
expect(addTime(t, 60_000, T0)).toEqual({ status: 'running', totalMs: 660_000, endsAt: T0 + 660_000 });
expect(addTime(p, 300_000, T0)).toEqual({ status: 'paused', totalMs: 900_000, remainingMs: 800_000 });
// unchanged (same reference) in these cases:
expect(pauseTimer(p, T0)).toBe(p);
expect(resumeTimer(t, T0)).toBe(t);
expect(pauseTimer(t, T0 + 600_000)).toBe(t);             // already done
expect(addTime(t, 60_000, T0 + 600_000)).toBe(t);        // already done
const full = startTimer(MAX_TIMER_MS, T0);
expect(addTime(full, 60_000, T0)).toBe(full);            // would pass 24 hours left
```
Also assert none of these calls changes its input (`Object.freeze` the input first).

`marks.test.ts`:
```ts
it.each([
  [900_001, 900_000, { kind: 'ding', minutes: 15 }],
  [900_000, 899_750, null],                 // started exactly on the mark: skipped
  [600_000, 599_900, null],                 // a 10-minute timer does not ding at 10
  [300_100, 299_900, { kind: 'ding', minutes: 5 }],
  [180_050, 179_990, { kind: 'ding', minutes: 3 }],
  [60_010, 60_000, { kind: 'ding', minutes: 1 }],
  [400_000, 50_000, { kind: 'ding', minutes: 1 }],   // several crossed: the lowest
  [250, 0, { kind: 'end' }],
  [400_000, 0, { kind: 'end' }],
  [0, 0, null],
  [100_000, 400_000, null],                 // time was added
])('detectCrossing(%d, %d)', (prev, cur, expected) => {
  expect(detectCrossing(prev, cur)).toEqual(expected);
});
```
A mark M is crossed when `prev > M >= cur`.

`stage.test.ts`: 300_001 is `calm`; 300_000 is `warm`; 60_001 is `warm`; 60_000 is `hot`; 1 is `hot`; 0 is `done`.

`ring.test.ts`:
```ts
expect(ringFraction(450_000, 900_000, 'empties')).toBe(0.5);
expect(ringFraction(900_000, 900_000, 'empties')).toBe(1);
expect(ringFraction(900_000, 900_000, 'fills')).toBe(0);
expect(ringFraction(0, 900_000, 'empties')).toBe(0);
expect(ringFraction(0, 900_000, 'fills')).toBe(1);
expect(ringFraction(225_000, 900_000, 'fills')).toBe(0.75);
expect(ringFraction(999_999, 900_000, 'empties')).toBe(1);   // clamped
expect(ringFraction(100, 0, 'empties')).toBe(0);             // no total: treat as finished
expect(ringFraction(100, 0, 'fills')).toBe(1);
expect(ringDash(0.25, 'empties', 1000)).toEqual({ dasharray: '250 1000', dashoffset: -750 });
expect(ringDash(0.25, 'fills', 1000)).toEqual({ dasharray: '250 1000', dashoffset: 0 });
```
Meaning: the arc is drawn from 12 o'clock clockwise. In both modes the moving edge travels clockwise from the top. "Fills" grows the solid arc from the top; "empties" removes it starting from the top.

`tick.test.ts`:
```ts
expect(soundEffectFor(null, { at: 0, remainingMs: 300_000 })).toBeNull();
expect(soundEffectFor({ at: 0, remainingMs: 300_100 }, { at: 250, remainingMs: 299_850 }))
  .toEqual({ kind: 'ding', minutes: 5 });
expect(soundEffectFor({ at: 0, remainingMs: 200 }, { at: 250, remainingMs: 0 })).toEqual({ kind: 'tune' });
expect(soundEffectFor({ at: 0, remainingMs: 300_100 }, { at: 2001, remainingMs: 298_099 })).toBeNull(); // was asleep
expect(soundEffectFor({ at: 0, remainingMs: 200 }, { at: 9000, remainingMs: 0 })).toBeNull();           // end missed
expect(soundEffectFor({ at: 0, remainingMs: null }, { at: 250, remainingMs: 299_000 })).toBeNull();
expect(soundEffectFor({ at: 0, remainingMs: 300_100 }, { at: 250, remainingMs: null })).toBeNull();
```
No sound when `cur.at - prev.at > STALE_TICK_MS`.

- [ ] **Step 2:** Run `npx vitest run src/core`. Expected: the new tests FAIL (modules missing).
- [ ] **Step 3: Implement the five modules** to the signatures above.
- [ ] **Step 4:** Run `npm test` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: add core timer rules`.

---

### Task 3: Parent input rules and passcode rules

**Files:**
- Create: `src/core/validate.ts`, `src/core/untilTime.ts`, `src/core/passcode.ts`, `src/core/codeFlow.ts`
- Test: one `*.test.ts` beside each

**Interfaces:**
- Consumes: constants.
- Produces:

```ts
// validate.ts
export type MinutesResult =
  | { readonly ok: true; readonly minutes: number }
  | { readonly ok: false; readonly message: string };
export function parseCustomMinutes(raw: string): MinutesResult;

// untilTime.ts
export type ClockTime = { readonly hours: number; readonly minutes: number };
export function parseTimeValue(value: string): ClockTime | null;   // "HH:MM" from <input type="time">
export function msUntil(target: ClockTime, now: Date): number;      // always > 0 and <= 24 hours

// passcode.ts
export type LockState = { readonly wrongCount: number; readonly lockedUntil: number | null };
export const INITIAL_LOCK: LockState;                                // { wrongCount: 0, lockedUntil: null }
export function isValidPasscode(code: string): boolean;              // exactly 4 ASCII digits
export function appendDigit(entry: string, digit: string): string;
export function deleteDigit(entry: string): string;
export function isLockedOut(lock: LockState, now: number): boolean;
export function checkPasscode(lock: LockState, entry: string, passcode: string, now: number):
  { readonly lock: LockState; readonly outcome: 'ok' | 'wrong' };

// codeFlow.ts
export type CodeFlow = {
  readonly step: 'current' | 'choose' | 'confirm';
  readonly first: string; readonly entry: string; readonly error: string | null;
};
export const CODE_FLOW_TITLES: Record<CodeFlow['step'], string>;
export function beginCreate(): CodeFlow;                              // step 'choose'
export function beginChange(): CodeFlow;                              // step 'current'
export function codeFlowDigit(flow: CodeFlow, digit: string, currentPasscode: string | null):
  { readonly flow: CodeFlow | null; readonly newPasscode: string | null };
export function codeFlowDelete(flow: CodeFlow): CodeFlow;
```

Exact copy (fixed so tests and screens agree):
- Minutes errors: empty → `Type a number of minutes.`; not a whole number → `Use a whole number, like 20.`; below 1 → `At least 1 minute.`; above 1440 → `1440 minutes (24 hours) is the most.`
- `CODE_FLOW_TITLES`: current → `Enter your current code`; choose → `Choose a 4-digit code`; confirm → `Enter it again`.
- Code-flow errors: wrong current code → `That's not the current code.`; mismatch → `Those didn't match. Try again.`

- [ ] **Step 1: Write the failing tests.**

`validate.test.ts`: accepted after trimming, only if it matches `/^[0-9]+$/`:
```ts
it.each([['20', 20], [' 15 ', 15], ['1', 1], ['1440', 1440], ['007', 7]])('%j ok', (raw, m) =>
  expect(parseCustomMinutes(raw)).toEqual({ ok: true, minutes: m }));
it.each([
  ['', 'Type a number of minutes.'], ['   ', 'Type a number of minutes.'],
  ['abc', 'Use a whole number, like 20.'], ['1.5', 'Use a whole number, like 20.'],
  ['1e2', 'Use a whole number, like 20.'], ['-3', 'Use a whole number, like 20.'],
  ['+5', 'Use a whole number, like 20.'], ['１５', 'Use a whole number, like 20.'],
  ['0', 'At least 1 minute.'], ['1441', '1440 minutes (24 hours) is the most.'],
  ['99999999999999999999', '1440 minutes (24 hours) is the most.'],
])('%j rejected', (raw, message) =>
  expect(parseCustomMinutes(raw)).toEqual({ ok: false, message }));
```

`untilTime.test.ts` (dates built with `new Date(2026, 10, 22, h, m, s)`, local time):
```ts
expect(parseTimeValue('09:30')).toEqual({ hours: 9, minutes: 30 });
expect(parseTimeValue('00:00')).toEqual({ hours: 0, minutes: 0 });
for (const bad of ['', '24:00', '09:60', '9:3x', '0930']) expect(parseTimeValue(bad)).toBeNull();
expect(msUntil({ hours: 9, minutes: 30 }, at(9, 0, 0))).toBe(1_800_000);
expect(msUntil({ hours: 9, minutes: 30 }, at(9, 10, 30))).toBe(1_170_000);
expect(msUntil({ hours: 9, minutes: 30 }, at(9, 30, 0))).toBe(86_400_000);   // now exactly: tomorrow
expect(msUntil({ hours: 9, minutes: 30 }, at(9, 30, 20))).toBe(86_380_000);  // just passed: tomorrow
expect(msUntil({ hours: 8, minutes: 0 }, at(17, 0, 0))).toBe(54_000_000);
```

`passcode.test.ts`:
```ts
expect(isValidPasscode('2580')).toBe(true);
for (const bad of ['', '258', '25800', '25a0', '２５８０']) expect(isValidPasscode(bad)).toBe(false);
expect(appendDigit('25', '8')).toBe('258');
expect(appendDigit('2580', '1')).toBe('2580');        // fifth digit ignored
expect(appendDigit('25', 'x')).toBe('25');
expect(appendDigit('25', '12')).toBe('25');
expect(deleteDigit('258')).toBe('25');
expect(deleteDigit('')).toBe('');
expect(checkPasscode(INITIAL_LOCK, '2580', '2580', 0)).toEqual({ lock: INITIAL_LOCK, outcome: 'ok' });
const w1 = checkPasscode(INITIAL_LOCK, '0000', '2580', 0);
expect(w1).toEqual({ lock: { wrongCount: 1, lockedUntil: null }, outcome: 'wrong' });
const w2 = checkPasscode(w1.lock, '0000', '2580', 0);
const w3 = checkPasscode(w2.lock, '0000', '2580', 5_000);
expect(w3.lock).toEqual({ wrongCount: 0, lockedUntil: 35_000 });
expect(isLockedOut(w3.lock, 34_999)).toBe(true);
expect(isLockedOut(w3.lock, 35_000)).toBe(false);
expect(checkPasscode(w2.lock, '2580', '2580', 0).lock).toEqual(INITIAL_LOCK);  // a right code clears the count
```

`codeFlow.test.ts`: type digits one at a time with a helper `typeCode(flow, '2580', current)`.
- Create: `beginCreate()` → type `2580` → step `confirm`, `first: '2580'`, `entry: ''`, no new passcode yet → type `2580` → `{ flow: null, newPasscode: '2580' }`.
- Mismatch: at `confirm` type `1111` → step `choose`, `first: ''`, `entry: ''`, `error: "Those didn't match. Try again."`, `newPasscode: null`. The error clears on the next digit.
- Change: `beginChange()` with current `2580`: type `0000` → stays `current`, `entry: ''`, `error: "That's not the current code."`; type `2580` → step `choose`.
- `codeFlowDelete` removes the last entry digit and never touches `first`.
- Non-digit input leaves the flow unchanged.

- [ ] **Step 2:** Run `npx vitest run src/core`. Expected: new tests FAIL.
- [ ] **Step 3: Implement the four modules.**
- [ ] **Step 4:** Run `npm test` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: add input validation and passcode rules`.

---

### Task 4: App state, reducer and saved data

**Files:**
- Create: `src/app/state.ts`, `src/app/reducer.ts`, `src/app/store.ts`, `src/app/storage.ts`
- Test: `src/app/reducer.test.ts`, `src/app/store.test.ts`, `src/app/storage.test.ts`

**Interfaces:**
- Consumes: `Timer` and its functions, `RingDirection`, `LockState`, `INITIAL_LOCK`, `appendDigit`, `deleteDigit`, `isLockedOut`, `checkPasscode`, `CodeFlow`, `beginCreate`, `beginChange`, `codeFlowDigit`, `codeFlowDelete`, constants.
- Produces:

```ts
// state.ts
export type Settings = { readonly ringDirection: RingDirection; readonly passcode: string | null };
export type Overlay = 'none' | 'keypad' | 'controls';
export type AppState = {
  readonly settings: Settings;
  readonly timer: Timer | null;
  readonly overlay: Overlay;
  readonly entry: string;              // keypad digits so far
  readonly lock: LockState;
  readonly codeFlow: CodeFlow | null;
  readonly overlayTouchedAt: number;
};
export type Action =
  | { readonly type: 'start'; readonly durationMs: number }
  | { readonly type: 'set-direction'; readonly direction: RingDirection }
  | { readonly type: 'open-keypad' }
  | { readonly type: 'digit'; readonly digit: string }
  | { readonly type: 'delete-digit' }
  | { readonly type: 'close-overlay' }
  | { readonly type: 'pause' } | { readonly type: 'resume' }
  | { readonly type: 'add-time'; readonly minutes: number }
  | { readonly type: 'stop' }
  | { readonly type: 'begin-change-code' } | { readonly type: 'cancel-code-flow' };
export type Screen = 'code' | 'setup' | 'timer';
export type Persisted = { readonly settings: Settings; readonly timer: Timer | null };
export const DEFAULT_PERSISTED: Persisted;   // { settings: { ringDirection: 'empties', passcode: null }, timer: null }
export function initialState(persisted: Persisted): AppState;
export function screenFor(state: AppState): Screen;
export function shouldAutoClose(state: AppState, now: number): boolean;

// reducer.ts
export function reduce(state: AppState, action: Action, now: number): AppState;

// store.ts
export type Store = {
  getState(): AppState;
  dispatch(action: Action): void;
  subscribe(listener: (state: AppState) => void): () => void;
};
export function createStore(initial: AppState, now: () => number): Store;

// storage.ts
export type StorageBackend = Pick<Storage, 'getItem' | 'setItem'>;
export function parsePersisted(raw: string | null): Persisted;   // never throws
export function serializeState(state: AppState): string;         // settings and timer only
export function createStorage(backend: StorageBackend): { load(): Persisted; save(state: AppState): void };
```

`screenFor`: `'code'` when `codeFlow` is not null; else `'setup'` when `timer` is null; else `'timer'`.
`shouldAutoClose`: overlay is not `'none'` and `now - overlayTouchedAt >= OVERLAY_IDLE_MS`.

- [ ] **Step 1: Write the failing reducer tests.** One `it` per rule. Build states with a small `stateWith(overrides)` helper over `initialState`. An action that is "ignored" must return the *same reference*.

| Rule | Assertion |
|---|---|
| First run | `initialState(DEFAULT_PERSISTED)` has `codeFlow` equal to `beginCreate()`; screen is `code` |
| Returning | with passcode `'2580'` and no timer, screen is `setup`, `codeFlow` null |
| `start` | on `setup`: timer equals `startTimer(durationMs, now)`. Ignored on `code` and `timer` screens. Ignored when `durationMs` is not a finite number in `[60_000, MAX_TIMER_MS]` |
| `set-direction` | on `setup` updates `settings.ringDirection`; ignored on other screens |
| `open-keypad` | on `timer` with overlay `none`: overlay `keypad`, `entry: ''`, `overlayTouchedAt: now`. Ignored on other screens, when an overlay is already open, and while locked out |
| `digit` in keypad | appends, sets `overlayTouchedAt`. Fourth digit, right code, timer not done: overlay `controls`, `entry: ''`, lock reset. Right code, timer done: `timer: null`, overlay `none` (straight to setup). Wrong code: overlay `none`, `entry: ''`, `lock.wrongCount` 1 |
| Lockout | three wrong codes: `lock.lockedUntil` is `now + 30_000`; `open-keypad` ignored until then; accepted at exactly `lockedUntil` |
| `digit` elsewhere | ignored when overlay is `none` or `controls` and no code flow is active |
| `delete-digit` | removes last digit in keypad or code flow; ignored otherwise |
| Controls gate | `pause`, `resume`, `add-time`, `stop` are each ignored unless overlay is `controls` |
| Controls | `pause` then `resume` match `pauseTimer`/`resumeTimer`; `add-time` with `minutes: 1` and `5` matches `addTime`; `minutes: 2` ignored; each sets `overlayTouchedAt: now`; `stop` gives `timer: null`, overlay `none` |
| `close-overlay` | overlay `none`, `entry: ''`; ignored when already `none` |
| Code flow | `digit`/`delete-digit` route to the code flow when it is active; finishing it sets `settings.passcode` and `codeFlow: null` |
| `begin-change-code` | on `setup` with a passcode: `codeFlow` equals `beginChange()`; ignored on `timer` |
| `cancel-code-flow` | clears the flow when a passcode exists; ignored on first run (no passcode yet) |
| Fast fingers | dispatching 6 digits in a row from an open keypad with a wrong code ends with overlay `none` and the 5th and 6th ignored |
| Purity | deep-freeze the input state; no reducer call throws or changes it |

- [ ] **Step 2: Write the failing storage and store tests.**

```ts
expect(parsePersisted(null)).toEqual(DEFAULT_PERSISTED);
expect(parsePersisted('not json')).toEqual(DEFAULT_PERSISTED);
expect(parsePersisted('[]')).toEqual(DEFAULT_PERSISTED);
// each part is judged on its own:
expect(parsePersisted(JSON.stringify({ settings: { ringDirection: 'fills', passcode: '2580' }, timer: { status: 'running', totalMs: 600000, endsAt: null } })))
  .toEqual({ settings: { ringDirection: 'fills', passcode: '2580' }, timer: null });
expect(parsePersisted(JSON.stringify({ settings: { ringDirection: 'sideways', passcode: '25' }, timer: null })))
  .toEqual(DEFAULT_PERSISTED);
```
Also: a valid running timer and a valid paused timer round-trip through `serializeState` then `parsePersisted`. Rejected timers: `totalMs` 0, negative, above `MAX_TIMER_MS`, or not finite; `endsAt` not finite; paused `remainingMs` negative or above `totalMs`; unknown `status`. `serializeState` output contains no `entry`, `lock` or `overlay`.
`createStorage`: a backend whose `getItem` throws → `load()` returns `DEFAULT_PERSISTED` and calls `console.warn` once. A backend whose `setItem` throws → `save()` does not throw and calls `console.warn`.
`createStore`: `dispatch` runs `reduce` with `now()`; listeners are called only when the state reference changed; the function returned by `subscribe` stops further calls.

- [ ] **Step 3:** Run `npx vitest run src/app`. Expected: FAIL.
- [ ] **Step 4: Implement** `state.ts`, `reducer.ts` (one small handler function per action; keep `reduce` itself a dispatch table), `store.ts`, `storage.ts`.
- [ ] **Step 5:** Run `npm test` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 6: Commit** `feat: add app state, reducer and saved data`.

---

### Task 5: The timer screen and the color theme

**Files:**
- Create: `src/ui/view.ts`, `src/ui/theme.ts`, `src/ui/timerView.ts`, `src/ui/styles.css`
- Test: `src/ui/theme.test.ts`, `src/ui/timerView.test.ts`

**Interfaces:**
- Consumes: `AppState`, `remainingMs`, `formatRemaining`, `stageFor`, `Stage`, `ringFraction`, `ringDash`.
- Produces:

```ts
// view.ts
export type View = { readonly el: HTMLElement; update(state: AppState, now: number): void };

// theme.ts
export type StageColors = { readonly bg: string; readonly ring: string; readonly track: string; readonly digits: string };
export const STAGE_COLORS: Record<Stage, StageColors>;      // 6-digit hex strings
export function contrastRatio(hexA: string, hexB: string): number;   // WCAG 2 formula
export function applyStage(el: HTMLElement, stage: Stage): void;     // sets data-stage and CSS variables

// timerView.ts
export function createTimerView(): View;
```

DOM contract (later tasks and the end-to-end tests rely on these):
- root `[data-testid="timer-screen"]` carrying `data-stage`
- `[data-testid="digits"]` with the formatted time and `data-len` set to the text length (5, 6 or 7)
- `[data-testid="ring-arc"]`: an SVG `<circle>` whose `stroke-dasharray` and `stroke-dashoffset` come from `ringDash`; a second circle `[data-testid="ring-track"]` behind it for the faded part
- `[data-testid="times-up"]` containing `Time's up!`, hidden (`hidden` attribute) unless the stage is `done`
- No buttons, links or other controls inside the timer screen.

- [ ] **Step 1: Write the failing tests.**

`theme.test.ts`:
```ts
expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
for (const stage of ['calm', 'warm', 'hot', 'done'] as const) {
  const c = STAGE_COLORS[stage];
  expect(contrastRatio(c.digits, c.bg)).toBeGreaterThanOrEqual(7);     // digits read across a room
  expect(contrastRatio(c.ring, c.bg)).toBeGreaterThanOrEqual(3);
  expect(contrastRatio(c.ring, c.track)).toBeGreaterThanOrEqual(2);    // time left vs time gone
}
expect(new Set(Object.values(STAGE_COLORS).map((c) => c.bg)).size).toBe(4);   // four distinct backgrounds
```

`timerView.test.ts` (jsdom), with a state holding `startTimer(900_000, 0)` and direction `empties`:
- at `now = 0`: digits `15:00`, `data-len="5"`, `data-stage="calm"`, `times-up` hidden, arc dash values equal `ringDash(1, 'empties', C)` for the view's circumference.
- at `now = 600_000`: digits `05:00`, stage `warm`. At `840_000`: stage `hot`. At `900_000` and at `5_000_000`: digits `00:00`, stage `done`, `times-up` visible.
- direction `fills` at `now = 450_000`: arc equals `ringDash(0.5, 'fills', C)`.
- a paused timer shows its frozen remaining time whatever `now` is.
- a 480-minute timer shows `480:00` with `data-len="6"`; a 1440-minute one shows `1440:00` with `data-len="7"`.
- `el.querySelectorAll('button, a, input').length` is 0.
- `update` with `timer: null` does not throw.

- [ ] **Step 2:** Run `npx vitest run src/ui`. Expected: FAIL.
- [ ] **Step 3: Implement.** Choose the palette yourself within these rules: colorful and playful, a clearly cooler calm stage, clearly warmer warm and hot stages, a celebratory done stage, and the contrast test above. Layout rules for `styles.css`:
  - the ring's diameter is the smaller of the viewport's width and height, minus safe-area insets and a small margin; use `dvh`/`dvw` units
  - digits are centered in the ring, in a rounded system font stack (`ui-rounded, "SF Pro Rounded", system-ui, sans-serif`) with `font-variant-numeric: tabular-nums`; font size is derived from the ring diameter and steps down by `data-len` so 5, 6 and 7 characters all sit inside the ring's inner edge
  - background and ring colors change with a transition of about 1.5 s; no transition under `prefers-reduced-motion: reduce`
  - the timer screen has `user-select: none`, `-webkit-touch-callout: none`, `touch-action: none`
- [ ] **Step 4:** Run `npm test` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: add timer screen and color stages`.

---

### Task 6: The setup screen and the code screens

**Files:**
- Create: `src/ui/keypad.ts`, `src/ui/setupView.ts`, `src/ui/codeView.ts`
- Modify: `src/ui/styles.css`
- Test: `src/ui/keypad.test.ts`, `src/ui/setupView.test.ts`, `src/ui/codeView.test.ts`

**Interfaces:**
- Consumes: `View`, `AppState`, `Action`, `parseCustomMinutes`, `parseTimeValue`, `msUntil`, `CODE_FLOW_TITLES`, constants.
- Produces:

```ts
// keypad.ts
export function createKeypad(onDigit: (digit: string) => void, onDelete: () => void): HTMLElement;
export function createDots(): { readonly el: HTMLElement; set(filled: number): void };

// setupView.ts
export function createSetupView(dispatch: (action: Action) => void, clock: () => Date): View;

// codeView.ts
export function createCodeView(dispatch: (action: Action) => void): View;
```

DOM contract:
- Keypad: ten `<button>`s `[data-testid="key-0"]` … `[data-testid="key-9"]` in phone-keypad order (1 2 3 / 4 5 6 / 7 8 9 / 0 centered on the last row) and `[data-testid="key-delete"]`. Digit keys have **no text content and no visible label**; each has an `aria-label` of its digit. No `:active`, `:hover` or `:focus` style that reveals which key was pressed (keyboard focus ring: none on digit keys).
- Dots: `[data-testid="dots"]` with 4 children, each `data-filled="true|false"`.
- Setup: `[data-testid="setup-screen"]`; `preset-5`, `preset-10`, `preset-15`, `preset-30`; `custom-minutes` (text input, `inputmode="numeric"`), `custom-start`, `custom-error`; `until-time` (`<input type="time">`), `until-start`, `until-error`; `direction-empties`, `direction-fills` (each with `aria-pressed`); `change-code`.
- Code screen: `[data-testid="code-screen"]`; `code-title`; `code-error`; the keypad and dots; `code-cancel` (hidden on first run, when `settings.passcode` is null).

- [ ] **Step 1: Write the failing tests** (jsdom; `dispatch` is a `vi.fn()`).

Keypad: clicking `key-7` calls `onDigit('7')`; `key-delete` calls `onDelete`; every digit key has empty `textContent`; DOM order of the digit keys is `1,2,3,4,5,6,7,8,9,0`; `createDots().set(2)` gives filled flags `true,true,false,false`.

Setup view:
- clicking `preset-15` dispatches `{ type: 'start', durationMs: 900_000 }` (same for 5, 10, 30)
- typing `20` and clicking `custom-start` dispatches `{ type: 'start', durationMs: 1_200_000 }`; pressing Enter in the field does the same
- typing `0` and clicking `custom-start` dispatches nothing and shows `At least 1 minute.` in `custom-error`; the error clears on the next input event
- with `clock` fixed at 09:00:00, setting `until-time` to `09:30` and clicking `until-start` dispatches `{ type: 'start', durationMs: 1_800_000 }`
- clicking `until-start` with no time chosen dispatches nothing and shows `Pick a time first.` in `until-error`
- clicking `direction-fills` dispatches `{ type: 'set-direction', direction: 'fills' }`; `update` with `ringDirection: 'fills'` sets `aria-pressed="true"` on it and `"false"` on the other
- clicking `change-code` dispatches `{ type: 'begin-change-code' }`

Code view:
- with `codeFlow = beginCreate()`: title `Choose a 4-digit code`, `code-cancel` hidden, 0 dots filled
- with `entry: '25'`: 2 dots filled
- with step `confirm`: title `Enter it again`
- with an `error`: `code-error` shows it; with `error: null` it is empty
- clicking `key-3` dispatches `{ type: 'digit', digit: '3' }`; `key-delete` dispatches `{ type: 'delete-digit' }`
- with a passcode set and `codeFlow = beginChange()`: title `Enter your current code`, `code-cancel` visible and dispatching `{ type: 'cancel-code-flow' }`

- [ ] **Step 2:** Run `npx vitest run src/ui`. Expected: FAIL.
- [ ] **Step 3: Implement.** The setup screen is for an adult in a hurry: big preset buttons first, then custom, then until-a-time, then ring direction, with "Change code" small at the bottom. Section labels: `How long?`, `Or until a time`, `Ring`. Direction button labels: `Empties`, `Fills up`. It must be usable on a phone held upright and on a laptop.
- [ ] **Step 4:** Run `npm test` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: add setup and passcode screens`.

---

### Task 7: The lock: hold, keypad overlay, parent controls, keyboard

**Files:**
- Create: `src/ui/hold.ts`, `src/ui/lockView.ts`, `src/ui/keyboard.ts`
- Modify: `src/ui/styles.css`
- Test: `src/ui/hold.test.ts`, `src/ui/lockView.test.ts`, `src/ui/keyboard.test.ts`

**Interfaces:**
- Consumes: `View`, `AppState`, `Action`, `createKeypad`, `createDots`, `screenFor`, `HOLD_MS`, `ADD_TIME_MINUTES`.
- Produces:

```ts
// hold.ts
export function attachHold(el: HTMLElement, onHold: () => void, holdMs?: number): () => void;   // returns detach

// lockView.ts
export function createLockView(dispatch: (action: Action) => void): View;

// keyboard.ts
export function attachKeyboard(
  target: Document, getState: () => AppState, dispatch: (action: Action) => void, holdMs?: number,
): () => void;                                                                                   // returns detach
```

DOM contract for `lockView`:
- `[data-testid="keypad-overlay"]` (keypad + dots), shown only when `overlay === 'keypad'`
- `[data-testid="controls"]`, shown only when `overlay === 'controls'`, containing `control-pause` (text `Pause` while running, `Resume` while paused), `control-add-1` (`+1 min`), `control-add-5` (`+5 min`), `control-stop` (`Stop`)
- hidden things use the `hidden` attribute
- overlays sit in the lower part of the screen; the timer digits stay fully visible above them (shrink the ring while an overlay is open)

- [ ] **Step 1: Write the failing tests** (jsdom, `vi.useFakeTimers()`).

`hold.test.ts`:
- `pointerdown`, advance 1999 ms → not called; 1 ms more → called once
- `pointerdown`, advance 1500, `pointerup`, advance 5000 → never called (also for `pointercancel` and `pointerleave`)
- `pointerdown`, then a `pointermove` more than 20 px away → cancelled; a move of 5 px does not cancel
- a second `pointerdown` (another finger) while one is held → cancelled
- only the primary button starts a hold (`button !== 0` is ignored)
- a `contextmenu` event on `el` is `defaultPrevented`
- after calling the returned detach function, nothing fires

`lockView.test.ts`:
- overlay `none`: both parts hidden
- overlay `keypad` with `entry: '258'`: keypad visible, 3 dots filled, controls hidden; clicking `key-0` dispatches `{ type: 'digit', digit: '0' }`
- overlay `controls`, running timer: `control-pause` reads `Pause` and dispatches `{ type: 'pause' }`; with a paused timer it reads `Resume` and dispatches `{ type: 'resume' }`
- `control-add-1` → `{ type: 'add-time', minutes: 1 }`; `control-add-5` → `{ type: 'add-time', minutes: 5 }`; `control-stop` → `{ type: 'stop' }`

`keyboard.test.ts` (state supplied by a `getState` stub):
- overlay `keypad`: key `7` dispatches `{ type: 'digit', digit: '7' }`; `Backspace` → `{ type: 'delete-digit' }`; `Escape` → `{ type: 'close-overlay' }`
- code screen active: digits and Backspace dispatch the same actions
- overlay `controls`: `Escape` closes; digits dispatch nothing
- timer screen, overlay `none`: holding Space (keydown, 2000 ms, no keyup) dispatches `{ type: 'open-keypad' }` once; releasing at 1500 ms dispatches nothing; `keydown` events with `repeat: true` do not restart the hold; Enter works the same way
- setup screen: digits typed into the custom-minutes field dispatch nothing (ignore key events whose target is an `input`)

- [ ] **Step 2:** Run `npx vitest run src/ui`. Expected: FAIL.
- [ ] **Step 3: Implement** the three modules. Use Pointer Events. The move tolerance is a named constant in `hold.ts`.
- [ ] **Step 4:** Run `npm test` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: add passcode lock and parent controls`.

---

### Task 8: Sound, screen wake, and wiring it all together

**Files:**
- Create: `src/platform/sound.ts`, `src/platform/wakeLock.ts`, `src/app/effects.ts`
- Modify: `src/main.ts`, `src/ui/styles.css`, `index.html`
- Test: `src/platform/sound.test.ts`, `src/platform/wakeLock.test.ts`, `src/app/effects.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1 to 7.
- Produces:

```ts
// sound.ts
export type Note = { readonly freq: number; readonly at: number; readonly duration: number };   // seconds
export function dingNotes(minutes: number): readonly Note[];
export const TUNE_NOTES: readonly Note[];
export type Sound = { unlock(): Promise<void>; isUnlocked(): boolean; play(effect: SoundEffect): void };
export function createSound(makeContext: () => AudioContext): Sound;

// wakeLock.ts
export type WakeLockController = { setActive(active: boolean): Promise<void> };
export function createWakeLock(nav: Navigator, doc: Document): WakeLockController;

// effects.ts
export function snapshotOf(state: AppState, now: number): TickSnapshot;   // remainingMs null unless running
export function wantsWake(state: AppState, now: number): boolean;         // running and not done
export function needsSoundHint(state: AppState, now: number, soundUnlocked: boolean): boolean;
```

- [ ] **Step 1: Write the failing tests.**

`sound.test.ts`:
- `dingNotes(15)` and `dingNotes(10)` have 1 note; `dingNotes(5)` and `dingNotes(3)` have 2; `dingNotes(1)` has 3 (more insistent near the end); an unknown value returns 1 note
- every ding lasts under 1.5 s in total; `TUNE_NOTES` has at least 4 notes, rises overall, and lasts between 2 and 5 seconds
- all frequencies are between 300 and 1600 Hz (never harsh)
- with a fake `AudioContext` (`state: 'suspended'`, `resume` flips it to `'running'`, `createOscillator`/`createGain` return spy nodes): `isUnlocked()` is false before `unlock()` and true after; `play` before unlock creates no oscillators and does not throw; `play({ kind: 'ding', minutes: 5 })` after unlock starts 2 oscillators; `play({ kind: 'tune' })` starts `TUNE_NOTES.length`; peak gain never exceeds 0.35; a `makeContext` that throws leaves `unlock()` resolved, `isUnlocked()` false, and one `console.warn`

`wakeLock.test.ts` (fake `nav.wakeLock.request` returning a sentinel with `release`):
- `setActive(true)` requests a `'screen'` lock once; calling it again does not request a second
- `setActive(false)` releases it
- while active, a `visibilitychange` to `visible` requests again (the system drops the lock when the page is hidden)
- a `request` that rejects → no throw, one `console.warn`
- a `nav` without `wakeLock` → resolves, no throw

`effects.test.ts`: `snapshotOf` gives `remainingMs` for a running timer and `null` for paused, done-and-stopped (`timer: null`) states; a running timer past its end gives `0`. `wantsWake` is true only while running with time left. `needsSoundHint` is true only when a timer is running with time left and sound is not unlocked.

- [ ] **Step 2:** Run `npx vitest run src/platform src/app/effects.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `sound.ts`, `wakeLock.ts`, `effects.ts`.** Notes are soft bell-like tones (sine or triangle with a quick attack and exponential decay). In `createSound`, if `navigator.audioSession` exists, set its `type` to `'playback'` inside `unlock()` so the iPhone silent switch does not mute the dings (feature-detect; ignore if absent).
- [ ] **Step 4: Wire `src/main.ts`.**
  1. `createStorage(localStorage).load()` → `initialState` → `createStore(…, Date.now)`.
  2. Build the four views (timer, setup, code, lock), append them to `#app`, and show exactly one screen according to `screenFor` (the lock view is layered over the timer screen). Use the `hidden` attribute.
  3. `store.subscribe`: save through storage, then re-render.
  4. A `requestAnimationFrame` loop calls `update(state, Date.now())` on the visible views so the ring moves smoothly.
  5. A `setInterval(TICK_MS)` loop: take `snapshotOf`, call `soundEffectFor(prev, cur)`, play the effect and set `document.documentElement.dataset.lastSound` to `ding-<minutes>` or `tune`; dispatch `close-overlay` when `shouldAutoClose`; call `wakeLock.setActive(wantsWake(…))`.
  6. `attachHold(timerView.el, () => dispatch({ type: 'open-keypad' }))` and `attachKeyboard(document, …)`.
  7. On the first `pointerdown` or `keydown` anywhere, call `sound.unlock()`.
  8. A `[data-testid="sound-hint"]` element reading `Tap for sound`, shown when `needsSoundHint`. It is not a button and does nothing itself; any tap unlocks sound through item 7.
  9. Wrap start-up in a `try/catch` that logs the error and shows a plain message, `Something went wrong. Close the timer and open it again.`, so a failure is never a blank page.
- [ ] **Step 5:** Run `npm test`, `npm run typecheck`, `npm run build`. Expected: PASS. Then run `npm run dev` and check by hand in a browser: start a 5-minute timer, see it count, hold 2 seconds, enter the code, pause, resume, stop.
- [ ] **Step 6: Commit** `feat: add sound, screen wake and app wiring`.

---

### Task 9: Offline install, the share command, and the README

**Files:**
- Create: `public/icon.svg`, generated PNG icons under `public/`, `scripts/shareConfig.mjs`, `scripts/share.mjs`, `.env.example`, `README.md`
- Modify: `vite.config.ts`, `index.html`, `package.json`, `src/main.ts` (register the service worker)
- Test: `scripts/shareConfig.test.ts`

**Interfaces:**
- Consumes: `PREVIEW_PORT`.
- Produces: npm scripts `start` (build, then preview on port 4173 for the MacBook) and `share` (build, preview, and open the ngrok tunnel);

```js
// scripts/shareConfig.mjs
export function readShareConfig(env);   // { ok: true, domain, port } | { ok: false, message }
```

- [ ] **Step 1: Write the failing test** `scripts/shareConfig.test.ts` (add `scripts/**/*.test.ts` to Vitest's include, but not to coverage):

```ts
expect(readShareConfig({ KIDSTIMER_NGROK_DOMAIN: 'my-timer.ngrok-free.app' }))
  .toEqual({ ok: true, domain: 'my-timer.ngrok-free.app', port: 4173 });
expect(readShareConfig({ KIDSTIMER_NGROK_DOMAIN: 'https://my-timer.ngrok-free.app/' }))
  .toEqual({ ok: true, domain: 'my-timer.ngrok-free.app', port: 4173 });       // scheme and slash stripped
expect(readShareConfig({})).toEqual({ ok: false, message: expect.stringContaining('KIDSTIMER_NGROK_DOMAIN') });
for (const bad of ['', '   ', 'not a domain', 'a b.com', 'evil.com; rm -rf /'])
  expect(readShareConfig({ KIDSTIMER_NGROK_DOMAIN: bad }).ok).toBe(false);
```
A domain is valid only if it matches hostname characters (letters, digits, dots, hyphens).

- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3: Implement `readShareConfig`** and `scripts/share.mjs`: load `.env.local`, call `readShareConfig`, and on failure print the message and exit 1. Check `ngrok` is on the PATH; if not, print `ngrok is not installed. Install it with: brew install ngrok` and exit 1. Otherwise run the build, start `vite preview --port 4173 --strictPort`, and start `ngrok http 4173 --url=<domain>`, passing arguments as an array (never through a shell string). Print the https address to open. Stop both child processes on exit or Ctrl-C.
- [ ] **Step 4: Add vite-plugin-pwa** (`npm i -D vite-plugin-pwa @vite-pwa/assets-generator`). Settings: `registerType: 'autoUpdate'`; precache all built assets; manifest `name: 'Kids Timer'`, `short_name: 'Timer'`, `display: 'fullscreen'`, `orientation: 'any'`, `start_url: '/'`, background and theme color equal to the calm stage background; icons 192, 512, a maskable 512, and a 180 px `apple-touch-icon`. Draw `public/icon.svg` (a simple ring on the calm background) and generate the PNGs from it with the assets generator; commit the generated files. Add the iOS meta tags to `index.html` (`apple-mobile-web-app-capable`, status bar style, touch icon link). In `vite.config.ts`, read `KIDSTIMER_NGROK_DOMAIN` with `loadEnv` and add it to `preview.allowedHosts` when present.
- [ ] **Step 5: Verify offline.** Run `npm run build && npm run preview`. In Chrome: open `http://localhost:4173`, confirm a service worker is active and the manifest has no errors (DevTools → Application), then tick "Offline" and reload: the app still opens and a timer runs.
- [ ] **Step 6: Write `README.md`** in plain language for the owner, with these sections: what it is; **Run it on the MacBook** (`npm install`, `npm start`, open `http://localhost:4173`, mirror the screen to the TV); **Put it on the iPhone and iPad** (install ngrok, add the authtoken, copy `.env.example` to `.env.local` and set the fixed ngrok domain, `npm run share`, open the address in Safari, tap through ngrok's warning page if shown, Share → Add to Home Screen, open it once from the home screen while still online; after that the computer can be off); **Using it** (presets, custom, until a time, ring direction, hold 2 seconds for the keypad, keypad layout picture, controls); **The code** (set on first open, per device, change it from setup, forgotten code → delete the home-screen app and add it again, do not reuse a bank or phone PIN); **Known limits** (from spec 5.8); **Updating** (run `npm run share` again and open the app while online); **Device checklist** (the checks in Task 10 Step 6).
- [ ] **Step 7:** Run `npm test`, `npm run typecheck`, `npm run build`. Expected: PASS.
- [ ] **Step 8: Commit** `feat: add offline install and share command`.

---

### Task 10: End-to-end tests and the coverage gate

**Files:**
- Create: `playwright.config.ts`, `e2e/helpers.ts`, `e2e/timer.spec.ts`, `e2e/lock.spec.ts`, `e2e/persistence.spec.ts`, `e2e/layout.spec.ts`
- Modify: `package.json` (script `test:e2e`), `README.md` (how to run the tests), any source file a failing journey exposes

**Interfaces:**
- Consumes: the `data-testid` contracts from Tasks 5 to 8 and `data-last-sound` on `<html>`.
- Produces: `npm run test:e2e`.

- [ ] **Step 1: Set up Playwright.** `npm i -D @playwright/test`, `npx playwright install chromium webkit`. Config: `webServer` runs `npm run dev -- --port 5173 --strictPort`; projects `chromium` and `webkit`; default viewport 1280×800. Helpers in `e2e/helpers.ts`: `freshApp(page, isoTime)` (installs `page.clock` at the given time, opens `/`), `setCode(page, code)` (first-run choose + confirm via the `key-N` buttons), `holdToOpen(page)` (mouse down on the timer screen, `page.clock.runFor(2000)`, mouse up), `enterCode(page, code)`.

  **Clock rule for these tests:** dings are suppressed when more than 2 seconds pass between ticks, and `clock.fastForward` skips ticks. To assert a sound, fast-forward to a few seconds *before* the mark, then use `clock.runFor(...)` across it.

- [ ] **Step 2: Write the journeys.** Each bullet is one test.

`timer.spec.ts`
- First run: the code screen shows `Choose a 4-digit code`; after `setCode('2580')` the setup screen shows.
- Preset: click `preset-15` → digits `15:00`, stage `calm`; after `runFor(1000)` digits `14:59`.
- Marks and stages: 15-minute timer; fast-forward to 5:03 left, `runFor(4000)` → `data-last-sound="ding-5"`, stage `warm`; on to 1:03 left, `runFor(4000)` → `ding-1`, stage `hot`; on to 0:03, `runFor(4000)` → `tune`, digits `00:00`, `times-up` visible.
- No ding at the start: a 15-minute timer after `runFor(3000)` has no `data-last-sound`.
- Custom: `90` → digits `90:00`. `0` → `At least 1 minute.` and still on setup.
- Until a time: clock at 09:10:30, choose `09:30` → digits `19:30`.
- Long timer: clock at 09:00, until `17:00` → digits `480:00`.
- Ring direction: choose `direction-fills`, start; the arc's dash length grows after `runFor(60_000)`. With `direction-empties` it shrinks.

`lock.spec.ts`
- Taps do nothing: 20 clicks around the timer screen; still running, no overlay, digits unchanged apart from time passing.
- A short hold (1 second) opens nothing.
- Hold → keypad; the ten digit keys have no visible text; right code → controls.
- Pause freezes the digits across `runFor(10_000)`; Resume continues.
- `+1 min` and `+5 min` raise the digits by exactly that.
- Stop returns to setup.
- Wrong code closes the keypad; after three wrong codes a hold opens nothing; after `runFor(30_000)` it opens again.
- The keypad closes by itself after 10 seconds untouched; so do the controls.
- Time's up needs the code: at `00:00`, clicks do nothing; hold + code → setup.
- Keyboard: hold Space 2 seconds → keypad; typing `2580` → controls; Escape closes.

`persistence.spec.ts`
- Reload mid-timer: start 15 minutes, `runFor(60_000)`, reload → digits `14:00`, still locked, `sound-hint` visible; one click hides the hint and opens nothing.
- Slept past the end: start 5 minutes, `fastForward('10:00')` → `times-up` visible and `data-last-sound` is not `tune`.
- Reload at Time's up → still Time's up.
- The code and ring direction survive a reload.
- Corrupt saved data: set `localStorage['kidstimer.v1'] = '{oops'`, reload → first-run code screen, no error message.

`layout.spec.ts` (run at 393×852 portrait, 852×393 landscape, 1180×820, 1920×1080)
- For digits `05:00`, `480:00` and `1440:00`: the digits' bounding box lies inside the ring's inner circle (compare box corners to the ring's center and inner radius), nothing overflows the viewport, and the page does not scroll.
- With the keypad overlay open at 393×852, the digits are fully visible and do not overlap the keypad.

- [ ] **Step 3:** Run `npm run test:e2e`. Fix the app (not the tests) until all pass in both browsers. A test may be corrected only if it contradicts the spec; note any such change in `docs/decisions-log.md`.
- [ ] **Step 4:** Run `npm run test:coverage`. Expected: all four measures at 80% or more. Add unit tests for any gap.
- [ ] **Step 5:** Run `npm run typecheck && npm run build`. Expected: PASS.
- [ ] **Step 6: Finish the README's Device checklist** (things only the owner can check, each one line with what "working" looks like): the ngrok address opens on the iPhone and iPad; ngrok's warning page, if shown, does not stop the app loading; Add to Home Screen works and the app opens full screen; with the Mac off and the phone in airplane mode the app still opens and runs a timer; the screen stays awake for a 10-minute timer; dings are audible with the silent switch on and off; mirroring the MacBook sends the dings to the TV; the keypad is comfortable one-handed.
- [ ] **Step 7: Commit** `test: add end-to-end journeys and coverage gate`.
