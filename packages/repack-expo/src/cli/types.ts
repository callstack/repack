export type CliOptions = {
  check: boolean;
  dryRun: boolean;
  force: boolean;
  json: boolean;
};

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export type Diagnostic = {
  code: string;
  message: string;
  recovery?: string;
  severity: DiagnosticSeverity;
};

export type InitOptions = Partial<CliOptions> & {
  projectRoot?: string;
};

export type FileChange = {
  after: string;
  before: string | null;
  path: string;
};

export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';
export type JsonObject = Record<string, unknown>;
export type PackageJson = JsonObject & {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  expo?: JsonObject;
  main?: string;
  name?: string;
  packageManager?: string;
  scripts?: Record<string, string>;
  type?: string;
};

export type ConfigPluginOptions = {
  configPath?: string;
  entry?: string;
};

export type ConfigPluginRegistration = {
  invalidReason?: string;
  options: ConfigPluginOptions;
  registered: boolean;
};

export type InitResult = {
  changes: FileChange[];
  changedFiles: string[];
  diagnostics: Diagnostic[];
  installCommand: string;
  ok: boolean;
  packageManager: PackageManager;
  wrote: boolean;
};

export type DoctorOptions = {
  projectRoot?: string;
};

export type DoctorResult = {
  diagnostics: Diagnostic[];
  errorCount: number;
  ok: boolean;
  warningCount: number;
};
