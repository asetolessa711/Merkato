// Centralized console silencer for non-development environments.
// In 'test' and 'production', reduce noise by disabling log/info/debug.
// Keep warn/error intact for visibility of real issues.
/* eslint-disable no-console */
try {
  const env = process.env.NODE_ENV;
  if (env && env !== 'development') {
    const noop = () => {};
    if (console) {
      console.log = noop;
      console.info = noop;
      console.debug = noop;
      // Optional: quiet group logs too
      if (typeof console.group === 'function') console.group = noop;
      if (typeof console.groupCollapsed === 'function') console.groupCollapsed = noop;
      if (typeof console.groupEnd === 'function') console.groupEnd = noop;
    }
  }
} catch (_) {
  // no-op
}
