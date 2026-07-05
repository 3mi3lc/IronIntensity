// Small leveled logger so diagnostic logging can be scoped/silenced instead of
// scattering raw console.* calls. `debug`/`info` are emitted only in development
// (RN's __DEV__ global); `warn`/`error` always surface. Under Jest
// (NODE_ENV=test) debug/info are muted to keep test output readable.
//
// Note: user-facing sync failures are persisted via recordSyncError — this
// logger is only for developer diagnostics.
const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
const devFlag: boolean = (globalThis as { __DEV__?: boolean }).__DEV__ ?? !isTest;

/* eslint-disable no-console */
export const logger = {
    debug: (...args: unknown[]) => { if (devFlag) console.log(...args); },
    info: (...args: unknown[]) => { if (devFlag) console.info(...args); },
    warn: (...args: unknown[]) => { console.warn(...args); },
    error: (...args: unknown[]) => { console.error(...args); },
};
/* eslint-enable no-console */
