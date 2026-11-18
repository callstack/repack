---
"@callstack/repack": patch
---

A failed Hermes bytecode compilation now fails the build instead of exiting 0. `bundle` rejected inside the compiler's `close` callback, so compiler errors (such as a failing hermesc in `HermesBytecodePlugin`) became unhandled rejections; `LoggerPlugin`'s `uncaughtException` listener then logged them and the process exited 0, leaving plain JavaScript chunks in place. `bundle` now rejects (in both run and `--watch` mode) and `LoggerPlugin` sets `process.exitCode = 1` for uncaught exceptions.
