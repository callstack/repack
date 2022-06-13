/// <reference lib="DOM" />

declare interface LoadScriptEvent {
  type: 'load' | string;
  target?: { src: string };
}

declare interface RepackRuntime {
  loadScript: (
    name: string,
    caller: string | undefined,
    done: (event?: LoadScriptEvent) => void
  ) => void;
  loadScriptCallback: string[];
  loadHotUpdate: (url: string, done: (event?: LoadScriptEvent) => void) => void;
  scriptManager?: import('./modules/ScriptManager/ScriptManager').ScriptManagerBackend;
}

declare var __DEV__: boolean;
declare var __PUBLIC_PORT__: number;
declare var __PLATFORM__: string;
declare var __CHUNKS__: { local?: Array<string | number | null> } | undefined;
declare var __webpack_public_path__: string;
declare var __webpack_get_script_filename__: (script: string) => string;
declare var __webpack_hash__: string;
declare var __repack__: RepackRuntime;
declare var __webpack_require__: {
  x?: Function;
  repack: RepackRuntime;
};

interface HMRInfo {
  type: string;
  chain: Array<string | number>;
  error?: Error;
  moduleId: string | number;
}

interface HotApi {
  status():
    | 'idle'
    | 'check'
    | 'prepare'
    | 'ready'
    | 'dispose'
    | 'apply'
    | 'abort'
    | 'fail';
  check(autoPlay: boolean): Promise<Array<string | number>>;
  apply(options: {
    ignoreUnaccepted?: boolean;
    ignoreDeclined?: boolean;
    ignoreErrored?: boolean;
    onDeclined?: (info: HMRInfo) => void;
    onUnaccepted?: (info: HMRInfo) => void;
    onAccepted?: (info: HMRInfo) => void;
    onDisposed?: (info: HMRInfo) => void;
    onErrored?: (info: HMRInfo) => void;
  }): Promise<Array<string | number>>;
}

interface NodeModule {
  hot?: HotApi;
}
