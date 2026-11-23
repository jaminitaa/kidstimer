# Kids Timer

A countdown timer for the kids. It shows a big colored ring and the minutes and seconds left. The ring turns from blue to orange to red as time runs out, rings a soft bell at 15, 10, 5, 3 and 1 minutes left, and plays a short tune at zero. A line of up to 4 emojis under the time can show what the timer is for.

While a timer is running, touching the screen does nothing. Only a grown-up with the 4-digit code can pause it, add time, or stop it.

It runs on three devices: the iPhone, the iPad and the MacBook (which is mirrored to the TV). Nothing is sent over the internet while it runs, and nothing is stored anywhere except on each device.

Some words used below:

- **Terminal**: the app on the MacBook where you type commands. Open it from Spotlight (Command + Space, type "Terminal").
- **ngrok**: a free service that gives the MacBook a private web address so the iPhone and iPad can reach it once.
- **Home screen app**: a copy of the timer saved on the iPhone or iPad, with its own icon.

## Run it on the MacBook

You need Node.js installed (version 22 or newer).

1. In the Terminal, go to this folder.
2. Type `npm install` and press Return. You only do this once.
3. Type `npm start` and press Return. It builds the timer and starts it.
4. Open `http://localhost:4173` in Safari or Chrome.
5. To show it on the TV, mirror the MacBook screen (Control Center, then Screen Mirroring). Sound goes to the TV when you mirror.

Press Control + C in the Terminal to stop it.

## Put it on the iPhone and iPad

You do this once per device. After that the MacBook can be off, and the timer works with no internet, for example at the playground.

1. Install ngrok: type `brew install ngrok` in the Terminal.
2. Make a free account at ngrok.com. In your ngrok dashboard, copy your authtoken and run `ngrok config add-authtoken YOUR_TOKEN` (use your real token).
3. In the ngrok dashboard, claim your free fixed domain. It looks like `your-name.ngrok-free.app`.
4. In this folder, copy the example settings file: `cp .env.example .env.local`
5. Open `.env.local` in any text editor and replace the example with your fixed domain. This file stays on your computer and is never saved to git.
6. Type `npm run share` and press Return. Wait until ngrok's screen shows a line starting with `Forwarding` and your address, `https://your-name.ngrok-free.app`. That is the address to open.
7. On the iPhone or iPad, open that address in Safari.
8. If ngrok shows a warning page, tap the button to continue to the site.
9. Safari now shows "Choose a 4-digit code". You do not need to set it here: a code set in Safari does not carry over to the home screen app. Go straight on to the next step.
10. Tap the Share button, then **Add to Home Screen**, then **Add**.
11. Open the timer from its new home screen icon, **while still online**. This lets it save itself for offline use.
12. Set the 4-digit code when asked. This code, set inside the home screen app, is the one that counts. Now the MacBook can stop sharing (Control + C).

## Using it

1. **What for** (optional): type up to 4 emojis in the "What for" box, or tap one of the four ready-made sets (TV; bed and zzz; shoes and car; slide). They show under the time while the timer runs. Leave the box empty for no line. Do this before tapping a preset, because presets start at once. The line cannot be changed while the timer runs: stop it and start again. The box is empty again each time a timer starts.
   - Tip: on the MacBook, press Control + Command + Space to open the emoji picker while the cursor is in the "What for" box.
