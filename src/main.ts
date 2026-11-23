// Wiring only: every rule lives in a tested module. This file is left out of unit coverage.
import './ui/styles/index.css';
import { createTicker, soundName } from './app/effects';
import { mountShell, showStartupError } from './app/shell';
import { initialState } from './app/state';
import { createStorage } from './app/storage';
import { createStore } from './app/store';
import { TICK_MS } from './core/constants';
import type { SoundEffect } from './core/tick';
import { createSound } from './platform/sound';
import { createWakeLock } from './platform/wakeLock';
import { createCodeView } from './ui/codeView';
import { attachHold } from './ui/hold';
import { attachKeyboard } from './ui/keyboard';
import { createLockView } from './ui/lockView';
import { createSetupView } from './ui/setupView';
import { createTimerView } from './ui/timerView';

/**
 * Any of these, anywhere on the page, is the tap that lets sound play. iPhones only
 * allow it on a finger lift, hence pointerup and touchend as well as pointerdown.
 * Passive listeners in the capture phase never get in the way of the hold or the keypad.
 */
const UNLOCK_EVENTS = ['pointerdown', 'pointerup', 'touchend', 'keydown'] as const;

function start(root: HTMLElement): void {
  const storage = createStorage(localStorage);
  const store = createStore(initialState(storage.load()), Date.now);
  const { dispatch, getState } = store;
  const sound = createSound(() => new AudioContext());
  const wakeLock = createWakeLock(navigator, document);

  const timerView = createTimerView();
  const shell = mountShell(root, {
    code: createCodeView(dispatch),
    setup: createSetupView(dispatch, () => new Date()),
    timer: timerView,
    lock: createLockView(dispatch),
  });
  const render = (): void => shell.render(getState(), Date.now(), sound.isUnlocked());

  store.subscribe((state) => {
    storage.save(state);
    render();
  });
  render();

  // Every frame, so the ring moves smoothly. The next frame is booked first, so one
  // bad frame cannot stop the loop.
  const frame = (): void => {
    requestAnimationFrame(frame);
    render();
  };
  requestAnimationFrame(frame);

  const playSound = (effect: SoundEffect): void => {
    sound.play(effect);
    document.documentElement.dataset.lastSound = soundName(effect);
  };
  const tick = createTicker({
    getState,
    dispatch,
    playSound,
    setWake: (active) => void wakeLock.setActive(active),
  });
  tick(Date.now());
  setInterval(() => tick(Date.now()), TICK_MS);

  attachHold(timerView.el, () => dispatch({ type: 'open-keypad' }));
  attachKeyboard(document, getState, dispatch);

  const unlockSound = (): void => void sound.unlock().then(render);
  for (const type of UNLOCK_EVENTS) {
    document.addEventListener(type, unlockSound, { capture: true, passive: true });
  }
}

const root = document.getElementById('app');
try {
  if (root === null) throw new Error('The page has no #app element.');
  start(root);
} catch (error) {
  console.error('The timer could not start.', error);
  showStartupError(root ?? document.body);
}
