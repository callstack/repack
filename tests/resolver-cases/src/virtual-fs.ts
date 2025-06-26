import { Volume } from 'memfs';
import type { IFs } from 'memfs';

export interface VirtualPackage {
  name: string;
  version: string;
  packageJson: Record<string, any>;
  files: Record<string, string>;
}

export class VirtualFileSystem {
  private volume: InstanceType<typeof Volume>;
  public fs: IFs;

  constructor() {
    this.volume = new Volume();
    this.fs = this.volume.promises as any;
  }

  /**
   * Creates a virtual package in the filesystem
   */
  async createPackage(packagePath: string, pkg: VirtualPackage): Promise<void> {
    const basePath = packagePath.endsWith('/')
      ? packagePath
      : `${packagePath}/`;

    // Create package.json
    const packageJsonPath = `${basePath}package.json`;
    await this.volume.promises.mkdir(basePath, { recursive: true });
    await this.volume.promises.writeFile(
      packageJsonPath,
      JSON.stringify(pkg.packageJson, null, 2)
    );

    // Create all other files
    for (const [filePath, content] of Object.entries(pkg.files)) {
      const fullPath = `${basePath}${filePath}`;
      const dirPath = fullPath.substring(0, fullPath.lastIndexOf('/'));

      if (dirPath !== basePath.slice(0, -1)) {
        await this.volume.promises.mkdir(dirPath, { recursive: true });
      }

      await this.volume.promises.writeFile(fullPath, content);
    }
  }

  /**
   * Creates multiple packages at once
   */
  async createPackages(
    packages: Array<{ path: string; package: VirtualPackage }>
  ): Promise<void> {
    await Promise.all(
      packages.map(({ path, package: pkg }) => this.createPackage(path, pkg))
    );
  }

  /**
   * Gets the underlying memfs instance for use with enhanced-resolve
   */
  getFileSystem(): InstanceType<typeof Volume> {
    return this.volume;
  }

  /**
   * Lists all files in the virtual filesystem (useful for debugging)
   */
  listFiles(): string[] {
    const files: string[] = [];
    const volume = this.volume;

    function walk(dir: string): void {
      try {
        const items = volume.readdirSync(dir) as string[];
        for (const item of items) {
          const fullPath = `${dir}/${item}`;
          const stat = volume.statSync(fullPath);
          if (stat.isDirectory()) {
            walk(fullPath);
          } else {
            files.push(fullPath);
          }
        }
      } catch {
        // Ignore errors
      }
    }

    walk('/');
    return files;
  }
}
