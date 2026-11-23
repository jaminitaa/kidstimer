# Kids Timer: Design

Date: 2026-11-22
Status: approved by owner 2026-11-22 (spoken reminders removed from this version at approval)

Throughout this document, **(ruled)** marks something the owner decided in
conversation. **(my call)** marks something the designer filled in; the owner
has not ruled on it and may change it.

## 1. Intent and why

Young children cannot feel time passing. "15 minutes left" means nothing to
them, so every transition (leaving the house, leaving the playground, going to
bed) arrives as a surprise. The timer makes time visible and audible so the
deadline is something they watched coming, not something a parent announced.

The kids can read numbers. A parent sets the timer; the kids only watch it.

### The four situations it must serve

| # | Situation | Shape of the timer | Device |
|---|-----------|--------------------|--------|
| 1 | Morning: out of the house by a set time | Until a clock time (about 30 min) | TV or tablet |
| 2 | Leaving the playground: "15 minutes left" | A duration (15 min) | Phone, no wifi |
| 3 | Bedtime: "final 10 minutes" of play | A duration (10 min) | TV or tablet |
| 4 | Cartoons are not for daytime | Until a clock time, many hours away | TV or tablet |

In situation 4 the timer is meant to look hopelessly far away. A huge number
such as `480:00` and a ring that has barely moved are the desired effect.

## 2. Goals

- Show remaining time as minutes:seconds only. Minutes run past 59 (`90:00`,
  `480:00`). Hours are never shown. (ruled)
- A ring around the digits shows how far the timer has gone. (ruled)
- Dings mark how much time is left, and a tune marks the end. (ruled)
- Colorful, playful look. (ruled)
- Works cast to a TV, on a tablet, and on a phone with no signal.
  (TV and tablet ruled; phone/no-signal proposed by the designer from
  situation 2 and not objected to)
- Kids cannot stop or change a running timer. (ruled)

## 3. Non-goals

Not in this version:

- Accounts, sign-in, or syncing a timer between devices. (my call)
- More than one timer at once on a device. (ruled)
- Named timers, saved routines, schedules that start on their own, history.
- Alarms that fire while the app is closed or the screen is locked.
- Custom or uploaded sounds.
- Spoken reminders ("ten minutes left"). (ruled)

## 4. Anti-goals

The timer has failed, even if it technically works, if:

- A child can stop it, restart it, or add time by tapping around.
- It ever shows hours:minutes:seconds.
- It loses its place or drifts when the screen sleeps, the page reloads, or
  the tab goes to the background.
- It needs a network connection at the moment of use.
- Sounds are harsh or startling, or the screen flashes or strobes.

## 5. Behavior

### 5.1 Setup screen

The parent sees this when no timer is running.

- One-tap duration buttons: 5, 10, 15, 30 minutes. A tap starts the timer
  immediately. (my call, shown to owner, not objected to)
- "Custom": enter whole minutes, 1 to 1440. (range is my call)
- "Until a time": pick a clock time using the device's own clock and its
  12/24-hour convention. If the chosen time has already passed today it means
  that time tomorrow. Longest possible timer is 24 hours. (my call)
- On the very first open, the parent sets a passcode first. See 5.6.
- Ring direction: two buttons, "Fills up" and "Empties". (ruled) The choice is
  remembered on the device. First-ever default is "Empties". (my call)

Invalid input (empty, zero, non-numeric, over the maximum) is rejected with a
short plain message next to the field. Nothing starts.

### 5.2 Running screen

```
┌────────────────────────────────────────┐
│               ▄▄▄▄▄▄▄▄                 │
│           ▄██▀▀      ▀▀░░▄             │
│         ▄█▀                ░░          │
│        ██                   ░░         │
│        ██       12:45       ░░         │
│        ██                   ░░         │
│         ▀█▄                ▄█▀         │
│           ▀██▄▄      ▄▄██▀             │
│               ▀▀▀▀▀▀▀▀                 │
└────────────────────────────────────────┘
```

- The ring and the digits fill the screen. Nothing else is visible: no
  buttons, no hints. It must read from across a room on a TV and still fit a
  phone held upright. Landscape and portrait both work.
- Digits: `MM:SS`, minutes at least two digits and growing to three or four
  when needed (`05:00`, `480:00`, `1440:00`). The digits must stay inside the
  ring at every length. (two-digit minimum is my call)
- The display rounds remaining time up to the whole second, so a 15-minute
  timer opens on `15:00` and reaches `00:00` exactly at the end.
- Ring, "Empties" mode: the solid part is the share of time left. It starts
  as a full circle and shrinks to nothing.
- Ring, "Fills up" mode: the solid part is the share of time gone. It starts
  empty and grows to a full circle.
- The ring moves smoothly, not in one-second jumps.

### 5.3 Dings and the end

