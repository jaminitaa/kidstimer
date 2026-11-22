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
