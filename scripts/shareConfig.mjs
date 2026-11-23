// Reads and checks the share settings. Kept free of side effects so it can be tested.

// Same value as PREVIEW_PORT in src/core/constants.ts. This file is plain JavaScript and
// cannot import TypeScript, so the number is repeated here once.
export const PREVIEW_PORT = 4173;

const ENV_NAME = 'KIDSTIMER_NGROK_DOMAIN';
const HOSTNAME = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)*$/i;

function failure(detail) {
  return {
    ok: false,
    message: `${detail} Set ${ENV_NAME} in the .env.local file, for example: ${ENV_NAME}=your-name.ngrok-free.app`,
  };
}

/**
 * The bare host name from what was typed or pasted: no spaces, no http(s)://, no trailing
 * slash. vite.config.ts uses it too, so the preview server allows exactly the host ngrok uses.
 * @param {string} value
 */
export function normalizeDomain(value) {
  return value.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

/** @param {Record<string, string | undefined>} env */
export function readShareConfig(env) {
  const raw = env[ENV_NAME];
  if (raw === undefined) return failure(`${ENV_NAME} is not set.`);
  const domain = normalizeDomain(raw);
  if (domain === '' || !HOSTNAME.test(domain)) {
    return failure(`"${raw}" is not a valid domain.`);
  }
  return { ok: true, domain, port: PREVIEW_PORT };
}
