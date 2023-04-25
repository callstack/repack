import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';
import type { Int32 } from 'react-native/Libraries/Types/CodegenTypes';

type WebpackContext = {
    p: () => string;
    u: (id: string) => string;
}

type NormalizedScriptLocator = {
    method: string;
    url: string;
    fetch: boolean; 
    timeout: Int32;
    absolute: boolean;
    query?: string;
    headers?: string;
    body?: string;
    token?: string;
    verifyScriptSignature?: boolean;
}

type ScriptLocator = {
    url: string | ((webpackContext: WebpackContext) => string);
    query?: string;
    headers?: string;
    method?: string;
    body?: string | null;
    timeout?: Int32;
    absolute?: boolean;
    cache?: boolean; 
    token?: string;
    verifyScriptSignature?: boolean;
    shouldUpdateScript?: (
        scriptId?: string,
        caller?:string,
        isScriptCacheOutdated?: boolean,
    ) => Promise<boolean> | boolean;
}

export interface Spec extends TurboModule {
    loadScript(scriptId: string, config: NormalizedScriptLocator): Promise<ScriptLocator>;
    prefetchScript(scriptId: string, config: NormalizedScriptLocator): Promise<ScriptLocator>;
    invalidateScripts(scripts: Array<string>): Promise<string>;
}

export default TurboModuleRegistry.get<Spec>('ScriptManager') as Spec;