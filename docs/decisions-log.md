# Decisions log

Decisions made for the owner while building on autopilot (from 2026-11-22).
Each entry: the situation, what was chosen, and why. Nothing here was ruled by
the owner; any of it can be reversed.

Decisions made *before* approval are in the design
(`docs/superpowers/specs/2026-11-22-kids-timer-design.md`), tagged "(my call)".

## Planning

1. **Build plan was not held for review.**
   - Situation: the planning process normally waits for the owner to read the plan.
   - Chose: go straight to building.
   - Why: the owner said "you're on auto pilot until the whole implementation plan is done."

2. **Real-device checks moved to the end.**
   - Situation: the design made "prove ngrok on the real iPhone and iPad" the first milestone. That needs the owner's hands.
   - Chose: build everything, verify on this Mac, and leave a device checklist in the README.
   - Why: autopilot. Risk accepted: if the ngrok route fails on the devices, the fix comes after the build, not before.

3. **ngrok was not installed or signed in on this Mac.**
   - Situation: `ngrok` is not on this machine, and using it needs the owner's account token.
   - Chose: write the share command and its instructions, but do not install ngrok or touch the account.
   - Why: installing software and using account credentials are the owner's to do. Consequence: the tunnel itself is untested.

4. **No existing project reused.**
   - Situation: standing rule says search for existing work first. Searched GitHub for kids/visual countdown timers and timer web apps.
   - Chose: build fresh on standard tools (Vite, vite-plugin-pwa).
   - Why: the matches were tiny, unlicensed or copyleft, and none had a child lock or the ding schedule.

5. **The passcode is stored as plain digits on the device.**
   - Situation: it could be scrambled before saving.
   - Chose: store it as is, and tell the owner in the README not to reuse a bank or phone PIN.
   - Why: with only 10,000 possible codes, scrambling protects nothing, and it is a child lock, not security.

6. **"Missed dings are not replayed" is implemented as a 2-second rule.**
   - Situation: the app has to tell "the page was asleep" from "a normal moment passed."
   - Chose: if more than 2 seconds passed since the last check, stay silent.
   - Why: simple, and it also keeps the end tune from blaring when a sleeping tablet is woken later.

7. **Screen is kept awake only while a timer is counting.**
   - Situation: the design says "while a timer is running."
   - Chose: paused and "Time's up!" screens let the device sleep normally.
   - Why: otherwise a finished timer would hold a tablet awake all night.

8. **On the MacBook, holding Space or Enter for 2 seconds also opens the keypad.**
   - Situation: the design requires the lock to work from the keyboard.
   - Chose: a 2-second key hold, same length as the press-and-hold.
   - Why: matches the touch gesture and is just as unlikely by accident.

9. **Dings get slightly more insistent near the end.**
   - Situation: the design left the sounds to the builder.
   - Chose: one note at 15 and 10 minutes, two at 5 and 3, three at 1, then a short rising tune.
   - Why: kids can hear "closer" without looking.

10. **Adding time cannot push a timer past 24 hours left.**
    - Situation: the design caps new timers at 24 hours but says nothing about +1/+5.
    - Chose: the button does nothing if it would pass 24 hours.
    - Why: keeps one rule for the longest timer.

11. **iPhone silent switch: one built-in setting is used, untested.**
    - Situation: the design asks for a workaround "if a reliable way exists."
    - Chose: ask Safari to treat the app's sound as media playback where it supports that.
    - Why: it is a one-line, harmless request. Whether it works is on the device checklist.

12. **A small marker records the last sound played.**
    - Situation: automated tests cannot hear.
    - Chose: the page notes "ding-5", "tune" and so on in an invisible attribute.
    - Why: lets the tests prove the right sound fired at the right moment. Nothing visible changes.

13. **Wording of on-screen messages was fixed in the plan.**
    - Situation: the design left wording to the builder.
    - Chose: short plain sentences such as "At least 1 minute." and "Those didn't match. Try again."
    - Why: tests and screens need to agree on exact text.

## Building

(entries added below as the build proceeds)

