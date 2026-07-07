#!/bin/sh
# Fake editor used by symbolication E2E tests: records how it was invoked
# instead of opening anything. The log path comes from the dev server's env.
echo "$@" >> "$FAKE_EDITOR_LOG"
