// Types for shareConfig.mjs, so vite.config.ts can import it under strict type checking.

export declare const PREVIEW_PORT: number;

export type ShareConfig =
  | { readonly ok: true; readonly domain: string; readonly port: number }
  | { readonly ok: false; readonly message: string };

export declare function normalizeDomain(value: string): string;

export declare function readShareConfig(env: Record<string, string | undefined>): ShareConfig;
