---
'@callstack/repack-plugin-nativewind': patch
---

---

### Details

- **File Modified:** `packages/plugin-nativewind/src/plugin.ts`
- **Summary of Change:**  
  The plugin now ensures the `NATIVEWIND_OS` environment variable is set based on the platform name from `compiler.options.name` if it is not already defined. This is done during the initialization of the `NativeWindPlugin`, after dependency checks.
- **Code Added:**
  ```ts
  /** Set the platform if not present*/
  const platformName = compiler.options.name;
  if (process.env.NATIVEWIND_OS === undefined) {
      process.env.NATIVEWIND_OS = platformName;
  }
  ```
- **Purpose:**  
  This change guarantees platform detection for NativeWind, reducing manual environment configuration and improving reliability across different build platforms.

- **Relevant PR:** [#1173](https://github.com/callstack/repack/pull/1173)

---
