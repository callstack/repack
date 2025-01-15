declare namespace RepackRuntimeGlobals {
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

  declare interface LoadScriptEvent {
    type: 'load' | string;
    target?: { src: string };
  }

  declare interface RepackRuntimeObject {
    shared: {
      scriptManager?: import('../modules/ScriptManager/ScriptManager.js').ScriptManager;
    };
  }

  declare type ModuleExports = Record<string | number | symbol, any>;

  declare type ModuleObject = {
    id: number;
    loaded: boolean;
    error?: any;
    exports: ModuleExports;
  };

  declare type WebpackModuleExecutionInterceptor = ((options: {
    id: number;
    factory: (
      moduleObject: ModuleObject,
      moduleExports: ModuleExports,
      webpackRequire: WebpackRequire
    ) => void;
    module: ModuleObject;
    require: WebpackRequire;
  }) => void)[];

  declare type WebpackLoadScript = (
    url: string,
    done: (event?: LoadScriptEvent) => void,
    key?: string,
    chunkId?: string
  ) => void;

  declare type WebpackPublicPath = () => string;

  declare type WebpackGetChunkScriptFilename = (id: string) => string;

  declare type WebpackRequire = {
    i: WebpackModuleExecutionInterceptor;
    l: WebpackLoadScript;
    p: WebpackPublicPath;
    u: WebpackGetChunkScriptFilename;
    repack: RepackRuntimeObject;
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
declare var __repack__: RepackRuntimeGlobals.RepackRuntimeObject;
declare var __webpack_require__: RepackRuntimeGlobals.WebpackRequire;

declare interface NodeModule {
  hot?: RepackRuntimeGlobals.HotApi;
}
