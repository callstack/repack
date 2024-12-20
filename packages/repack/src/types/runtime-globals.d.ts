/// <reference lib="DOM" />

declare interface LoadScriptEvent {
  type: 'load' | string;
  target?: { src: string };
}

declare interface RepackRuntime {
  loadScript: (
    name: string,
    caller: string | undefined,
    done: (event?: LoadScriptEvent) => void,
    referenceUrl: string
  ) => void;
  loadHotUpdate: (url: string, done: (event?: LoadScriptEvent) => void) => void;
  shared: {
    scriptManager?: import('../modules/ScriptManager/ScriptManager.js').ScriptManager;
  };
}

declare var __DEV__: boolean;
declare var __PUBLIC_PROTOCOL__: string;
declare var __PUBLIC_HOST__: string;
declare var __PUBLIC_PORT__: number;
declare var __PLATFORM__: string;
declare var __REACT_NATIVE_MAJOR_VERSION__: number;
declare var __REACT_NATIVE_MINOR_VERSION__: number;
declare var __REACT_NATIVE_PATCH_VERSION__: number;
declare var __webpack_public_path__: string;
declare var __webpack_hash__: string;
declare var __repack__: RepackRuntime;
declare var __webpack_require__: import('../modules/ScriptManager/types.js').WebpackContext & {
  x?: Function;
  repack: RepackRuntime;
};

declare interface HMRInfo {
  type: string;
  chain: Array<string | number>;
  error?: Error;
  moduleId: string | number;
}

declare interface HotApi {
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

declare interface NodeModule {
  hot?: HotApi;
}
