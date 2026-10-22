export type Severity = 'error' | 'warning' | 'info';

export type DiagnosticArea =
  | 'scripts'
  | 'federation'
  | 'errors'
  | 'dev-server'
  | 'compilation'
  | 'symbolication'
  | 'faults';

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
  | 'prefetched'
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

export type ScriptCallMethod =
  | 'loadScript'
  | 'prefetchScript'
  | 'invalidateScripts';

export type PromiseState = 'pending' | 'fulfilled' | 'rejected' | 'unknown';

/**
 * One call into `ScriptManager.shared` (from app code, the webpack chunk
 * runtime, MF or the devtools actions).
 */
export type ScriptCall = {
  seq: number;
  method: ScriptCallMethod;
  scriptId?: string;
  caller?: string;
  uniqueId?: string;
  /** `invalidateScripts` only. */
  scriptIds?: string[];
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
  outcome: 'pending' | 'ok' | 'error';
  error?: string;
  /**
   * A load/prefetch for the same unique id was already stored in
   * ScriptManager when the call started, so ScriptManager returned (or
   * awaited) it instead of starting a new attempt.
   */
  joined?: { isPrefetch: boolean; state: PromiseState; ageMs?: number };
  /** ScriptManager event types emitted for this unique id while the call ran. */
  events: ScriptEventType[];
  /** Whether resolvers ran during the call (a `resolving` event was emitted). */
  resolverRan: boolean;
  /** Injected faults that fired during the call. */
  faults: string[];
};

export type StoredScriptPromise = {
  uniqueId: string;
  isPrefetch: boolean;
  state: PromiseState;
  error?: string;
  ageMs?: number;
};

/** Internal ScriptManager state, read from its (TypeScript-protected) fields. */
export type ScriptManagerState = {
  available: boolean;
  /** In-flight or stored load/prefetch promises (`scriptsPromises`). */
  promises: StoredScriptPromise[];
  /** Registered resolvers, highest priority first. */
  resolvers: Array<{ key: string; priority: string | number }>;
  /** Number of taps per ScriptManager hook (`ScriptManager.shared.hooks`). */
  hooks: Record<string, number>;
  storage: boolean;
  /** Locator cache, keyed by unique id (persisted when storage is set). */
  cache: Array<{ uniqueId: string; url?: string; query?: string }>;
  diagnostics: Diagnostic[];
};

export type FaultStage = 'resolve' | 'load';

/** A fault injected into ScriptManager through its hooks. */
export type ScriptFault = {
  id: string;
  stage: FaultStage;
  /** Exact script id; omit to match every script. */
  scriptId?: string;
  caller?: string;
  /** `fail` throws, `delay` only waits `delayMs`; `fail` with `delayMs` waits, then throws. */
  action: 'fail' | 'delay';
  message: string;
  /** Error `code`, e.g. `NetworkFailure` like native loading errors. */
  code?: string;
  delayMs?: number;
  /** Remaining hits; omit for unlimited. */
  remaining?: number;
  hits: number;
  createdAt: number;
};

/** A fault injected into dev-server responses. */
export type ServerFault = {
  id: string;
  /** Substring of the request URL, or `/regex/`. */
  match: string;
  method?: string;
  platform?: string;
  /** Respond with this status instead of serving the request. */
  status?: number;
  body?: string;
  delayMs?: number;
  /** Destroy the socket without a response (like a dropped connection). */
  drop?: boolean;
  remaining?: number;
  hits: number;
  createdAt: number;
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
    scriptCalls: number;
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
  /** Id of the injected server fault that produced this response. */
  fault?: string;
};

export type DevServerState = {
  /** Port of the dev server process, when known. */
  port?: number;
  startedAt: number;
  compilations: PlatformCompilation[];
  requests: DevServerRequest[];
  faults: ServerFault[];
  diagnostics: Diagnostic[];
};
