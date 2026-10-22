---
"@callstack/repack": minor
---

Add `SentryDebugIdPlugin`, which stamps a Sentry Debug ID into the bundle and
its source map so Sentry can pair a JS stack trace with the source map that
resolves it. This is the Re.Pack counterpart of what `@sentry/react-native`
provides for Metro through `createSentryMetroSerializer`.
