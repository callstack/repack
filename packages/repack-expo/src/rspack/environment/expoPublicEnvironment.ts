import { createHash } from 'node:crypto';
import path from 'node:path';
import { getEnvFiles, parseProjectEnv } from '@expo/env';

export type ExpoEnvironmentMode = 'development' | 'production';
export type ExpoPublicEnvironment = Readonly<Record<string, string>>;
export type ExpoPublicEnvironmentSnapshot = {
  digest: string;
  inline: boolean;
  values: ExpoPublicEnvironment;
};

type ResolveExpoPublicEnvironmentOptions = {
  mode: ExpoEnvironmentMode;
  projectRoot: string;
  systemEnv?: NodeJS.ProcessEnv;
};

const EMPTY_PUBLIC_ENVIRONMENT = Object.freeze({});

function readBoolish(value: string | undefined): boolean {
  if (value === undefined) return false;
  if (value === '1' || value.toLowerCase() === 'true') return true;
  if (value === '0' || value.toLowerCase() === 'false') return false;
  throw new Error(
    'Expected an Expo environment flag to be true, false, 1, or 0.'
  );
}

export function shouldInlineExpoPublicEnvironment(
  mode: ExpoEnvironmentMode,
  systemEnv: NodeJS.ProcessEnv = process.env
): boolean {
  return !(
    mode === 'production' && readBoolish(systemEnv.EXPO_NO_CLIENT_ENV_VARS)
  );
}

function onlyPublicValues(
  environment: NodeJS.ProcessEnv
): ExpoPublicEnvironment {
  const publicEnvironment: Record<string, string> = {};
  for (const [key, value] of Object.entries(environment)) {
    if (key.startsWith('EXPO_PUBLIC_') && value !== undefined) {
      publicEnvironment[key] = value;
    }
  }
  return Object.freeze(publicEnvironment);
}

export function getExpoEnvironmentFiles(
  projectRoot: string,
  mode: ExpoEnvironmentMode
): string[] {
  return getEnvFiles({ mode, silent: true }).map((filename) =>
    path.join(projectRoot, filename)
  );
}

export function resolveExpoPublicEnvironment({
  mode,
  projectRoot,
  systemEnv = process.env,
}: ResolveExpoPublicEnvironmentOptions): ExpoPublicEnvironment {
  if (!shouldInlineExpoPublicEnvironment(mode, systemEnv)) {
    return EMPTY_PUBLIC_ENVIRONMENT;
  }

  const fileEnvironment = readBoolish(systemEnv.EXPO_NO_DOTENV)
    ? {}
    : parseProjectEnv(projectRoot, {
        mode,
        silent: true,
        systemEnv,
      }).env;

  return onlyPublicValues({ ...fileEnvironment, ...systemEnv });
}

export function createExpoPublicEnvironmentSnapshot(
  options: ResolveExpoPublicEnvironmentOptions
): ExpoPublicEnvironmentSnapshot {
  const inline = shouldInlineExpoPublicEnvironment(
    options.mode,
    options.systemEnv
  );
  const values = resolveExpoPublicEnvironment(options);
  const serialized = JSON.stringify([
    inline,
    Object.entries(values).sort(([left], [right]) => left.localeCompare(right)),
  ]);

  return {
    digest: createHash('sha256').update(serialized).digest('hex'),
    inline,
    values,
  };
}
