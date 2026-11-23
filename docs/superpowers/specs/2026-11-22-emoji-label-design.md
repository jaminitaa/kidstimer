# Emoji line under the time: Design

Date: 2026-11-22
Status: waiting for the owner's approval
Builds on: `docs/superpowers/specs/2026-11-22-kids-timer-design.md`

**(ruled)** marks something the owner decided in conversation. **(my call)**
marks something the designer filled in; the owner has not ruled on it and may
change it.

## 1. Intent and why

The kids can read numbers but not words. A countdown tells them how long, not
what for. A line of emojis under the time shows what the timer is counting
down to, so the child can read it for themselves. (ruled)

## 2. What it does

### On the start screen

- A new first section, above "How long?", titled "What for?". (my call: it
  must come first, because a preset starts the timer the moment it is tapped)
- A text box where the parent types emojis from the device's emoji keyboard.
  (ruled)
- Under it, a row of four quick picks. Tapping one fills the box with that
  set, replacing what was there. (ruled: a text box plus quick picks; ruled:
  the four sets below. My reading of the owner's list, not ruled: each
  comma-separated item is one button, and "bed and zzz" and "shoes and car"
  are two-emoji sets. Replacing rather than adding is my call.)

  | Button | Fills the box with |
  |---|---|
  | TV | 📺 |
  | Bed and zzz | 🛏️ 💤 |
  | Shoes and car | 👟 🚗 |
  | Slide | 🛝 |

- The box holds at most 4 symbols. Typing or pasting more keeps the first 4.
  One emoji counts as one symbol even when it is built from several code
  points (a family, a flag, a skin tone). (my call: 4 is what fits inside the
  ring at a size readable across a room)
- The box accepts whatever is typed, not only emojis. (my call: filtering to
  "emoji only" is fragile and would block harmless things like a digit)
- Leaving it empty is allowed and gives today's timer with no line. (my call)
- All three ways of starting (preset, custom minutes, until a time) use
  whatever is in the box at that moment. (my call)
- The box is empty each time the start screen appears, so the last timer's
  emojis never label the next one by accident. (my call)

### On the running screen

```
      ╭────────────╮
      │   12:34    │
      │   👟 🚗    │
      ╰────────────╯
```

- The emojis sit centred under the digits, inside the ring, sized as a share
  of the ring like the digits are. The digits stay exactly centred; the line
  hangs below them the way "Time's up!" does today. (my call)
- At zero the emojis stay, and "Time's up!" moves beneath them. With no
  emojis, "Time's up!" sits where it does today. (my call)
- Everything must stay inside the ring's inner edge at every size already
  tested (phone upright and sideways, tablet, laptop/TV), with 4 emojis, with
  the longest time (`1440:00`), and with the lock panel open (smaller ring).
- The line is part of the running screen and, like the rest of it, does
  nothing when touched.

### Keeping its place

- The emojis are saved with the timer and survive a reload, sleep, pause, and
  added time. Stop and "Time's up" + code clear them with the timer. (my call)
- A timer saved by the current version (no emoji line) must still load, with
  no line.
- Saved data is checked on load like the rest: a line that is not text, or
  longer than 4 symbols, is treated as bad data the same way the existing
  rules treat a bad timer. (my call)

## 3. Non-goals

- Changing the emojis while a timer runs. Stop and start again. (my call)
- Editing or adding quick picks in the app. The four are fixed in the code;
  changing them is a one-line edit. (my call)
- Words for the kids, pictures, or reading the line aloud.

## 4. Anti-goals

- Anything a child can touch to change or remove the line while a timer runs.
- The line pushing the digits off centre, shrinking them, or spilling outside
  the ring.
- A start screen that needs the emoji line filled in before a timer can start.

## 5. Constraints

- Same stack and rules as the first build: no new dependencies; tests first;
  80% coverage; files under 400 lines; no mutation; constants in
  `src/core/constants.ts`.
- 🛝 (slide) is a newer emoji: it needs iOS 15.4 or macOS 12.3 and later. On
  an older MacBook it would show as an empty box. Known limit; goes on the
  device checklist. (my call)
- The docs are in a public repository: no family details in them.

## 6. Approaches

| | What the parent does | Trade-off |
|---|---|---|
| A. Text box only | Types from the emoji keyboard | Any emoji; clumsy on the MacBook |
| B. Ready buttons only | Taps from a fixed row | Fast; only those emojis |
| **C. Both** | Text box plus quick picks that fill it | Slightly busier start screen |

The owner chose **C**. (ruled) Reason given by the designer and not objected
to: the morning and bedtime timers run from the MacBook, where typing emojis
is the awkward case.

## 7. Left to the builder

- Where the line is stored in the app's state (on the timer, or beside it),
  and the name of the field.
- How symbols are counted (`Intl.Segmenter` is available on all three target
  devices).
- Exact sizes and spacing of the line and of "Time's up!" beneath it.
- The look of the quick-pick buttons and the placeholder text of the box.
- README and decisions-log updates, in the plain style already used there.
