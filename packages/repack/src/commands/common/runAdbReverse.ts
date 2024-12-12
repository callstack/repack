import execa from 'execa';
import type { Logger } from '../../types';

interface RunAdbReverseParams {
  port: number;
  verbose?: boolean;
  logger?: Logger;
}

export async function runAdbReverse({
  port,
  verbose = false,
  logger = console,
}: RunAdbReverseParams) {
  const adbPath = process.env.ANDROID_HOME
    ? `${process.env.ANDROID_HOME}/platform-tools/adb`
    : 'adb';
  const command = `${adbPath} reverse tcp:${port} tcp:${port}`;
  const info = JSON.stringify({ port, adbPath, command });

  try {
    await execa.command(command);
    if (verbose) {
      logger.info('ADB reverse success');
    }
    logger.debug(`ADB reverse success: ${info}`);
  } catch (error) {
    const message =
      (error as Error).message.split('error:')[1] || (error as Error).message;
    if (verbose) {
      logger.warn(`ADB reverse failed: "${message.trim()}"`);
    }
    logger.debug(`ADB reverse failed: "${message.trim()}" ${info}`);
  }
}