2. **Presets**: tap 5, 10, 15 or 30 minutes to start right away.
3. **Custom**: enter any whole number of minutes from 1 to 1440 (24 hours).
4. **Until a time**: pick a clock time, and the timer counts down to it.
5. **Ring direction**: choose whether the ring empties or fills as time passes.
6. **While it runs**: touching does nothing. To open the keypad, press and hold anywhere for 2 seconds with one finger. It will not open while another finger (or a child's hand) is also on the screen. On the MacBook, click and hold, or hold Space or Enter.
7. Enter the code on the keypad. The keys are plain circles with no numbers, laid out like a phone. On the MacBook you can type the digits instead.

```
  1    2    3
  4    5    6
  7    8    9
       0    ⌫
```

8. **Controls** after the right code: Pause or Resume, add 1 minute, add 5 minutes, or Stop. Stop takes you back to the start screen.
9. The keypad and the controls close by themselves after 10 seconds without a touch.
10. When time is up, "Time's up!" shows until you enter the code. That takes you back to the start screen.

Tip: on the iPhone and iPad a child can still swipe out of any app, the timer included. To lock the device to the timer, turn on Guided Access (Settings, then Accessibility, then Guided Access), open the timer, and triple-click the side button (or the Home button) to start it.

## The code

- The first time the timer opens on a device, you choose a 4-digit code and enter it twice.
- Each device has its own code.
- To change it, use "Change code" on the start screen. It asks for the current code first.
- After 3 wrong codes in a row, the keypad will not open for 30 seconds.
- If you forget the code on the iPhone or iPad: delete the home screen app (press and hold its icon, then Remove App) and add it again using the steps above. This also clears any running timer.
- If you forget the code on the MacBook: remove the website data for `localhost` in the browser's settings (Safari: Settings, then Privacy, then Manage Website Data; Chrome: Settings, then Privacy and security, then Site settings, then the data stored by sites). Find `localhost` and remove it. This also clears any running timer.
- Safari on a Mac may forget the code if the timer has not been opened for about a week. Just set it again when asked, or use Chrome, which keeps it.
- Do not use a bank PIN or your phone passcode. The kids may watch you type it.
- Avoid easy codes, such as one digit four times (1111). A child tapping the same circle four times is the likeliest accident.

## Known limits

- The bells only sound while the timer is open and on screen. If the phone is locked or another app is in front, it is silent. At the playground, keep the phone open on the timer.
- The TV shows the MacBook screen, so sound comes out wherever the mirroring sends it. Normal screen mirroring sends it to the TV.
- On an iPhone, the silent switch may mute the bells. Flip it to ring if you hear nothing.
- Browsers keep a page silent until someone taps it. If you reopen the timer while it is running, a small "tap for sound" note shows in the top-left corner. Tap once anywhere.
- The slide emoji needs a recent system (iOS 15.4 or macOS 12.3 and later). On an older one it shows as an empty box.

## Updating

1. On the MacBook, type `npm run share` in this folder.
2. On the iPhone or iPad, open the home screen app while online. It picks up the new version by itself. If a timer is running, it waits and the new version shows the next time you open the app, so a running timer is never interrupted. If it still looks old, close it fully and open it once more.

## If something goes wrong

- **"ngrok is not installed"**: run `brew install ngrok`.
- **"KIDSTIMER_NGROK_DOMAIN is not set"**: check that `.env.local` exists in this folder and has your domain in it.
- **ngrok says it does not know `--url`**: your ngrok is older. Update it with `brew upgrade ngrok`. Older versions call the same setting `--domain`.
- **"Port 4173 is already in use"**: another copy is still running. Press Control + C in its Terminal window, or restart the MacBook.
- **The address shows a blocked-host error**: ngrok was started some other way than `npm run share`, with an address that is not the one in `.env.local`. Stop it, then use `npm run share`, which always gives ngrok and the timer the same address.

## Running the tests

You do not need the tests to use the timer. They are there to catch mistakes when something is changed. Run them in the Terminal, in this folder.

1. `npm test` checks the timer's rules. It takes a few seconds.
2. `npm run test:coverage` runs the same checks and says how much of the timer they cover. It fails if any part is under 80%.
3. `npm run test:e2e` opens the timer in two browsers, Chrome and Safari's engine (standing in for the iPhone and iPad), and uses it the way a parent would: setting the code, starting timers, the lock, reloading, phone and TV screen sizes, and opening with no network. It takes a few minutes.
   - The first time, download the two test browsers with `npx playwright install chromium webkit`.
   - It needs ports 5173 and 4174 free. If `npm run dev` is running, stop it first (Control + C).
   - If a check fails, it prints which one and why.

## Choices made for you

While building, some decisions were made on your behalf where the plan did not say. They are listed in plain language in `docs/decisions-log.md`.

## Device checklist

The automatic tests cannot check these. Tick them on the real devices. After each one is what "working" looks like.

- [ ] iPhone and iPad: the ngrok address opens in Safari. Working: the timer's "Choose a 4-digit code" screen appears.
- [ ] iPhone and iPad: ngrok's warning page, if it shows, does not stop the app. Working: after tapping through it, the timer appears, not an error or a blank page.
- [ ] iPhone and iPad: Add to Home Screen works and the app opens full screen. Working: a blue ring icon on the home screen, and no Safari address bar or buttons when it opens.
- [ ] iPhone and iPad: with the MacBook off and the device in airplane mode, the home screen app still opens and runs a timer. Working: a 5-minute timer starts and counts down.
- [ ] iPhone and iPad: the screen stays awake for a 10-minute timer. Working: the screen never dims or locks before "Time's up!". Try it once more after closing and reopening the app mid-timer and tapping once.
- [ ] iPhone: the bells can be heard with the silent switch on and with it off. Working: a 2-minute timer rings at 1 minute left both ways (if not with the switch on, you know to flip it to ring).
- [ ] iPhone and iPad: after a phone call or switching apps, "tap for sound" appears and one tap brings sound back. Working: the note goes away and the next bell is heard.
- [ ] iPhone and iPad: press and hold for 2 seconds opens the keypad. Working: the keypad appears after about 2 seconds, and quick taps do nothing.
- [ ] iPhone and iPad: the keypad's circles answer to taps, and pinching does not zoom. Working: a dot fills for each tap, the right code opens the controls, each control button works, and pinching the keypad or the controls changes nothing.
- [ ] iPhone: the keypad is comfortable one-handed. Working: holding the phone in one hand, upright and sideways, your thumb reaches every key.
- [ ] MacBook: `npm start` opens at `http://localhost:4173`, and the keyboard works. Working: holding Space for 2 seconds opens the keypad, and typing the code opens the controls.
- [ ] MacBook mirrored to the TV: the dings come out of the TV. Working: the ring and digits fit the TV screen, and the 1-minute bell is heard from the TV.
- [ ] iPhone, iPad and MacBook: the four ready-made sets show as pictures. Working: the TV, the bed and zzz, the shoes and car, and the slide all appear as small pictures, not empty boxes.
- [ ] MacBook mirrored to the TV: the emojis can be read from across the room. Working: with an emoji set chosen, you can tell which one it is from the sofa.
- [ ] iPhone: with four emojis and at "Time's up!", the emoji line and "Time's up!" sit inside the ring without touching it. Working: there is a visible gap between them and the ring all the way round (the automatic check passes with only a small margin on a phone-sized screen, and real phones can draw emojis slightly larger).
- [ ] iPhone: tap the What for box, type an emoji, then tap a preset while the keyboard is still showing, upright and sideways. Working: the timer starts with the emoji and the keyboard goes away.
