import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export const enum ScriptConfigMethod {
  GET = 'GET',
  POST = 'POST',
}

export const enum ScriptConfigVerifyScriptSignature {
  STRICT = 'strict',
  LAX = 'lax',
  OFF = 'off',
}

export interface ScriptConfig {
  method: ScriptConfigMethod;
  url: string;
  fetch: boolean;
  timeout: number;
  absolute: boolean;
  query: string | null;
  headers: { [key: string]: string } | null;
  body: string | null;
  verifyScriptSignature: ScriptConfigVerifyScriptSignature | null;
}

export interface Spec extends TurboModule {
  loadScript(scriptId: string, config: ScriptConfig): Promise<null>;
  prefetchScript(scriptId: string, config: ScriptConfig): Promise<null>;
  invalidateScripts(scripts: Array<string>): Promise<null>;
}

export default TurboModuleRegistry.get<Spec>('ScriptManager') as Spec;