- A ding plays when the remaining time reaches 15, 10, 5, 3 and 1 minutes.
  (ruled)
- A mark is skipped when the timer starts at or below it. A 10-minute timer
  gets its first ding at 5. (ruled as "skip any that don't fit")
- At zero a short happy tune plays once (a few seconds), the screen shows
  `00:00` and "Time's up!", and it stays that way until the parent enters the
  passcode. (tune ruled; play-once and passcode-to-dismiss are my calls,
  the second following from the owner's "make it even harder" ruling)
- If time is added and the remaining time rises back above a mark, that mark
  dings again when it is next reached. (my call)
- If the device was asleep or the page was in the background while one or
  more marks passed, no missed dings are replayed on return. The screen simply
  shows the correct time and color. If the end passed, it shows "Time's up!"
  without the tune. (my call)

### 5.4 Color stages

The whole screen changes color as the end approaches. (ruled)

| Stage | When | Feel |
|-------|------|------|
| Calm | more than 5 minutes left | cool, relaxed |
| Warm | 5 minutes or less | warmer, noticeable |
| Hot | 1 minute or less | hottest, urgent but not alarming |
| Done | zero | celebratory |

The 3-minute ding has no color change of its own. (my reading of the ruling)
A timer that starts at 5 minutes or less starts in Warm. Stages change with a
smooth transition, never a flash.

### 5.5 Spoken reminders

Not in this version. (ruled at approval: "skip the spoken voice feature for
now") The owner earlier called a spoken "ten minutes left" good to have, so it
is a candidate for a later version.

### 5.6 The lock

While a timer is running, paused, or showing "Time's up!", ordinary taps do
nothing. (ruled)

The lock is a passcode keypad. (ruled; it replaced an earlier left/right tap
sequence, which random mashing could open in about 64 taps)

```
┌────────────────────────────┐
│           12:45            │
│                            │
│          ● ● ○ ○           │
│                            │
│        ◯    ◯    ◯         │
│        ◯    ◯    ◯         │
│        ◯    ◯    ◯         │
│             ◯    ⌫         │
└────────────────────────────┘
```

- The keys are plain circles with no numbers on them, laid out like a phone
  keypad: 1 2 3, 4 5 6, 7 8 9, then 0 bottom-center. Adults know the layout;
  the kids, who can read digits, get nothing to read. (ruled)
- Pressing and holding anywhere for 2 seconds brings up the keypad. Shorter
  taps do nothing. (my call, shown to owner, not ruled)
- The code is 4 digits. (my call, shown to owner, not ruled)
- Entered digits appear only as a row of dots filling in. Individual keys do
  not light up or otherwise show which one was pressed. (my call)
- A delete key removes the last digit. (my call)
- The correct code opens the parent controls. A wrong code closes the keypad.
  After 3 wrong codes in a row the keypad will not open for 30 seconds.
  (my call, shown to owner, not ruled)
- The keypad closes by itself after 10 seconds untouched. (my call)
- The timer digits stay visible and keep counting while the keypad is up.
- On the MacBook: click and hold brings up the keypad, keys can be clicked,
  and digits can be typed on the keyboard. (my call)

Setting the code:

- The first time the app is opened on a device, the parent chooses the code
  before anything else, on the same unlabeled keypad, entering it twice to
  confirm. Each device has its own code. (my call, shown to owner, not ruled)
- The setup screen has "Change code", which asks for the current code first.
  (my call)
- There is no on-screen way to reset a forgotten code. The parent removes the
  saved app from the device and adds it again, which clears the code and any
  running timer. The README explains this. (my call, shown to owner, not
  ruled)

Once past the lock:

- Parent controls: Pause / Resume, +1 minute, +5 minutes, Stop. (my call,
  shown to owner, not objected to)
- The controls close and the lock returns after 10 seconds without a tap.
  (my call)
- Stop returns to the setup screen. This is the only way to replace a running
  timer. (follows from the one-timer ruling)
- On "Time's up!", the correct code goes straight to the setup screen.

Pause freezes the remaining time and the ring. Resume continues from there.
For an "until a time" timer this moves the finish later than the clock time
originally chosen; that is accepted. (my call)

Adding time lengthens the timer's total as well as its remaining time, so the
ring stays a true share of the whole.

### 5.7 Keeping its place

- The timer is defined by the clock moment it ends, not by counting ticks.
  After sleep, reload, or backgrounding it shows the correct remaining time.
- The running timer and the parent's settings are saved on the device. Closing
  and reopening the app returns to the running (or finished) timer.
- The app asks the device to keep the screen awake while a timer is running.
- Browsers block sound until someone has tapped the page. Starting a timer
  counts. If the app is reopened onto a running timer, sound is blocked again;
  the app then shows a small "tap for sound" note, and any single tap turns
  sound back on. It does not bring up the keypad. (my call)

### 5.8 Known limits (accepted)

- Dings only play while the timer is open on screen. If the phone is locked
  or another app is in front, it is silent. At the playground the phone has to
  stay open on the timer.
- The TV shows the MacBook's mirrored screen, so sound comes out wherever the
  mirroring sends it. Normal screen mirroring sends it to the TV.
- On an iPhone the silent switch may mute the dings. The builder should check
  this on a real device and work around it if a reliable way exists.

## 6. Constraints

- Runs entirely on the device. No data leaves it. No server-side logic.
- Must work with no network after it has been opened once on that device.
- Must be reachable at a secure (https) address, because saving for offline
  use and keeping the screen awake both require one.
- Devices (ruled): an iPhone 15, an iPad Air, and a MacBook whose screen is
  mirrored to the TV. The TV never runs the app itself.
- Target browsers: Safari on iPhone and iPad, including the saved home-screen
  copy; Safari and Chrome on the MacBook. (my call, from the devices above)
- The MacBook has no touchscreen. Everything a parent does, including getting
  past the lock, must work with a trackpad click and with the keyboard.
  (my call, follows from the devices)
- The MacBook can open the app straight from itself. Only the iPhone and iPad
  need the ngrok address. (my call)
- The repository starts empty (license and .gitignore only).
- The owner's standing rules apply to the build: tests written first, 80%
  coverage, unit plus integration plus end-to-end tests, immutable data, small
  focused files, and a search for existing open-source work before writing new
  code.

## 7. Approaches

How the app reaches the devices:

| Approach | Gets | Gives up |
|----------|------|----------|
| A. Publish to a free public web host, save to each home screen | Every device, offline after first visit, screen stays awake | The page is publicly reachable |
| B. Serve from the home computer over home wifi only | Nothing leaves the house | No playground; computer must be on; no secure address, so no offline copy and the screen may sleep |
| C. A single file opened directly | Simplest | Awkward on phones and tablets; no offline copy; screen may sleep |
| **D. Serve from the home computer through ngrok** | A secure address without a public host; every device; offline after first visit | Computer and ngrok must be running the first time each device opens it, and again for updates |

**Chosen: D (ruled).** The designer recommended A; the owner has an ngrok
account and chose to use it.

How D is read (my reading, not confirmed word for word by the owner): the
built app is served from the owner's computer, ngrok exposes it at an https
address, and each device opens that address once and saves it to the home
screen. From then on the device runs its saved copy, so the timer works with
the computer off and with no signal.

Consequences the builder must handle:

- Use the fixed address that comes with the owner's ngrok account, so the
  saved copy on each device stays tied to one address. Do not hard-code it;
  read it from local configuration that is not committed.
- No ngrok token or other secret goes in the repository.
- ngrok's free plan may show a warning page on first visit. Check that the
  save-for-offline step still completes on a real device after it.
- Provide one documented command that builds the app, serves it, and opens
  the ngrok tunnel, plus a short README section on saving it to a home screen.

Order of work and fallback (my call, raised by the design reviewer):

- The first milestone is a bare page served through ngrok, saved to the home
  screen of the owner's real phone and tablet, then opened with the computer
  off. This proves approach D before anything is built on it.
- If that check fails, stop and take it back to the owner. Do not switch to
  another host or tunnel without their decision; why they preferred ngrok
  over a public host was not recorded.
- Two checks need the owner's own hands and devices: the offline save
  through ngrok (first milestone) and the iPhone silent switch.
- At approval the owner asked for the whole build to run without stopping for
  them. So these checks are not gates: build everything, verify what can be
  verified on the MacBook, and hand the owner a short device checklist at the
  end. (my call on how to square the two)

## 8. How it gets made (all my calls)

The owner spoke in outcomes and left these to the designer.

- A static web app: TypeScript, built with Vite, no UI framework.
- Installable and offline-capable (web app manifest plus a service worker;
  use an established plugin, not a hand-written worker).
- The ring is drawn as SVG.
- Dings and the tune are generated in the browser, so there are no sound
  files to download.
- Timer rules (remaining time, which marks have fired, color stage, the
  passcode lock and its lockout) live in plain functions with the clock passed in, separate from
  drawing and sound, so they can be tested without a browser.
- Unit tests with Vitest; end-to-end tests with Playwright covering: start by
  duration, start until a time, first-run code setup, the passcode lock
  (right code, wrong code, lockout), pause and add time, reload
  mid-timer, and reaching zero.

## 9. Left to the builder

- Exact colors, typeface, sizes and motion, within: colorful and playful,
  digits readable across a room, strong contrast between digits and
  background in every stage, no flashing.
- The exact sound of the dings and the tune, within: friendly, short, clearly
  different from each other, never harsh. The dings may grow slightly more
  insistent as the end nears.
- Layout of the setup screen and the parent controls.
- Wording of on-screen messages.
- File and module layout.
