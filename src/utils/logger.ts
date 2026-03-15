/**
 * Development-only logger utility.
 *
 * All methods are no-ops in production builds. Use instead of raw
 * `console.log` / `console.error` / `console.warn` to keep production
 * bundles quiet and avoid leaking debug information.
 *
 * Evaluates `import.meta.env.DEV` at call time (not module load time)
 * so that tests can stub the env variable without module caching issues.
 */
export const logger = {
  log: (...args: unknown[]) => {
    if (import.meta.env.DEV) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (import.meta.env.DEV) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (import.meta.env.DEV) console.error(...args);
  },
  debug: (...args: unknown[]) => {
    if (import.meta.env.DEV) console.debug(...args);
  },
};
