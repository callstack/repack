---
"@callstack/repack": major
---

Removed `--silent` CLI flag for start command. 

For silencing output, you can use shell redirection instead:
- Unix/macOS: `npx react-native start > /dev/null 2>&1`
- Windows: `npx react-native start > nul 2>&1`
