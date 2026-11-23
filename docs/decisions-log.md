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
    - Why: "Change code" is on the setup screen, and the setup screen only shows when no timer exists: before one is started, or after a grown-up with the code stopped or cleared it. Someone who can reach it could just as well start, stop or set timers, so a second lock there protects nothing. (Corrected in the final review: an earlier version said the screen was only reachable after opening the controls with the code, which is not true.)

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
    - Chose: the saved copy updates itself when the app is opened while online, with no button or question. When a new version arrives, the app reloads once by itself only if there is no timer; if a timer exists (running, paused or finished), nothing happens and the new version shows the next time the app is opened. The icon is a thick blue ring on the same sky-blue as the calm screen, drawn once as a picture file and turned into the sizes each device needs (the home screen and "maskable" versions have a little extra blue around the ring so nothing is cut off by rounded corners). The offline copy is only built for the finished app, never when the app is being worked on.
    - Why: a parent should never have to answer an "update?" prompt. A reload keeps the timer's place, but it turns the sound off again until someone taps, and Safari stops keeping the screen awake, so with a timer on screen the update waits for the next open. The calm color matches what the kids see when the timer starts.

27. **The `npm start` command.**
    - Situation: the plan names `npm start` for the MacBook but not exactly what it does.
    - Chose: it builds the app and then serves it on port 4173, and refuses to start if that port is taken.
    - Why: the same address every time, so the MacBook's saved copy and the ngrok copy are never confused with a different port.

28. **A tap now also asks again to keep the screen awake.**
    - Situation: the browser tests in Safari's engine showed that Safari will not keep the screen awake for a page nobody has touched yet. When the timer is reopened onto a running timer, it asks straight away and is refused, and it used to ask again only the next time the app came back to the front.
    - Chose: after a refusal, the next tap or key press anywhere asks again, as well as the app coming back to the front. The one tap that turns sound back on ("tap for sound") now also keeps the screen awake.
    - Why: otherwise a phone reopened onto a running timer could lock itself partway through, and a locked phone plays no bells. The device checklist asks you to confirm it on the iPhone.

29. **How the browser tests are set up.**
    - Situation: the plan lists the journeys to test, but not how the tests control time, which copy of the app the "no network" test uses, or how the test servers start.
    - Chose: the tests use a pretend clock that stops at a fixed moment once the app has loaded, in a fixed time zone (UTC), so "one second later" and "until 09:30" mean exactly the same on every run and every computer. After moving the clock on, they let one more screen frame (16 thousandths of a second) pass before reading the digits, as a real screen would. The "no network" test runs only in Chrome, as a separate group with its own server: it builds the finished app and serves it on port 4174, because only the finished app saves itself for offline use; it uses the real clock. The test servers are always started fresh: if port 5173 or 4174 is already busy, the run stops instead of testing whatever is there. Headless Chrome is told it may keep the screen awake, as real browsers do.
    - Why: tests that give the same answer every time, a "no network" test of the same copy that ends up on the phone, and no chance of quietly testing a different copy of the code left running in another folder.

30. **Two details of the browser-test journeys.**
    - Situation: the plan lists the journeys to test, but two of them could be read more than one way.
    - Chose: the pause-and-resume journey opens the controls a second time (hold, then the code) before pressing Resume, because the controls close by themselves 10 seconds after Pause. The custom-minutes journey tries 0 first (refused) and then 90 (starts).
    - Why: pressing Resume without reopening would contradict the 10-second rule in the design. Trying 0 before 90 makes the same two checks without having to stop a timer in between.

31. **Changes from the final review.**
    - Situation: the final review found three faults and a few weak spots. The fixes needed some new behavior and wording the plan did not give.
    - Chose:
      - "Until a time" less than a minute away (for example 09:30 chosen at 09:29:20) does not start and says "That's less than a minute away." Exactly one minute away starts a 1-minute timer. Before, Start silently did nothing.
      - An app update reloads the page by itself only when there is no timer; otherwise it shows the next time the app is opened (entry 26).
      - The keypad and the controls can no longer be pinch-zoomed. Taps work as before. The setup and code screens can still be zoomed, because they can also be zoomed back out.
      - If a finger's lift or a key's release is lost (a phone call, the app switcher, Command-Tab), the press-and-hold forgets it when the app goes into the background or loses focus, and any hold in progress is cancelled. Before, the keypad could stop opening until the app was restarted. Coming back to the app does not cancel anything.
      - A key held down on the MacBook types its digit once, not over and over.
      - On a phone held sideways (or any landscape screen 700 pixels tall or less), the code screen is laid out like the lock panel: title, dots, message and Cancel on the left, keypad on the right. Taller screens (the iPad, the MacBook, the TV) keep the single column, which needs about 650 pixels.
      - If the browser blocks saved data entirely, the timer still works but forgets everything when closed, and says so once in the console.
      - The time left can never show more than the timer was set for, even if the device clock is set back.
      - One browser test (reopening onto a running timer, then checking the screen stays awake) failed about one run in six in Safari's engine. The app was fine: the test's own watcher was sometimes thrown away by the browser while tidying memory. The watcher now hooks in where it cannot be lost, and the test passed 40 times in a row in each browser.
    - Why: each change closes a way the timer could appear broken or be fiddled with, without adding any control to the timer screen. The message for "until a time" matches the style of entry 13. The 700-pixel line leaves a safe margin above the height the single column needs.

