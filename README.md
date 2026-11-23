# Kids Timer

A countdown timer for the kids. It shows a big colored ring and the minutes and seconds left. The ring turns from blue to orange to red as time runs out, rings a soft bell at 15, 10, 5, 3 and 1 minutes left, and plays a short tune at zero.

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
6. Type `npm run share` and press Return. Wait until it prints `Open this address on the iPhone or iPad`.
7. On the iPhone or iPad, open that address in Safari.
8. If ngrok shows a warning page, tap the button to continue to the site.
9. Tap the Share button, then **Add to Home Screen**, then **Add**.
10. Open the timer from its new home screen icon, **while still online**. This lets it save itself for offline use.
11. Set the 4-digit code when asked. Now the MacBook can stop sharing (Control + C).

## Using it

1. **Presets**: tap 5, 10, 15 or 30 minutes to start right away.
2. **Custom**: enter any whole number of minutes from 1 to 1440 (24 hours).
3. **Until a time**: pick a clock time, and the timer counts down to it.
4. **Ring direction**: choose whether the ring empties or fills as time passes.
5. **While it runs**: touching does nothing. To open the keypad, press and hold anywhere for 2 seconds. On the MacBook, click and hold, or hold Space or Enter.
6. Enter the code on the keypad. The keys are plain circles with no numbers, laid out like a phone. On the MacBook you can type the digits instead.

```
  1    2    3
  4    5    6
  7    8    9
       0    ⌫
```

7. **Controls** after the right code: Pause or Resume, add 1 minute, add 5 minutes, or Stop. Stop takes you back to the start screen.
8. The keypad and the controls close by themselves after 10 seconds without a touch.
9. When time is up, "Time's up!" shows until you enter the code. That takes you back to the start screen.

## The code

- The first time the timer opens on a device, you choose a 4-digit code and enter it twice.
- Each device has its own code.
- To change it, use "Change code" on the start screen. It asks for the current code first.
- After 3 wrong codes in a row, the keypad will not open for 30 seconds.
- If you forget the code: delete the home screen app (press and hold its icon, then Remove App) and add it again using the steps above. This also clears any running timer.
- Do not use a bank PIN or your phone passcode. The kids may watch you type it.

## Known limits

- The bells only sound while the timer is open and on screen. If the phone is locked or another app is in front, it is silent. At the playground, keep the phone open on the timer.
- The TV shows the MacBook screen, so sound comes out wherever the mirroring sends it. Normal screen mirroring sends it to the TV.
- On an iPhone, the silent switch may mute the bells. Flip it to ring if you hear nothing.
- Browsers keep a page silent until someone taps it. If you reopen the timer while it is running, a small "tap for sound" note shows in the top-left corner. Tap once anywhere.

## Updating

1. On the MacBook, type `npm run share` in this folder.
2. On the iPhone or iPad, open the home screen app while online. It picks up the new version by itself. If it still looks old, close it fully and open it once more.

## If something goes wrong

- **"ngrok is not installed"**: run `brew install ngrok`.
- **"KIDSTIMER_NGROK_DOMAIN is not set"**: check that `.env.local` exists in this folder and has your domain in it.
- **ngrok says it does not know `--url`**: your ngrok is older. Update it with `brew upgrade ngrok`. Older versions call the same setting `--domain`.
- **"Port 4173 is already in use"**: another copy is still running. Press Control + C in its Terminal window, or restart the MacBook.
- **The address shows a blocked-host error**: the domain in `.env.local` is different from the one ngrok is using. Make them match, then run `npm run share` again.

## Choices made for you

While building, some decisions were made on your behalf where the plan did not say. They are listed in plain language in `docs/decisions-log.md`.

## Device checklist

Tick these on the real devices. A few more checks will be added at the end of the build.

- [ ] iPhone: opened once through the ngrok address, then added to the Home Screen.
- [ ] iPhone: with Wi-Fi and mobile data off, the home screen app opens and a timer runs.
- [ ] iPad: opened once through the ngrok address, then added to the Home Screen.
- [ ] iPad: with Wi-Fi off, the home screen app opens and a timer runs.
- [ ] iPhone and iPad: the app opens full screen, with no browser bars.
- [ ] iPhone and iPad: the screen stays on while a timer runs.
- [ ] iPhone: the bells are heard with the silent switch on, or you know to flip it to ring.
- [ ] iPhone and iPad: after a phone call or switching apps, "tap for sound" appears and one tap brings sound back.
- [ ] iPhone and iPad: press and hold for 2 seconds opens the keypad.
- [ ] MacBook: `npm start` opens at `http://localhost:4173`, and the code can be typed on the keyboard.
- [ ] MacBook mirrored to the TV: the ring and digits fit the screen, and sound comes out of the TV.
