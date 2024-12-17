import path from 'node:path';
import execa from 'execa';
import type { Logger } from '../../types';

interface RunAdbReverseParams {
  logger?: Logger;
  port: number;
  verbose?: boolean;
  wait?: boolean;
}

function getAdbPath() {
  const androidHome = process.env.ANDROID_HOME;
  return androidHome ? path.join(androidHome, 'platform-tools', 'adb') : 'adb';
}

function parseAdbError(error: unknown) {
  const errorMessage = (error as Error).message;
  const message = errorMessage.includes('error:')
    ? errorMessage.split('error:')[1]
    : errorMessage;
  return message.trim();
}

async function executeAdbCommand(command: string, logger: Logger) {
  const adbPath = getAdbPath();
  try {
    const result = await execa.command(`${adbPath} ${command}`);
    logger.debug(`[ADB] "adb ${command}" executed successfully.`);
    return result;
  } catch (error) {
    const message = parseAdbError(error);
    logger.debug(`[ADB] "adb ${command}" failed: "${message}"`);
    throw new Error(message);
  }
}

async function waitForDevice(logger: Logger) {
  try {
    await executeAdbCommand('wait-for-device', logger);
  } catch (error) {
    const message = (error as Error).message;
    if (/more than one device\/emulator/.test(message)) {
      return;
    }
    throw error;
  }
}

async function reversePort(port: number, device: string, logger: Logger) {
  await executeAdbCommand(
    `-s ${device} reverse tcp:${port} tcp:${port}`,
    logger
  );
}

async function getDevices(logger: Logger): Promise<string[]> {
  const { stdout } = await executeAdbCommand('devices', logger);
  const devices = stdout
    .split('\n')
    .slice(1)
    .map((line) => line.split('\t')[0])
    .filter(Boolean);
  logger.debug(`[ADB] Found ${devices.length} devices/emulators.`);
  return devices;
}

/**
 * Runs the adb reverse command to reverse the specified port on all available devices.
 * Performs the following steps:
 * 1. (Optional) Waits for the device to be available.
 * 2. Get a list of all connected devices.
 * 3. Attempts to reverse the specified port using adb for all devices.
 */
export async function runAdbReverse({
  logger = console,
  port,
  verbose = false,
  wait = false,
}: RunAdbReverseParams) {
  try {
    if (wait) {
      await waitForDevice(logger);
    }
    const devices = await getDevices(logger);
    for (const device of devices) {
      await reversePort(port, device, logger);
    }
    if (verbose) {
      logger.info('[ADB] port reverse success');
    }
  } catch (error) {
    const message = (error as Error).message;
    if (verbose) {
      logger.warn(`[ADB] port reverse failed: "${message}"`);
    }
  }
}