32. **Things the final review raised that were left as they are.**
    - Situation: the final review listed some points it would not judge, because they are a matter of taste or of how the family uses the timer.
    - Chose: leave each of these alone.
      - During the 30-second wait after three wrong codes, press-and-hold shows nothing at all: no message, no countdown. A parent who mistyped three times sees a timer that seems to ignore them for half a minute.
      - The app accepts any 4-digit code, including easy ones like 1111. The README advises against them.
      - On the iPhone and iPad, iOS still draws its own small clock (hours and minutes) at the very top of the screen. A web app cannot remove it.
      - A child can still swipe out of the timer on the iPhone or iPad. A web app cannot stop that; the README suggests iOS Guided Access.
      - On the MacBook, two browser windows open on the timer at once will overwrite each other's timer.
      - At the MacBook keyboard, Reload and Command-W work as in any browser page.
      - If Resume is pressed within a quarter of a second of a bell mark (say at exactly 5:00), that one bell can be skipped.
      - The share command still prints "Open this address…" a moment before ngrok is ready. The README tells you to wait for ngrok's own `Forwarding` line.
      - Safari on a Mac may forget the code after about a week unused. This was not tested; the README says to set it again or use Chrome.
    - Why: the design says nothing may show on the timer screen until the hold completes, and that each device runs one timer. The kids watch the TV, not the laptop keyboard. The rest are either out of a web app's reach or too rare to be worth more moving parts. Any of them can be revisited.