14. **Test settings live in the one Vite config file, limited to unit tests.**
    - Situation: later tasks add browser tests under e2e/ that must not run as unit tests.
    - Chose: the unit-test runner only looks at src/**/*.test.ts, and its settings sit in vite.config.ts.
    - Why: one config file, and the two kinds of test can never get mixed up.

15. **"Until a clock time" never counts more than 24 hours, even on a clock-change day.**
    - Situation: on the night the clocks go back, "the same time tomorrow" is really 25 hours away, but the longest timer is 24 hours.
    - Chose: the wait is capped at 24 hours.
    - Why: keeps the timer inside its one hard limit; it only matters for a target set to exactly now on that one night.

16. **Changing the code does not count wrong guesses toward the 30-second wait.**
    - Situation: the change-code screen asks for the current code, and the plan only gives the lock rules to the main keypad.
    - Chose: a wrong current code just shows "That's not the current code." and starts that step over.
    - Why: the screen is only reachable after the parent already opened the controls with the code, so a second lock adds nothing.

17. **Deleting a keypad digit counts as touching the keypad, and unreadable saved data is reported.**
    - Situation: the plan says typing a digit restarts the 10-second idle wait, but says nothing about the delete key or about saved data that cannot be read.
    - Chose: the delete key also restarts the wait; saved data that is not valid JSON, or cannot be read or written, starts the app fresh and writes one warning to the console.
    - Why: a child-proof keypad should not close on a parent who is still pressing keys, and a silent fallback would hide a real problem.

18. **The 30-second wait after three wrong codes is not saved.**
    - Situation: a reviewer noted that closing and reopening the app clears the wait.
    - Chose: leave it that way.
    - Why: a young child cannot close and reopen a full-screen home-screen app to dodge it, and the code itself (1 in 10,000) is the real protection. Reversible if the kids prove craftier.

19. **The four stage colors.**
    - Situation: the design left the exact colors to the builder: colorful and playful, cool while there is plenty of time, warmer near the end, celebratory at zero, and digits readable across a room.
    - Chose: bright backgrounds with very dark digits. Sky blue while calm, sunny orange at 5 minutes, coral red at 1 minute, party purple at "Time's up!". The ring is a deep shade of the same color, and the part of the ring already used up is a pale shade.
    - Why: dark numbers on a bright color read best from across a room, and only a bright background keeps orange looking orange (white numbers would need it so dark it turns brown). Every stage passes the strictest common readability standard for its digits (7 to 1 or better). Coral rather than siren red, so the last minute feels urgent without being alarming. Purple follows coral naturally, so the change at zero fades through pink instead of a muddy brown.

20. **How big the digits are, and where "Time's up!" goes.**
    - Situation: the digits must always sit inside the ring, from `05:00` to `1440:00`, on a phone, a tablet and the TV.
    - Chose: a thick, round-ended ring, with digits sized as a share of the ring that steps down for 6 and 7 characters, leaving a margin for fonts with wider numbers. "Time's up!" appears in smaller letters under the digits, inside the ring.
    - Why: checked in Chrome at phone, tablet and TV sizes, and against the Safari font's measurements; the digits use at most about 86% of the room inside the ring. The digits stay exactly centered, so nothing jumps when the timer ends.

21. **Setup and code screens: what the keypad shows, and a few small choices.**
    - Situation: the plan fixes the layout but not the look of the keys, the preset button text, or how the screens fit a phone and a laptop.
    - Chose: digit keys are plain circles with no pressed, hover or focus look, so only the row of dots shows a touch; the delete key shows a backspace symbol with no circle. Preset buttons read "5 min", "10 min", "15 min", "30 min", two across on a phone and four across on a wide screen. Both screens use the calm sky-blue colors. The "Cancel" button on the code screen is hidden on first run, when there is no code to go back to.
    - Why: the kids can read digits, so nothing may reveal which key was touched. Big buttons (at least 56 px, presets 88 px) suit an adult in a hurry and meet the 44 px touch minimum. Two across fits a 393 px phone without sideways scrolling.

