export type PM = 'npm' | 'yarn' | 'pnpm' | 'bun';

export interface PackageManager {
  name: PM;
  runCommand: string;
  dlxCommand: string;
}
