import type { PM } from 'detect-package-manager';

export interface PackageManager {
  name: PM;
  runCommand: string;
  dlxCommand: string;
}
