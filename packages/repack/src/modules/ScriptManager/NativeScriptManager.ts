import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export const enum NormalizedScriptLocatorMethod {
  GET = 'GET',
  POST = 'POST',
}

export const enum NormalizedScriptLocatorVerifyScriptSignature {
  STRICT = 'strict',
  LAX = 'lax',
  OFF = 'off',
}

export interface NormalizedScriptLocator {
  method: NormalizedScriptLocatorMethod;
  url: string;
  fetch: boolean;
  timeout: number;
  absolute: boolean;
  query: string | null;
  headers: { [key: string]: string } | null;
  body: string | null;
  verifyScriptSignature: NormalizedScriptLocatorVerifyScriptSignature | null;
}

export interface Spec extends TurboModule {
  loadScript(scriptId: string, config: NormalizedScriptLocator): Promise<null>;
  prefetchScript(
    scriptId: string,
    config: NormalizedScriptLocator
  ): Promise<null>;
  invalidateScripts(scripts: Array<string>): Promise<null>;
}

export default TurboModuleRegistry.get<Spec>('ScriptManager') as Spec;
