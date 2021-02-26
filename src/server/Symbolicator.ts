import { URL } from 'url';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { codeFrameColumns } from '@babel/code-frame';
import { SourceMapConsumer } from 'source-map';
import { FastifyDevServer } from './types';

const readFileAsync = promisify(fs.readFile);

export interface ReactNativeStackFrame {
  lineNumber: number | null;
  column: number | null;
  file: string | null;
  methodName: string;
}

export interface InputStackFrame extends ReactNativeStackFrame {
  file: string;
}

export interface StackFrame extends InputStackFrame {
  collapse: boolean;
}

export interface CodeFrame {
  content: string;
  location: {
    row: number;
    column: number;
  };
  fileName: string;
}

export interface SymbolicatorResults {
  codeFrame: CodeFrame | null;
  stack: StackFrame[];
}

export class Symbolicator {
  static inferPlatformFromStack(stack: ReactNativeStackFrame[]) {
    for (const frame of stack) {
      if (!frame.file) {
        return;
      }

      const { searchParams, pathname } = new URL(frame.file, 'file://');
      const platform = searchParams.get('platform');
      if (platform) {
        return platform;
      } else {
        const [bundleFilename] = pathname.split('/').reverse();
        const [, platformOrExtension, extension] = bundleFilename.split('.');
        if (extension) {
          return platformOrExtension;
        }
      }
    }
  }

  sourceMapConsumerCache: Record<string, SourceMapConsumer> = {};

  constructor(
    private projectRoot: string,
    private logger: FastifyDevServer['log'],
    private getSourceMap: (fileUrl: string) => Promise<string>
  ) {}

  async process(
    stack: ReactNativeStackFrame[]
  ): Promise<SymbolicatorResults | undefined> {
    // TODO: add debug logging
    const frames: InputStackFrame[] = [];
    for (const frame of stack) {
      const { file } = frame;
      if (file?.startsWith('http') && !file.includes('debuggerWorker')) {
        frames.push(frame as InputStackFrame);
      }
    }

    const processedFrames: StackFrame[] = [];
    for (const frame of frames) {
      if (!this.sourceMapConsumerCache[frame.file]) {
        const rawSourceMap = await this.getSourceMap(frame.file);
        const sourceMapConsumer = await new SourceMapConsumer(rawSourceMap);
        this.sourceMapConsumerCache[frame.file] = sourceMapConsumer;
      }
      const processedFrame = this.processFrame(frame);
      processedFrames.push(processedFrame);
    }

    return {
      stack: processedFrames,
      codeFrame: (await this.getCodeFrame(processedFrames)) ?? null,
    };
  }

  private processFrame(frame: InputStackFrame): StackFrame {
    if (!frame.lineNumber || !frame.column) {
      return {
        ...frame,
        collapse: false,
      };
    }

    const consumer = this.sourceMapConsumerCache[frame.file];
    if (!consumer) {
      return {
        ...frame,
        collapse: false,
      };
    }

    const lookup = consumer.originalPositionFor({
      line: frame.lineNumber,
      column: frame.column,
    });

    // If lookup fails, we get the same shape object, but with
    // all values set to null
    if (!lookup.source) {
      // It is better to gracefully return the original frame
      // than to throw an exception
      return {
        ...frame,
        collapse: false,
      };
    }

    return {
      lineNumber: lookup.line || frame.lineNumber,
      column: lookup.column || frame.column,
      file: lookup.source,
      methodName: lookup.name || frame.methodName,
      collapse: false,
    };
  }

  private async getCodeFrame(
    processedFrames: StackFrame[]
  ): Promise<CodeFrame | undefined> {
    for (const frame of processedFrames) {
      if (frame.collapse || !frame.lineNumber || !frame.column) {
        continue;
      }

      try {
        const filename = path.join(
          this.projectRoot,
          frame.file.replace('webpack://', '')
        );

        const source = await readFileAsync(filename, 'utf8');

        return {
          content: codeFrameColumns(
            source,
            {
              start: { column: frame.column, line: frame.lineNumber },
            },
            { forceColor: true }
          ),
          location: {
            row: frame.lineNumber,
            column: frame.column,
          },
          fileName: filename,
        };
      } catch (error) {
        this.logger.error(error);
      }

      return undefined;
    }
  }
}
