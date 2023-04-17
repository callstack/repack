import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

export interface Spec extends TurboModule {
    readonly getConstants: () => {};

    loadScript(scriptId: string, config: Object): Promise<Object>;
    prefetchScript(scriptId: string, config: Object): Promise<Object>;
    invalidateScripts(scripts: Array<string>): Promise<null>;
}

export default TurboModuleRegistry.get<Spec>('ScriptManager') as Spec;