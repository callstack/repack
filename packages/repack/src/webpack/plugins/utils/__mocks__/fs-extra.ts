/* eslint-disable require-await */
import path from 'path';

class FsNode {
  value?: string;
  children?: FsNode[];

  constructor(public path: string) {}

  makeDir() {
    if (this.value !== undefined) {
      throw new Error('Node is already a file');
    }

    if (!this.children) {
      this.children = [];
    }
  }

  makeFile(value: string) {
    if (this.children) {
      throw new Error('Node is already a directory');
    }
    this.value = value;
  }

  findDir(dirname: string, create = false): FsNode {
    if (this.value !== undefined || this.children == undefined) {
      throw new Error('not a directory');
    }

    const [currentSegment, ...segments] = dirname.split(path.sep);

    if (currentSegment === '.') {
      return this;
    }

    let foundDir: FsNode | undefined;
    for (const child of this.children) {
      if (child.children && child.path === currentSegment) {
        foundDir = child.findDir(path.join(...segments), create);
      }
    }

    if (!foundDir) {
      if (create) {
        const child = new FsNode(currentSegment);
        child.makeDir();
        this.children.push(child);
        foundDir = child.findDir(path.join(...segments), create);
      } else {
        throw new Error(`directory does not exist: ${dirname}`);
      }
    }

    return foundDir;
  }
}

class FsMock {
  fs: FsNode;

  constructor() {
    this.fs = new FsNode('/');
    this.fs.makeDir();
  }

  async ensureDir(dirname: string) {
    const [, ...segments] = dirname.split(path.sep);
    this.fs.findDir(path.join(...segments), true);
  }

  async copyFile(from: string, to: string) {
    const content = await this.readFile(from);
    await this.writeFile(to, content);
  }

  async readFile(filePath: string) {
    const [, ...segments] = path.dirname(filePath).split(path.sep);
    const dirname = path.join(...segments);
    const basename = path.basename(filePath);

    const dirNode = this.fs.findDir(dirname);
    for (const child of dirNode.children ?? []) {
      if (child.path === basename) {
        if (child.value === undefined) {
          throw new Error('not a file');
        }

        return child.value;
      }
    }

    throw new Error(`no such file: ${filePath}`);
  }

  async writeFile(filePath: string, value: string) {
    const [, ...segments] = path.dirname(filePath).split(path.sep);
    const dirname = path.join(...segments);
    const basename = path.basename(filePath);

    const dirNode = this.fs.findDir(dirname);
    let found = false;
    for (const child of dirNode.children ?? []) {
      if (child.path === basename) {
        if (child.children !== undefined) {
          throw new Error(`not a file: ${filePath}`);
        }

        child.value = value;
        found = true;
        break;
      }
    }

    if (!found) {
      const file = new FsNode(basename);
      file.makeFile(value);
      dirNode.children!.push(file);
    }
  }
}

export default new FsMock();
