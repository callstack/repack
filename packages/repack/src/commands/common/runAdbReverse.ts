import execa from 'execa';
import { Logger } from '../../types';

export async function runAdbReverse(port: number, logger: Logger = console) {
  const adbPath = process.env.ANDROID_HOME
    ? `${process.env.ANDROID_HOME}/platform-tools/adb`
    : 'adb';
  const command = `${adbPath} reverse tcp:${port} tcp:${port}`;
  try {
    await execa.command(command);
    logger.info(`Successfully run: ${command}`);
  } catch (error) {
    // Get just the error message
    const message =
      (error as Error).message.split('error:')[1] || (error as Error).message;
    logger.warn(`Failed to run: ${command} - ${message.trim()}`);
  }
}