33. **How the last round of checks was run.**
    - Situation: after the final review, one round of fixes was made and then checked once more by a separate reviewer. The helper making the fixes stalled while repeating its own last full test run, on a Mac that was very busy with other work at the time.
    - Chose: start the second check as soon as all the fixes were saved, stop the stalled helper, and run the full set of tests directly: 303 rule checks and 111 browser journeys, all passing. One line was then added to the device checklist (the keypad's circles on a real iPhone and iPad), which no reviewer read after it was written.
    - Why: every fix was already saved and the reviewer read exactly those. Waiting on the stalled run would have added nothing.

## Emoji line

Decisions made for the owner while adding the line of emojis under the time
(from 2026-11-22). The owner approved the design
(`docs/superpowers/specs/2026-11-22-emoji-label-design.md`), where earlier
choices are tagged "(my call)". Nothing below was ruled by the owner.

34. **Build plan was not held for review.**
    - Situation: the planning process normally waits for the owner to read the plan.
    - Chose: go straight to building, on a branch of its own (`feat/emoji-label`), with nothing sent to GitHub until the owner says so.
    - Why: the owner said "you're on auto pilot until the whole implementation plan is done."

35. **New commits in this project use the GitHub no-reply address.**
    - Situation: the owner chose the no-reply address for the first Pull Request, but the computer-wide git setting would still sign new commits with a personal address.
    - Chose: set the address for this project only. The computer-wide setting is untouched.
    - Why: it keeps to what the owner already ruled for this public project without changing anything else on the computer.

36. **Spaces do not count, and are not kept.**
    - Situation: the line holds 4 symbols at most, and a parent may type a space between emojis.
    - Chose: spaces are dropped as you type; the timer screen spaces the emojis evenly by itself.
    - Why: a space should not use up one of the four places.

37. **The box empties when a timer starts.**
    - Situation: the design says the box is empty each time the start screen appears.
    - Chose: clear it at the moment a timer starts, so it is already empty when the start screen comes back.
    - Why: the same result, and nothing a parent has typed is ever wiped while they are still on the start screen.

38. **A saved line that cannot be trusted is dropped, but the timer is kept.**
    - Situation: saved data is checked when the app opens. A line that is not text, or is longer than 4 symbols, is bad data.
    - Chose: show the timer with no line.
    - Why: losing the picture is harmless; losing a running timer is not.

39. **How big the emojis are, and how they are spaced.**
    - Situation: the plan asks for the line to be as large as fits inside the ring, and never smaller than 9% of the ring's width, but leaves the exact size and spacing to the builder.
    - Chose: each emoji is 12% of the ring's width (about 44 pixels on a phone, 120 on the TV), centred under the digits with the same small gap between each pair. The digits do not move or shrink when a line is showing.
    - Why: this is close to the largest size that keeps four emojis inside the ring with a little room to spare. It was measured in Chrome and in Safari's engine on a phone held upright and sideways, a tablet and the TV, with the longest time (1440:00) and with the lock panel open. On a phone, the corners of four emojis stay about 8 pixels inside the ring in Safari's engine (which draws emojis widest) and about 16 in Chrome. Any bigger would leave almost no room for a device that draws emojis a little wider.

40. **"Time's up!" when a line is showing.**
    - Situation: the plan puts "Time's up!" under the emojis, and allows it to be smaller only if both cannot fit at its usual size.
    - Chose: "Time's up!" keeps its usual size and sits just under the emojis, a little closer to them than it sits to the digits when there is no line. With no line, it is exactly where it was before.
    - Why: both fit at the usual size, so nothing needed to shrink. On a phone, the corners of "Time's up!" stay about 8 pixels inside the ring.

41. **The "What for?" box and its four buttons.**
    - Situation: the design leaves the look of the quick picks and the box's grey hint text to the builder.
    - Chose: the box looks like the other boxes on the start screen and shows "Emojis" in grey while empty. The four quick picks sit in one row under it, four across on every screen, showing only their emojis; a screen reader reads out their names ("TV", "Bed and zzz", "Shoes and car", "Slide"). With a keyboard that builds a character in several steps (Japanese, for example), the box waits until the character is finished before keeping the first four.
    - Why: one row keeps the section short, so the time buttons stay near the top of a phone screen; each button is 81 pixels wide on the narrowest phone, well over the 44-pixel minimum. Trimming halfway through a character could cut it in two.

42. **The box is emptied by the tap that starts the timer.**
    - Situation: the plan said to empty the box when the start screen is redrawn and sees a timer has started. But the app does not redraw the start screen while a timer is on show, so that moment never comes and the box would keep the last emojis.
    - Chose: the tap that starts a timer (a preset, the minutes Start, or the time Start) sends what is in the box and then empties it. A start that is refused with a message (such as "At least 1 minute." or "That's less than a minute away.") leaves the box as it was. Nothing else empties it, so emojis typed before going to "Change code" are still there on the way back.
    - Why: this is exactly what entry 37 promises ("clear it at the moment a timer starts"), and it does not depend on the order in which the app redraws and shows its screens. The start screen checks every time before starting, so a start it sends is never turned down.

43. **The layout checks went into a file of their own.**
    - Situation: the plan named one file for the layout checks, but adding the new ones would have pushed it past the 400-line limit every file keeps.
    - Chose: the new layout checks live in their own file, and the measuring helpers both layout files use moved to a third file.
    - Why: it keeps every file under the limit without changing what any check does.

44. **Changes from the last round of fixes.**
    - Situation: the final review found small problems, none serious.
    - Chose: (a) on a browser too old to count emojis properly, the app still opens and counts the line by character instead, so a family emoji could count as several; (b) a symbol far wider or taller than an emoji is cut off at an emoji-sized box, so the line can never leave the ring or draw over the time; (c) the "What for" box no longer capitalises or autocorrects what is typed.
    - Why: (a) a blank page is far worse than a miscounted line; (b) the ring is the edge of the design, and the four ready-made sets, a family and a flag all fit in the box with room to spare; (c) the box is for emojis, and an iPhone changing the letters would only get in the way.

45. **Things the final review raised that were left as they are.**
    - Situation: the final review found nothing serious. It listed some points it would not judge, because they are a matter of taste or of how the timer is used.
    - Chose: leave each of these alone.
      - On a phone held sideways, the "What for?" section pushes the minutes box and the "until a time" box below the first screen. The four preset buttons are still on it.
      - A ready-made set cannot be taken back with one tap: there is no "none" button, and tapping the same set again does not empty the box. Deleting it needs the keyboard.
      - Emojis left in the box stay there until a timer starts, however long that is. They are in plain view at the top of the start screen.
      - The box takes anything typed, including letters. Writing that runs right to left, or whose letters join up, will not read properly in the line, and an invisible character uses up one of the four places.
      - A screen reader reads each emoji in the line but gives the line no name of its own.
      - Each emoji is drawn inside a box only a little wider than Safari draws an emoji (about 4% to spare), so that an odd, very wide symbol cannot push the line out of the ring. If a real iPhone drew emojis wider than the test browser does, their edges would be shaved. The device checklist asks you to look.
    - Why: the design puts "What for?" first, says a ready-made set replaces the box, and says the line is for emojis, not words. The rest are rare, or cannot be judged without a real device. Any of them can be revisited.
    - One line was added to the device checklist after the last check (that no emoji is cut off at its edges), so no reviewer read that line.
