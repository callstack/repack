import { execSync, spawn } from 'node:child_process';

function getRunningEmulators(): string[] {
  try {
    const adbOutput = execSync('adb devices').toString();
    const lines = adbOutput.split('\n').slice(1); // Skip the first line (header)
    return lines
      .map((line) => {
        const match = line.match(/emulator-(\d+)/);
        if (match) {
          // Get the AVD name for this port
          try {
            const port = match[1];
            const avdInfo = execSync(`adb -s emulator-${port} emu avd name`)
              .toString()
              .replace('OK', '')
              .trim();
            return avdInfo;
          } catch {
            return null;
          }
        }
        return null;
      })
      .filter((name): name is string => name !== null);
  } catch {
    return [];
  }
}

export async function openEmulator() {
  const emulator = execSync('emulator -list-avds');
  const avds = emulator.toString().split('\n').filter(Boolean);
  const avd = avds?.[0];
  if (!avd) {
    throw new Error('No Android Virtual Device found');
  }

  const { select, isCancel, log } = await import('@clack/prompts');

  const runningEmulators = getRunningEmulators();

  if (runningEmulators.length > 0) {
    log.info('Running emulators:');
    runningEmulators.map((avd) => {
      log.success(`${avd} is running`);
    });
    log.info('');
  }

  // show prompt to select avd use @clack/prompts
  const selectedAvd = await select({
    message: 'Select an Android Virtual Device',
    options: avds
      .filter((avd) => !runningEmulators.includes(avd))
      .map((avd) => {
        return {
          label: avd,
          value: avd,
        };
      }),
  });

  if (isCancel(selectedAvd)) {
    throw new Error('No Android Virtual Device selected');
  }

  // Spawn emulator process with proper detachment
  const emulatorProcess = spawn('emulator', ['-avd', selectedAvd.toString()], {
    detached: true,
    stdio: 'ignore',
  });

  log.success(`${selectedAvd} is running`);

  // Unref the process to allow the parent to exit independently
  emulatorProcess.unref();
}
