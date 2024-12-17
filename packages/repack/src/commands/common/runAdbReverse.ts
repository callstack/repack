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

async function waitForDevice() {
  const adbPath = getAdbPath();
  const command = `${adbPath} wait-for-device`;
  return execa.command(command);
}

async function reversePort(port: number) {
  const adbPath = getAdbPath();
  const command = `${adbPath} reverse tcp:${port} tcp:${port}`;
  return execa.command(command);
}

export async function runAdbReverse({
  logger = console,
  port,
  verbose = false,
  wait = false,
}: RunAdbReverseParams) {
  try {
    if (wait) {
      await waitForDevice();
    }
    await reversePort(port);
    if (verbose) {
      logger.info('adb reverse success');
    }
    logger.debug(`adb reverse success: ${{ port }}`);
  } catch (error) {
    const errorMessage = (error as Error).message;
    const message = errorMessage.includes('error:')
      ? errorMessage.split('error:')[1].trim()
      : errorMessage;
    if (verbose) {
      logger.warn(`adb reverse failed: "${message.trim()}"`);
    }
    logger.debug(`adb reverse failed: "${message.trim()}" ${{ port }}`);
  }
}
