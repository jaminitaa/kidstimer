import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWakeLock } from './wakeLock';

type FakeSentinel = { readonly release: ReturnType<typeof vi.fn> };

/** A navigator whose wake lock hands out a new sentinel (with a release spy) per request. */
function fakeNav() {
  const sentinels: FakeSentinel[] = [];
  const request = vi.fn(async (_type: string) => {
    const sentinel = { release: vi.fn(async () => undefined) };
    sentinels.push(sentinel);
    return sentinel;
  });
  return { nav: { wakeLock: { request } } as unknown as Navigator, request, sentinels };
}

/** A document whose visibility the test can flip. */
function fakeDoc() {
  const initial: { visibilityState: DocumentVisibilityState } = { visibilityState: 'visible' };
  const doc = Object.assign(new EventTarget(), initial);
  const setVisibility = (state: DocumentVisibilityState): void => {
    doc.visibilityState = state;
    doc.dispatchEvent(new Event('visibilitychange'));
  };
  return { doc: doc as unknown as Document, setVisibility };
}

/** Lets pending promise callbacks run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createWakeLock', () => {
  it('requests a screen lock once, however often it is asked', async () => {
    const { nav, request } = fakeNav();
    const lock = createWakeLock(nav, fakeDoc().doc);
    await Promise.all([lock.setActive(true), lock.setActive(true)]);
    await lock.setActive(true);
    expect(request).toHaveBeenCalledExactlyOnceWith('screen');
  });

  it('releases the lock when no longer wanted, and can take it again', async () => {
    const { nav, request, sentinels } = fakeNav();
    const lock = createWakeLock(nav, fakeDoc().doc);
    await lock.setActive(false);
    expect(request).not.toHaveBeenCalled();
    await lock.setActive(true);
    await lock.setActive(false);
    await lock.setActive(false);
    expect(sentinels[0]?.release).toHaveBeenCalledTimes(1);
    await lock.setActive(true);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('takes the lock again when the page comes back into view', async () => {
    const { nav, request } = fakeNav();
    const { doc, setVisibility } = fakeDoc();
    const lock = createWakeLock(nav, doc);
    await lock.setActive(true);
    setVisibility('hidden');
    expect(request).toHaveBeenCalledTimes(1);
    setVisibility('visible');
    await settle();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('does not take the lock on return when none is wanted', async () => {
    const { nav, request } = fakeNav();
    const { doc, setVisibility } = fakeDoc();
    const lock = createWakeLock(nav, doc);
    await lock.setActive(true);
    await lock.setActive(false);
    setVisibility('hidden');
    setVisibility('visible');
    await settle();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('lets go of a lock that arrives after it stopped being wanted', async () => {
    const { nav, sentinels } = fakeNav();
    const lock = createWakeLock(nav, fakeDoc().doc);
    const asking = lock.setActive(true);
    await lock.setActive(false);
    await asking;
    expect(sentinels[0]?.release).toHaveBeenCalledTimes(1);
  });

  it('warns once and does not throw when the request is refused', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { nav, request } = fakeNav();
    request.mockRejectedValueOnce(new Error('NotAllowedError'));
    const { doc, setVisibility } = fakeDoc();
    const lock = createWakeLock(nav, doc);
    await expect(lock.setActive(true)).resolves.toBeUndefined();
    await lock.setActive(true);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(1);
    setVisibility('hidden');
    setVisibility('visible');
    await settle();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('warns and does not throw when releasing fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { nav, sentinels } = fakeNav();
    const lock = createWakeLock(nav, fakeDoc().doc);
    await lock.setActive(true);
    sentinels[0]?.release.mockRejectedValueOnce(new Error('already gone'));
    await expect(lock.setActive(false)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('does nothing where the browser has no screen wake lock', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { doc, setVisibility } = fakeDoc();
    const lock = createWakeLock({} as Navigator, doc);
    await expect(lock.setActive(true)).resolves.toBeUndefined();
    setVisibility('visible');
    await expect(lock.setActive(false)).resolves.toBeUndefined();
    expect(warn).not.toHaveBeenCalled();
  });
});
