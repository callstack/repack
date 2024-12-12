import execa from 'execa';
import type { Logger } from '../../types';

export async function runAdbReverse(port: number, logger: Logger = console) {
  const adbPath = process.env.ANDROID_HOME
    ? `${process.env.ANDROID_HOME}/platform-tools/adb`
    : 'adb';
  const command = `${adbPath} reverse tcp:${port} tcp:${port}`;
  const info = JSON.stringify({ port, adbPath, command });

  try {
    await execa.command(command);
    logger.debug(`ADB reverse success: ${info}`);
  } catch (error) {
    const message =
      (error as Error).message.split('error:')[1] || (error as Error).message;
    logger.debug(`ADB reverse failed: "${message.trim()}" ${info}`);
  }
}
