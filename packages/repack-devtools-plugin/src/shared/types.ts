export type Severity = 'error' | 'warning' | 'info';

export type DiagnosticArea =
  | 'scripts'
  | 'federation'
  | 'errors'
  | 'dev-server'
  | 'compilation'
  | 'symbolication';

/**
 * A finding computed from the recorded data. Agents should start from these:
 * every diagnostic names where it came from (`ref`) so the underlying record
 * can be fetched with the matching `get-*` / `list-*` tool.
 */
export type Diagnostic = {
  severity: Severity;
  area: DiagnosticArea;
  message: string;
  hint?: string;
  ref?: string;
};

export type ScriptStatus =
  | 'resolving'
  | 'resolved'
  | 'prefetching'
  | 'loading'
  | 'loaded'
  | 'failed'
  | 'invalidated';

export type ScriptEventType =
  | 'resolving'
  | 'resolved'
  | 'prefetching'
  | 'loading'
  | 'loaded'
  | 'error'
  | 'invalidated';

export type ScriptLocatorSummary = {
  url?: string;
  query?: string;
  method?: string;
  headers?: Record<string, string>;
  absolute?: boolean;
  timeout?: number;
  retry?: number;
  retryDelay?: number;
  /** `true` when the script is downloaded instead of reused from the device cache. */
  fetch?: boolean;
  verifyScriptSignature?: string;
};

export type ScriptError = {
  stage: 'resolve' | 'create' | 'load' | 'prefetch' | 'invalidate' | 'unknown';
  message: string;
  code?: string;
  nativeMessage?: string;
};

export type ScriptRecord = {
  /** ScriptManager cache key: `<caller>_<scriptId>`, or the script id without a caller. */
  uniqueId: string;
  scriptId: string;
  caller?: string;
  status: ScriptStatus;
  /** Whether the locator allowed caching (`locator.cache !== false`). */
  cacheEnabled?: boolean;
  locator?: ScriptLocatorSummary;
  /** Number of `loading` events seen, i.e. load attempts made through ScriptManager. */
  loadCount: number;
  prefetchCount: number;
  firstSeenAt: number;
  updatedAt: number;
  resolveStartedAt?: number;
  resolvedAt?: number;
  loadStartedAt?: number;
  loadedAt?: number;
  /** Milliseconds from `resolving` to `resolved` for the latest attempt. */
  resolveMs?: number;
  /** Milliseconds from `loading` to `loaded` for the latest attempt. */
  loadMs?: number;
  error?: ScriptError;
};

export type ScriptEvent = {
  seq: number;
  at: number;
  type: ScriptEventType;
  uniqueId?: string;
  scriptId?: string;
  caller?: string;
  url?: string;
  detail?: string;
};

export type FederationEventType =
  | 'beforeRequest'
  | 'afterResolve'
  | 'onLoad'
  | 'errorLoadRemote'
  | 'afterLoadShare'
  | 'errorLoadShare'
  | 'afterLoadEntry'
  | 'loadEntryError'
  | 'afterLoadManifest'
  | 'beforePreloadRemote'
  | 'afterPreloadRemote';

export type FederationEvent = {
  seq: number;
  at: number;
  type: FederationEventType;
  instance?: string;
  /** Request id such as `MiniApp/Module` or a shared package name. */
  id?: string;
  remote?: string;
  url?: string;
  version?: string;
  error?: string;
  detail?: string;
};

export type FederationRemote = {
  name: string;
  alias?: string;
  entry?: string;
  version?: string;
  type?: string;
  shareScope?: string | string[];
  /** Whether a module from this remote is in the instance's module cache. */
  loaded: boolean;
};

export type FederationSharedVersion = {
  version: string;
  from?: string;
  loaded?: boolean;
  eager?: boolean;
  singleton?: boolean;
  requiredVersion?: string | false;
  strictVersion?: boolean;
  useIn?: string[];
};

