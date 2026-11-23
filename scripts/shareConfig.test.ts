import { afterEach, describe, expect, it, vi } from 'vitest';
import viteConfig from '../vite.config';
import { normalizeDomain, readShareConfig } from './shareConfig.mjs';

const DOMAIN = 'my-timer.ngrok-free.app';
/** The same address, typed or pasted the ways a person might. */
const SPELLINGS = [
  DOMAIN,
  `  ${DOMAIN}  `,
  `https://${DOMAIN}`,
  `https://${DOMAIN}/`,
  `HTTP://${DOMAIN}//`,
];

describe('normalizeDomain', () => {
  it.each(SPELLINGS)('turns %j into the bare host name', (value) => {
    expect(normalizeDomain(value)).toBe(DOMAIN);
  });

  it('leaves anything else for the checks to judge', () => {
    expect(normalizeDomain('   ')).toBe('');
    expect(normalizeDomain('a.com/path')).toBe('a.com/path');
  });
});

describe('readShareConfig', () => {
  it('accepts a plain domain', () => {
    expect(readShareConfig({ KIDSTIMER_NGROK_DOMAIN: DOMAIN })).toEqual({
      ok: true,
      domain: DOMAIN,
      port: 4173,
    });
  });

  it('strips the scheme and trailing slash', () => {
    expect(readShareConfig({ KIDSTIMER_NGROK_DOMAIN: `https://${DOMAIN}/` })).toEqual({
      ok: true,
      domain: DOMAIN,
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

describe('preview server allowed hosts (vite.config.ts)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(SPELLINGS)('allows the host the share script uses, for %j', (value) => {
    vi.stubEnv('KIDSTIMER_NGROK_DOMAIN', value);
    const config = viteConfig({ command: 'serve', mode: 'production', isPreview: true });
    expect(config.preview?.allowedHosts).toEqual([DOMAIN]);
    const share = readShareConfig({ KIDSTIMER_NGROK_DOMAIN: value });
    expect(share.ok && share.domain).toBe(DOMAIN);
  });
});
