# Emoji Line Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A parent can put up to 4 emojis on a timer from the start screen (typed, or one of four quick picks), and they show under the countdown so a child can read what the timer is for.

**Architecture:** The line is a plain string, `label`, kept in `AppState` beside `timer` and saved with it. One pure module (`src/core/label.ts`) owns counting and trimming symbols. The `start` action carries the label; the reducer trims it and clears it whenever the timer is cleared. The start screen gets a "What for?" section; the timer screen draws the label under the digits.

**Tech Stack:** As the existing app: TypeScript (strict), Vite, no UI framework, Vitest + jsdom, Playwright (Chromium + WebKit). No new dependencies. `Intl.Segmenter` for counting symbols.

**Spec:** `docs/superpowers/specs/2026-11-22-emoji-label-design.md` (builds on `docs/superpowers/specs/2026-11-22-kids-timer-design.md`)

## Global Constraints

- No new dependencies.
- Tests first (red, then green). Coverage stays at or above 80% (`npm run test:coverage`).
- Files under 400 lines; functions under 50 lines; nesting 4 levels at most.
- Never mutate existing objects; return new ones.
- No hardcoded values in logic: constants live in `src/core/constants.ts`.
- Errors are never silently swallowed.
- Kid-proofing invariant: nothing on the timer screen may change the timer or the label. The label is set only by the `start` action, which the reducer accepts only on the setup screen.
- The label holds at most **4** symbols. One emoji is one symbol even when built from several code points.
- An empty label is always allowed and gives the timer exactly as it is today.
- The digits stay exactly centred in the ring and keep their size, with or without a label.
- Saved data from the current version (no `label`) must still load.
- Text typed by the parent is shown as text, never as markup (`textContent`, never `innerHTML`).
- Commit messages: `<type>: <description>` (feat, fix, refactor, docs, test, chore). No attribution or co-author lines.
- The repository is public: docs and comments carry no family details.
- Owner-facing docs (`README.md`, `docs/decisions-log.md`) are in plain language for a non-programmer.
- Every judgment call not settled by this plan or the spec is appended to `docs/decisions-log.md` under the heading `## Emoji line`, numbered on from the last entry, in the style of the existing entries.

## Review Focus

Inputs the spec implies that are most likely to bite, each pinned by a test in the task named:

1. An emoji made of several code points (family 👨‍👩‍👧‍👦, flag 🇨🇦, skin tone 👍🏽, bed 🛏️ with its variation selector) counts as one symbol and is never cut in half. (Task 1)
2. Saved data written before this change (no `label`), or with a bad `label`, loads without losing the timer. (Task 1)
3. The start screen redraws while the parent is typing (for example after tapping a ring direction): the box keeps its text. (Task 2)
4. Words or markup typed or pasted into the box (`<b>hi</b>`, a long sentence): trimmed to 4 symbols and shown as plain text. (Tasks 1 and 2)
5. Four emojis with the longest reading (`1440:00`), on a phone held sideways, with the lock panel open, and at "Time's up!": everything stays inside the ring. (Task 2)

---

### Task 1: Label rules, state and saved data

**Files:**
- Create: `src/core/label.ts`, `src/core/label.test.ts`
- Modify: `src/core/constants.ts`, `src/app/state.ts`, `src/app/reducer.ts`, `src/app/reducer.test.ts`, `src/app/storage.ts`, `src/app/storage.test.ts`
- Modify (stopgap only): `src/ui/setupView.ts` and `src/ui/setupView.test.ts`, plus any test fixture that builds an `AppState`, `Persisted` or `start` action by hand

