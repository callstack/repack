import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

// TODO FIX TYPES https://github.com/callstack/repack/issues/494
export interface Spec extends TurboModule {
  loadScript(scriptId: string, config: Object): Promise<Object>;
  prefetchScript(scriptId: string, config: Object): Promise<Object>;
  invalidateScripts(scripts: Array<string>): Promise<string>;
}

export default TurboModuleRegistry.get<Spec>('ScriptManager') as Spec;