22. **How the lock looks and behaves on screen, and a few small choices.**
    - Situation: the plan fixes what the keypad and the controls contain, but not where they sit, how the timer makes room, or what happens with two fingers or modifier keys.
    - Chose: on a portrait screen the keypad or controls fill a panel along the bottom and the ring shrinks into the space above it; on a landscape screen the panel runs down the right side and the ring sits to its left. The keypad and the controls use the same panel size, so the timer does not jump when the right code turns the keypad into the controls. The panel is a plain colored backdrop; keys still show no pressed look. A second finger touching down cancels the hold, and the hold stays cancelled until every finger is lifted. Holding Space or Enter for 2 seconds on the timer screen opens the keypad, and keyboard shortcuts with Command, Control or Option held are left alone.
    - Why: a side panel is the only way a 4-row keypad fits a phone held sideways (393 px tall) with the digits still fully visible. Two small hands often land together, so a second finger should never count as a deliberate hold. Leaving browser shortcuts alone keeps the laptop usable. Layout is not checked by the unit tests; Task 10 checks it in real browsers.

23. **How the dings and the tune sound.**
    - Situation: the design left the exact sounds to the builder: friendly, short, clearly different from each other, never harsh. Entry 9 already fixed how many times each ding rings.
    - Chose: a ding is a soft, pure bell note, the same pitch every time: once at 15 and 10 minutes, twice at 5 and 3, three times at 1 minute, and always over in under a second and a half. The tune at zero has a brighter music-box sound: it climbs a cheerful chord, skips back one step, and ends on a long high note, about two and a half seconds in all. Volume stays moderate and no note is very low or very high.
    - Why: one familiar bell lets the kids learn "that's the timer", and more rings (not louder or higher ones) say "getting close". A different sound for the tune means the end is never mistaken for another ding. A side effect of entry 11: on an iPhone, a ding may pause music playing in another app.

24. **"Tap for sound": what counts as the tap, and where the note sits.**
    - Situation: browsers keep a page silent until someone touches it. The plan says a press or a key turns sound on, but iPhones and iPads only allow it when a finger lifts.
    - Chose: a press, a finger lift or a key press anywhere on the page turns sound on. The note sits in the top-left corner, which the ring never reaches, and touches pass straight through it to the timer. If the device later pauses the page's sound (after a phone call, for example), the note comes back and one more tap fixes it.
    - Why: listening for the lift as well is what makes it work on the iPhone and iPad. The corner keeps the digits and the ring clear. The note only shows when it is true. Whether sound really comes back with one tap on the iPhone and iPad is on the device checklist.

25. **Two behind-the-scenes choices made while connecting the pieces.**
    - Situation: the plan lists the files for this step, but not where "which screen is showing" gets decided, or what to do when a device refuses to keep the screen on.
    - Chose: the screen switching lives in its own small file with its own tests (`src/app/shell.ts`), so the start-up file stays short. If a device refuses to keep the screen awake, the app writes one warning and asks again the next time the timer comes back to the front, instead of asking over and over.
    - Why: the start-up file is the one part the automatic tests do not cover, so anything that can go wrong belongs elsewhere. Asking four times a second would flood the console without helping.

26. **How the timer saves itself for offline use, and its icon.**
    - Situation: the plan says to make the app installable and work with no network, but not how updates reach a device, or what the icon looks like.
    - Chose: the saved copy updates itself when the app is opened while online, with no button or question (the app may reload once by itself when a new version arrives). The icon is a thick blue ring on the same sky-blue as the calm screen, drawn once as a picture file and turned into the sizes each device needs (the home screen and "maskable" versions have a little extra blue around the ring so nothing is cut off by rounded corners). The offline copy is only built for the finished app, never when the app is being worked on.
    - Why: a parent should never have to answer an "update?" prompt, and the timer keeps its place when a page reloads (entry about saved state), so an update that reloads the app once will not lose a running timer. The calm color matches what the kids see when the timer starts.

27. **The `npm start` command.**
    - Situation: the plan names `npm start` for the MacBook but not exactly what it does.
    - Chose: it builds the app and then serves it on port 4173, and refuses to start if that port is taken.
    - Why: the same address every time, so the MacBook's saved copy and the ngrok copy are never confused with a different port.