export type FederationSharedPackage = {
  scope: string;
  name: string;
  versions: FederationSharedVersion[];
};

export type FederationInstance = {
  name: string;
  version?: string;
  remotes: FederationRemote[];
  shared: FederationSharedPackage[];
  loadedModules: string[];
};

export type FederationState = {
  runtime: 'v2' | 'v1' | 'none';
  instances: FederationInstance[];
  /** MF v1 only: share scopes read from `__webpack_require__.S`. */
  shareScopes?: FederationSharedPackage[];
  runtimePluginInstalled: boolean;
  diagnostics: Diagnostic[];
};

export type RecordedErrorSource =
  | 'global-handler'
  | 'script-manager'
  | 'federation';

export type RecordedError = {
  id: string;
  at: number;
  source: RecordedErrorSource;
  name?: string;
  message: string;
  stack?: string;
  isFatal?: boolean;
  componentStack?: string;
  /** Related record, e.g. a ScriptManager unique id or MF request id. */
  ref?: string;
};

export type StackFrame = {
  methodName: string;
  file?: string;
  lineNumber?: number;
  column?: number;
};

export type SymbolicatedFrame = {
  original: StackFrame;
  symbolicated?: StackFrame;
  /** `true` when the frame still points at a bundle URL after symbolication. */
  unmapped: boolean;
  collapse?: boolean;
};

export type SourceMapCheck = {
  bundleUrl: string;
  sourceMapUrl: string;
  status?: number;
  error?: string;
};

export type SymbolicationResult = {
  devServer?: string;
  frames: SymbolicatedFrame[];
  codeFrame?: { content: string; fileName?: string; location?: unknown };
  status?: number;
  error?: string;
  sourceMaps: SourceMapCheck[];
  diagnostics: Diagnostic[];
};

export type AppInfo = {
  platform: string;
  platformVersion?: string | number;
  reactNativeVersion?: string;
  hermes: boolean;
  bundleUrl?: string;
  devServer?: string;
  publicPath?: string;
  installedAt: number;
  bootRecording: boolean;
};

export type Overview = {
  app: AppInfo;
  counts: {
    scripts: number;
    failedScripts: number;
    scriptEvents: number;
    federationEvents: number;
    errors: number;
  };
  federationRuntime: FederationState['runtime'];
  diagnostics: Diagnostic[];
  devServer?: DevServerSummary;
};

export type DevServerSummary = {
  origin: string;
  reachable: boolean;
  error?: string;
  platforms: Array<{
    platform: string;
    status: CompilationStatus;
    errors: number;
    warnings: number;
  }>;
  failedRequests: number;
};

export type CompilationStatus = 'idle' | 'compiling' | 'ok' | 'failed';

export type CompilationIssue = {
  message: string;
  moduleName?: string;
  file?: string;
  loc?: string;
};

export type CompilationAsset = {
  name: string;
  size: number;
  chunkNames?: Array<string | number>;
};

export type PlatformCompilation = {
  platform: string;
  status: CompilationStatus;
  builds: number;
  startedAt?: number;
  finishedAt?: number;
  durationMs?: number;
  hash?: string;
  errors: CompilationIssue[];
  warnings: CompilationIssue[];
  errorCount: number;
  warningCount: number;
  assets: CompilationAsset[];
  /** Files that triggered the latest rebuild (watch mode). */
  changedFiles: string[];
  removedFiles: string[];
};

export type DevServerRequest = {
  seq: number;
  at: number;
  method: string;
  url: string;
  status: number;
  durationMs: number;
  platform?: string;
  userAgent?: string;
  /** Response body for failed requests, truncated. */
  responseBody?: string;
};

export type DevServerState = {
  /** Port of the dev server process, when known. */
  port?: number;
  startedAt: number;
  compilations: PlatformCompilation[];
  requests: DevServerRequest[];
  diagnostics: Diagnostic[];
};
