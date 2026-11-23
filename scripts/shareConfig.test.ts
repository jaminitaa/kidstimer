import { describe, expect, it } from 'vitest';
import { readShareConfig } from './shareConfig.mjs';

describe('readShareConfig', () => {
  it('accepts a plain domain', () => {
    expect(readShareConfig({ KIDSTIMER_NGROK_DOMAIN: 'my-timer.ngrok-free.app' })).toEqual({
      ok: true,
      domain: 'my-timer.ngrok-free.app',
      port: 4173,
    });
  });

  it('strips the scheme and trailing slash', () => {
    expect(readShareConfig({ KIDSTIMER_NGROK_DOMAIN: 'https://my-timer.ngrok-free.app/' })).toEqual({
      ok: true,
      domain: 'my-timer.ngrok-free.app',
      port: 4173,
    });
  });

  it('asks for the setting when it is missing', () => {
    expect(readShareConfig({})).toEqual({
      ok: false,
      message: expect.stringContaining('KIDSTIMER_NGROK_DOMAIN'),
    });
  });

  it.each(['', '   ', 'not a domain', 'a b.com', 'evil.com; rm -rf /', '-bad.com', 'a..com', 'a.com/path'])(
    'rejects %j',
    (bad) => {
      expect(readShareConfig({ KIDSTIMER_NGROK_DOMAIN: bad }).ok).toBe(false);
    },
  );
});