**Interfaces:**
- Consumes: `AppState`, `Action`, `Persisted`, `DEFAULT_PERSISTED`, `initialState` (`src/app/state.ts`); `reduce` (`src/app/reducer.ts`); `parsePersisted`, `serializeState` (`src/app/storage.ts`).
- Produces:
  - `src/core/constants.ts`:
    - `export const MAX_LABEL_SYMBOLS = 4;`
    - `export const QUICK_PICKS` — a readonly array, in this order, written with escapes so no code point is lost:

      | `id` | `name` | `label` |
      |---|---|---|
      | `'tv'` | `'TV'` | `'\u{1F4FA}'` (📺) |
      | `'bed'` | `'Bed and zzz'` | `'\u{1F6CF}\u{FE0F}\u{1F4A4}'` (🛏️💤) |
      | `'shoes'` | `'Shoes and car'` | `'\u{1F45F}\u{1F697}'` (👟🚗) |
      | `'slide'` | `'Slide'` | `'\u{1F6DD}'` (🛝) |

      Element type: `{ readonly id: string; readonly name: string; readonly label: string }`.
  - `src/core/label.ts`:
    - `symbolsOf(text: string): readonly string[]` — the symbols (grapheme clusters, via `Intl.Segmenter`) of `text`, with whitespace symbols left out.
    - `clampLabel(text: string): string` — the first `MAX_LABEL_SYMBOLS` symbols of `text`, joined with nothing between them.
    - `isValidLabel(value: unknown): value is string` — true only for a string that `clampLabel` would leave unchanged.
  - `src/app/state.ts`:
    - `AppState` gains `readonly label: string` (`''` when there is none).
    - `Persisted` gains `readonly label: string`; `DEFAULT_PERSISTED.label` is `''`; `initialState` copies it.
    - The `start` action becomes `{ readonly type: 'start'; readonly durationMs: number; readonly label: string }`.

- [ ] **Step 1: Write the failing tests for `src/core/label.ts`**

