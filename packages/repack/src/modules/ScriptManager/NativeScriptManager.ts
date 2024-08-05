import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export const enum NormalizedScriptLocatorHTTPMethod {
  GET = 'GET',
  POST = 'POST',
}

export const enum NormalizedScriptLocatorSignatureVerificationMode {
  STRICT = 'strict',
  LAX = 'lax',
  OFF = 'off',
}

export interface NormalizedScriptLocator {
  method: NormalizedScriptLocatorHTTPMethod;
  url: string;
  fetch: boolean;
  timeout: number;
  absolute: boolean;
  query: string | null;
  headers: { [key: string]: string } | null;
  body: string | null;
  verifyScriptSignature: NormalizedScriptLocatorSignatureVerificationMode;
}

export interface Spec extends TurboModule {
  loadScript(
    scriptId: string,
    scriptConfig: NormalizedScriptLocator
  ): Promise<null>;
  prefetchScript(
    scriptId: string,
    scriptConfig: NormalizedScriptLocator
  ): Promise<null>;
  invalidateScripts(scripts: Array<string>): Promise<null>;
}

export default TurboModuleRegistry.get<Spec>('ScriptManager') as Spec;
