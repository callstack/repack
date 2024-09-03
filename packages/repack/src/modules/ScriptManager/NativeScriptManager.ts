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
  uniqueId: string;
  method: NormalizedScriptLocatorHTTPMethod;
  url: string;
  fetch: boolean;
  timeout: number;
  absolute: boolean;
  query: string | undefined;
  headers: { [key: string]: string } | undefined;
  body: string | undefined;
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
  unstable_evaluateScript(
    scriptSource: string,
    scriptSourceUrl: string
  ): boolean;
}

export default TurboModuleRegistry.get<Spec>('ScriptManager') as Spec;