```ts
// src/core/label.test.ts
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
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run src/core/label.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Add the constants and implement `src/core/label.ts`** with the three signatures above. Build one `Intl.Segmenter(undefined, { granularity: 'grapheme' })` at module level.

- [ ] **Step 4: Run them and see them pass**

Run: `npx vitest run src/core/label.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing reducer tests** (add to `src/app/reducer.test.ts`, using that file's existing helpers for "on the setup screen", "controls open" and "timer done")

  - `start` with `label: '👟🚗'` on the setup screen → `state.label === '👟🚗'` and a timer exists.
  - `start` with `label: '📺🛏️💤👟🚗🛝'` → `state.label === '📺🛏️💤👟'`.
  - `start` with `label: ''` → `state.label === ''`.
  - `start` with an invalid duration (30 seconds) and `label: '👟'` → the same state object is returned (no label set).
  - `start` while a timer is already showing, with a different label → the same state object is returned.
  - `pause`, `resume` and `add-time` (controls open) → `label` unchanged.
  - `stop` (controls open) → `timer === null` and `label === ''`.
  - A done timer and the right code on the keypad → `timer === null` and `label === ''`.

- [ ] **Step 6: Write the failing storage tests** (add to `src/app/storage.test.ts`)

  - `serializeState` output, parsed, has `label` equal to the state's label.
  - Round trip: a state with a running timer and `label: '🛏️💤'` → `parsePersisted(serializeState(state))` gives the same timer and label.
  - Saved data with a valid timer and **no** `label` key → the timer is kept and `label === ''`.
  - Saved data with a valid timer and `label: 42` → timer kept, `label === ''`.
  - Saved data with a valid timer and a 5-symbol label → timer kept, `label === ''`.
  - Saved data with `timer: null` and `label: '👟'` → `label === ''` (no timer, no label).
  - `parsePersisted(null)` → `label === ''`.

- [ ] **Step 7: Run both files and see the new tests fail**

Run: `npx vitest run src/app/reducer.test.ts src/app/storage.test.ts`
Expected: FAIL on the new cases (and type errors on `label`).

- [ ] **Step 8: Implement.**
  - `state.ts`: the three type changes and `DEFAULT_PERSISTED` / `initialState` above.
  - `reducer.ts`: `onStart` sets `label: clampLabel(action.label)` together with the timer. Both places that set `timer: null` (`onStop`, and the done-timer branch of `submitKeypad`) also set `label: ''`. No other handler touches `label`.
  - `storage.ts`: `serializeState` writes `label`. `parsePersisted` returns `label` as the saved value when a timer was restored **and** `isValidLabel` accepts it, otherwise `''`. A bad label never discards the timer.
  - Stopgap so the project still compiles: the three `dispatch({ type: 'start', ... })` calls in `src/ui/setupView.ts` pass `label: ''`, and the matching expectations in `src/ui/setupView.test.ts` are updated. Task 2 replaces these. Fix any other test fixture that now lacks `label`.

- [ ] **Step 9: Run everything**

Run: `npm run typecheck` then `npm run test:coverage`
Expected: no type errors; all tests pass; coverage at or above 80%.

- [ ] **Step 10: Commit**

```bash
git add src/core src/app src/ui/setupView.ts src/ui/setupView.test.ts
git commit -m "feat: add the emoji label to timer state and saved data"
```

---

### Task 2: The "What for?" section and the line under the time

**Files:**
- Modify: `src/ui/setupView.ts`, `src/ui/setupView.test.ts`, `src/ui/timerView.ts`, `src/ui/timerView.test.ts`, `src/ui/styles/setup.css`, `src/ui/styles/timer.css`, `e2e/layout.spec.ts`, `e2e/helpers.ts`
- Maybe modify: `src/ui/styles/lock.css` (only if the label needs a rule while the lock panel is open)

**Interfaces:**
- Consumes (from Task 1): `QUICK_PICKS`, `MAX_LABEL_SYMBOLS` (`src/core/constants.ts`); `clampLabel`, `symbolsOf` (`src/core/label.ts`); `AppState.label`; the `start` action's `label`.
- Produces (DOM contract, used by Task 3's journeys):
  - Start screen: `[data-testid="label-input"]` (an `<input type="text">`, `aria-label="What for"`, `autocomplete="off"`), and one `<button>` per quick pick with `data-testid="pick-<id>"` (`pick-tv`, `pick-bed`, `pick-shoes`, `pick-slide`), whose text is the pick's `label` and whose `aria-label` is its `name`.
  - Timer screen: `[data-testid="timer-label"]`, inside the ring under the digits. Hidden (`hidden` attribute) when the label is empty. Its `textContent` is exactly the label.
  - `e2e/helpers.ts`: `export const timerLabel = (page: Page): Locator => page.getByTestId('timer-label');` and `export async function setLabel(page: Page, text: string): Promise<void>` (fills `label-input`).

**Behavior to build:**

*Start screen (`setupView.ts`)*
- A new first section, headed `What for?`, above `How long?`. It holds the text box, then the row of four quick-pick buttons.
- On the box's `input` event, its value becomes `clampLabel(value)`, except while `event.isComposing` is true.
- Tapping a quick pick sets the box's value to that pick's `label`, replacing what was there.
- All three starts (preset, custom minutes, until a time) dispatch `label: <the box's value now>`. This replaces Task 1's `label: ''` stopgap.
- The box is emptied when a timer starts: in `update`, when `state.timer` goes from `null` to not `null`. Any other `update` call leaves the box alone.
- Keep `createSetupView` and every other function under 50 lines (extract a `whatFor(...)` builder like the existing `customMinutes`).

*Timer screen (`timerView.ts`, `timer.css`)*
- The label is drawn under the digits, inside the ring, one element per symbol (`symbolsOf`) so the symbols can be spaced evenly; the line is centred.
- The digits must not move or shrink. Hang the label below them the way `.times-up` hangs today (absolutely positioned from the readout), so the readout's own box is still just the digits.
- At "Time's up!" the label stays and "Time's up!" sits beneath it. With no label, "Time's up!" sits exactly where it does today.
- The label's DOM is rebuilt only when the label changes, not on every animation frame.
- Size the label as a share of `--ring-size`, as large as the fit tests below allow and not under 9% of the ring's diameter. The ring's inner edge is 42% of the diameter from the centre. If the label and "Time's up!" cannot both fit at today's "Time's up!" size, "Time's up!" may be smaller **only when a label is showing**.

*Start screen look (`setup.css`)*
- The quick-pick buttons are at least 56 px tall and 44 px wide, four across at every width from 393 px up, in the style of the existing buttons. The box matches the existing `.field` inputs, with a placeholder such as `Emojis`.

- [ ] **Step 1: Write the failing unit tests for the start screen** (add to `src/ui/setupView.test.ts`, using that file's existing mounting helper and fake clock)

  - The first `.setup-label` heading reads `What for?` and the second `How long?`.
  - `label-input` exists, is empty, and has `aria-label="What for"`.
  - Typing `📺🛏️💤👟🚗` and firing `input` → the box's value is `📺🛏️💤👟`.
  - An `input` event with `isComposing: true` leaves the typed value untouched.
  - The four buttons exist in the order `pick-tv`, `pick-bed`, `pick-shoes`, `pick-slide`; `pick-bed` has text `🛏️💤` and `aria-label="Bed and zzz"`.
  - Clicking `pick-shoes` → box value `👟🚗`. With `📺` already typed, clicking `pick-slide` → box value `🛝` (replaced, not added).
  - With the box at `👟🚗`: clicking `preset-5` dispatches `{ type: 'start', durationMs: 300000, label: '👟🚗' }`; a custom start of `10` dispatches `label: '👟🚗'`; an until-time start dispatches `label: '👟🚗'`.
  - With the box empty, `preset-5` dispatches `label: ''`.
  - `update` with a state whose timer is still `null` (for example after a ring-direction change) leaves a typed `👟` in the box.
  - `update` with a state whose timer has just become running empties the box.

- [ ] **Step 2: Write the failing unit tests for the timer screen** (add to `src/ui/timerView.test.ts`)

  - Label `''` → `timer-label` is in the DOM and `hidden`.
  - Label `👟🚗` → `timer-label` is not hidden, its `textContent` is `👟🚗`, and it has exactly 2 child elements.
  - Label `<b>hi` → `textContent` is `<b>hi` and the element contains no `<b>` element.
  - Timer done with label `🛏️💤` → both `timer-label` and `times-up` are showing.
  - Two `update` calls with the same label → the first child element is the same node both times.
  - Changing the label between updates (`👟` then `🛝`) → `textContent` follows.

- [ ] **Step 3: Run both files and see the new tests fail**

Run: `npx vitest run src/ui/setupView.test.ts src/ui/timerView.test.ts`
Expected: FAIL on the new cases.

- [ ] **Step 4: Implement the start screen and the timer screen** as described under "Behavior to build", then re-run Step 3's command. Expected: PASS.

- [ ] **Step 5: Write the failing layout tests** (add to `e2e/layout.spec.ts`, reusing its `measure`, `expectInViewport`, `expectNoScroll`, `overlaps` and viewport constants; extend `measure`/`Geometry` or add a sibling helper so the boxes of `timer-label` and `times-up` are read the same way as the digits)

  Add a helper `expectBoxInsideRing(box, g, what)` that checks all four corners against `g.innerRadius` (generalising `expectDigitsInsideRing`).

  For each of `PHONE_PORTRAIT`, `PHONE_LANDSCAPE`, `TABLET`, `TV`, with the label `📺🛏️💤👟` (4 symbols):
  - `05:00` and `1440:00`: the label is inside the ring; it does not overlap the digits; the digits' centre is within 1 px of the ring's centre; the digits' box is the same size (within 0.5 px) as in a run with no label at that viewport.
  - At "Time's up!" (start a 1-minute timer, `page.clock.runFor(60_000)`, then `nextFrame`): the label and `times-up` are both inside the ring, and none of digits, label and `times-up` overlap.
  - With no label at "Time's up!": `times-up` is inside the ring (pins today's placement).

  For each of `PHONE_PORTRAIT`, `PHONE_LANDSCAPE`, `TV`, with the same label and `1440:00`: with the keypad overlay open and then the controls open, the label is inside the ring and not covered by the panel.

  The existing "setup screen: no sideways scroll, big enough targets" test already measures every button and input on the start screen, so it now also covers the box and the quick picks. Do not weaken it.

- [ ] **Step 6: Run the layout tests and fix the CSS until they pass**

Run: `npx playwright test e2e/layout.spec.ts --project=chromium --project=webkit`
Expected: the new cases FAIL before the CSS is right and PASS after; every existing case still passes.

- [ ] **Step 7: Run everything**

Run: `npm run typecheck`, `npm run test:coverage`, `npm run test:e2e`
Expected: no type errors; all unit tests pass with coverage at or above 80%; every browser journey passes.

- [ ] **Step 8: Commit**

```bash
git add src/ui e2e
git commit -m "feat: add the What for section and the emoji line under the time"
```

---

### Task 3: Journeys, README and decisions log

**Files:**
- Modify: `e2e/timer.spec.ts`, `e2e/persistence.spec.ts`, `e2e/lock.spec.ts`, `README.md`, `docs/decisions-log.md`

**Interfaces:**
- Consumes (from Task 2): `label-input`, `pick-tv` / `pick-bed` / `pick-shoes` / `pick-slide`, `timer-label`; `timerLabel(page)` and `setLabel(page, text)` from `e2e/helpers.ts`; the existing helpers `readyApp`, `startCustom`, `openControls`, `holdToOpen`, `enterCode`, `nextFrame`, `CODE`.
- Produces: nothing later tasks use.

- [ ] **Step 1: Write the journeys** (each in the file named, in that file's existing style; each should fail only if the feature is broken, so confirm at least two of them go red by temporarily breaking the feature, and say which in the report)

  `e2e/timer.spec.ts`
  - Quick pick, then preset: tap `pick-shoes`, tap `preset-5` → the timer shows `05:00` and `timer-label` shows `👟🚗`.
  - Typed emojis with custom minutes: `setLabel(page, '🛝')`, `startCustom(page, '15')` → `timer-label` shows `🛝`.
  - Until a time carries the label too.
  - No label: `preset-5` alone → `timer-label` is hidden.
  - Too many: filling the box with `📺🛏️💤👟🚗🛝` leaves `📺🛏️💤👟` in the box, and that is what the timer shows.
  - Tapping the label on the running timer does nothing: the label, the digits and the screen are unchanged.

  `e2e/persistence.spec.ts`
  - Reload mid-timer with label `🛏️💤` → after the reload the timer still shows `🛏️💤`.
  - Saved data from the current version: before the page loads, put a running timer and a code into `localStorage` under `kidstimer.v1` **without** a `label` key (follow how the corrupt-data journey seeds storage) → the timer shows, and `timer-label` is hidden.

  `e2e/lock.spec.ts`
  - Pause, resume and +1 min keep the label showing.
  - Stop, then the start screen: `label-input` is empty; starting `preset-5` now shows no label.
  - "Time's up!" with a label: both show; the code then returns to the start screen with an empty box.

- [ ] **Step 2: Run the journeys**

Run: `npm run test:e2e`
Expected: every journey passes in Chromium, WebKit and the offline project.

- [ ] **Step 3: Update `README.md`** (plain language, same voice as the rest)

  - Opening paragraph: one sentence saying a line of emojis under the time can show what the timer is for.
  - "Using it": a new first step, **What for** — type up to 4 emojis, or tap one of the four ready-made sets (TV; bed and zzz; shoes and car; slide); leave it empty for no line; it must be chosen before tapping a preset, because presets start at once; it cannot be changed while the timer runs (stop and start again). Renumber the steps.
  - A tip on typing emojis on the MacBook: Control + Command + Space opens the emoji picker.
  - "Known limits": the slide emoji needs a recent system (iOS 15.4 or macOS 12.3 and later); on an older one it shows as an empty box.
  - "Device checklist", two new lines: on each device the four ready-made sets show as pictures, not empty boxes; mirrored to the TV, the emojis can be read from across the room.

- [ ] **Step 4: Update `docs/decisions-log.md`**

  The section `## Emoji line` already exists with the planning entries (34 to 38). Add, numbered on from the last entry there, one entry per judgment call made in Tasks 1 to 3 that the spec and those entries did not settle. It must include at least: the final size of the emojis, and what happens to "Time's up!" when a line is showing. Entries already added by earlier tasks stay as they are.

- [ ] **Step 5: Run everything one last time**

Run: `npm run typecheck`, `npm run test:coverage`, `npm run build`, `npm run test:e2e`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add e2e README.md docs/decisions-log.md
git commit -m "test: add emoji line journeys and document the feature"
```
