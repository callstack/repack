/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified by Callstack, 2025.
 */

/**
 * Original source code reference:
 * https://github.com/facebook/metro/blob/dde4a4966faee3bcca68b95137c6f44cc4fe4cf2/packages/metro-core/src/Terminal.js
 */

import readline from 'node:readline';
import tty from 'node:tty';
import util from 'node:util';
import throttle from 'throttleit';

type UnderlyingStream = NodeJS.WritableStream;
type StreamChunk = Buffer | Uint8Array | string;

const moveCursor = util.promisify(readline.moveCursor);
const clearScreenDown = util.promisify(readline.clearScreenDown);
type WriteCallback = (error?: Error | null) => void;
type ExternalWrite = {
  chunk: StreamChunk;
  encoding?: BufferEncoding;
  callback?: WriteCallback;
};

/**
 * Cut a string into an array of string of the specific maximum size. A newline
 * ends a chunk immediately (it's not included in the "." RexExp operator), and
 * is not included in the result.
 * When counting we should ignore non-printable characters. In particular the
 * ANSI escape sequences (regex: /\x1B\[([0-9]{1,2}(;[0-9]{1,2})?)?m/)
 * (Not an exhaustive match, intended to match ANSI color escapes)
 * https://en.wikipedia.org/wiki/ANSI_escape_code
 */
function chunkString(str: string, size: number): Array<string> {
  const ANSI_COLOR = '\x1B\\[([0-9]{1,2}(;[0-9]{1,2})?)?m';
  const SKIP_ANSI = `(?:${ANSI_COLOR})*`;
  return str.match(new RegExp(`(?:${SKIP_ANSI}.){1,${size}}`, 'g')) || [];
}

/**
 * Get the stream as a TTY if it effectively looks like a valid TTY.
 */
function getTTYStream(stream: UnderlyingStream): tty.WriteStream | null {
  if (
    stream instanceof tty.WriteStream &&
    stream.isTTY &&
    stream.columns >= 1
  ) {
    return stream;
  }
  return null;
}

/**
 * We don't just print things to the console, sometimes we also want to show
 * and update progress. This utility just ensures the output stays neat: no
 * missing newlines, no mangled log lines.
 *
 *     const terminal = Terminal.default;
 *     terminal.status('Updating... 38%');
 *     terminal.log('warning: Something happened.');
 *     terminal.status('Updating, done.');
 *     terminal.persistStatus();
 *
 * The final output:
 *
 *     warning: Something happened.
 *     Updating, done.
 *
 * Without the status feature, we may get a mangled output:
 *
 *     Updating... 38%warning: Something happened.
 *     Updating, done.
 *
 * This is meant to be user-readable and TTY-oriented. We use stdout by default
 * because it's more about status information than diagnostics/errors (stderr).
 *
 * Do not add any higher-level functionality in this class such as "warning" and
 * "error" printers, as it is not meant for formatting/reporting. It has the
 * single responsibility of handling status messages.
 */
class Terminal {
  _logLines: Array<string>;
  _nextStatusStr: string;
  _statusStr: string;
  _stream: UnderlyingStream;
  _ttyStream: tty.WriteStream | null;
  // Bound reference to the original stream.write. We keep this so our
  // interception layer can still delegate to the real writer.
  _rawStreamWrite: (...args: Array<any>) => boolean;
  // Writes performed outside Terminal.log/status while a status is visible.
  // We replay them in _update() so they are not erased by status redraws.
  _externalWrites: Array<ExternalWrite>;
  _updatePromise: Promise<void> | null;
  _isUpdating: boolean;
  // Guards our own cursor/status writes from being treated as "external".
  _isInternalWrite: boolean;
  _isPendingUpdate: boolean;
  _shouldFlush: boolean;
  _writeStatusThrottled: (status: string) => void;

  constructor(
    stream: UnderlyingStream,
    { ttyPrint = true }: { ttyPrint?: boolean } = {}
  ) {
    this._logLines = [];
    this._nextStatusStr = '';
    this._statusStr = '';
    this._stream = stream;
    this._ttyStream = ttyPrint ? getTTYStream(stream) : null;
    this._rawStreamWrite = stream.write.bind(stream) as (
      ...args: Array<any>
    ) => boolean;
    this._externalWrites = [];
    this._updatePromise = null;
    this._isUpdating = false;
    this._isInternalWrite = false;
    this._isPendingUpdate = false;
    this._shouldFlush = false;
    this._writeStatusThrottled = throttle((status) => {
      this._writeRaw(status);
    }, 3500);

    this._patchTTYStreamWrites();
  }

  _patchTTYStreamWrites(): void {
    if (!this._ttyStream) {
      return;
    }

    // In interactive TTY mode, status redraw uses cursor movement + clear.
    // Any direct stream.write from other sources (plugins, other loggers)
    // can be wiped by that redraw. Intercept those writes and route them
    // through _update() so they are persisted above the status line.
    this._stream.write = ((
      chunk: StreamChunk,
      encodingOrCallback?: BufferEncoding | WriteCallback,
      maybeCallback?: WriteCallback
    ) => {
      const encoding =
        typeof encodingOrCallback === 'string' ? encodingOrCallback : undefined;
      const callback =
        typeof encodingOrCallback === 'function'
          ? encodingOrCallback
          : maybeCallback;

      const shouldCaptureExternalWrite =
        !this._isInternalWrite && this._hasVisibleStatus();

      if (!shouldCaptureExternalWrite) {
        return this._writeRaw(chunk, encoding, callback);
      }

      // Queue for replay in _update() before status is drawn again.
      this._externalWrites.push({ chunk, encoding, callback });
      this._scheduleUpdate();
      return true;
    }) as UnderlyingStream['write'];
  }

  _writeRaw(
    chunk: StreamChunk,
    encoding?: BufferEncoding,
    callback?: WriteCallback
  ): boolean {
    if (encoding !== undefined) {
      return this._rawStreamWrite(chunk, encoding, callback);
    }

    if (callback) {
      return this._rawStreamWrite(chunk, callback);
    }

    return this._rawStreamWrite(chunk);
  }

  async _writeInternal(
    chunk: StreamChunk,
    encoding?: BufferEncoding
  ): Promise<void> {
    // Wrap stream writes in a promise so _update() can preserve ordering:
    // clear old status -> logs/external writes -> new status.
    await new Promise<void>((resolve, reject) => {
      this._isInternalWrite = true;

      const done: WriteCallback = (error) => {
        this._isInternalWrite = false;
        if (error) {
          reject(error);
          return;
        }
        resolve();
      };

      try {
        this._writeRaw(chunk, encoding, done);
      } catch (error) {
        this._isInternalWrite = false;
        reject(error as Error);
      }
    });
  }

  _hasVisibleStatus(): boolean {
    return this._statusStr.length > 0 || this._nextStatusStr.length > 0;
  }

  async _clearCurrentStatus(
    ttyStream: tty.WriteStream,
    statusStr: string
  ): Promise<void> {
    const statusLinesCount = statusStr.split('\n').length - 1;
    // extra -1 because we print the status with a trailing new line
    this._isInternalWrite = true;
    try {
      await moveCursor(ttyStream, -ttyStream.columns, -statusLinesCount - 1);
      await clearScreenDown(ttyStream);
    } finally {
      this._isInternalWrite = false;
    }
  }

  /**
   * Schedule an update of the status and log lines.
   * If there's an ongoing update, schedule another one after the current one.
   * If there are two updates scheduled, do nothing, as the second update will
   * take care of the latest status and log lines.
   */
  _scheduleUpdate() {
    if (this._isUpdating) {
      this._isPendingUpdate = true;
      return;
    }

    this._isUpdating = true;
    this._updatePromise = this._update().then(async () => {
      while (this._isPendingUpdate) {
        if (!this._shouldFlush) {
          await new Promise((resolve) => setTimeout(resolve, 33));
        }
        this._isPendingUpdate = false;
        await this._update();
      }
      this._isUpdating = false;
      this._shouldFlush = false;
    });
  }

  async waitForUpdates(): Promise<void> {
    await (this._updatePromise || Promise.resolve());
  }

  /**
   * Useful for calling console/stdout directly after terminal logs
   * Otherwise, you could end up with mangled output when the queued
   * update starts writing to stream after a delay.
   */
  async flush(): Promise<void> {
    if (this._isUpdating) {
      this._shouldFlush = true;
    }
    await this.waitForUpdates();
    // @ts-expect-error missing type on throttle return
    this._writeStatusThrottled.flush?.();
  }

  /**
   * Clear and write the new status, logging in bulk in-between. Doing this in a
   * throttled way (in a different tick than the calls to `log()` and
   * `status()`) prevents us from repeatedly rewriting the status in case
   * `terminal.log()` is called several times.
   */
  async _update(): Promise<void> {
    const ttyStream = this._ttyStream;

    const nextStatusStr = this._nextStatusStr;
    const statusStr = this._statusStr;
    const logLines = this._logLines;
    const externalWrites = this._externalWrites;

    // reset these here to not have them changed while updating
    this._statusStr = nextStatusStr;
    this._logLines = [];
    this._externalWrites = [];

    if (
      statusStr === nextStatusStr &&
      logLines.length === 0 &&
      externalWrites.length === 0
    ) {
      return;
    }

    if (ttyStream && statusStr.length > 0) {
      await this._clearCurrentStatus(ttyStream, statusStr);
    }

    if (logLines.length > 0) {
      await this._writeInternal(logLines.join('\n') + '\n');
    }

    if (externalWrites.length > 0) {
      // Preserve third-party stdout lines by writing them after the clear and
      // before redrawing status. This keeps status live while avoiding "eaten"
      // plugin output lines.
      for (const externalWrite of externalWrites) {
        try {
          await this._writeInternal(
            externalWrite.chunk,
            externalWrite.encoding
          );
          externalWrite.callback?.(null);
        } catch (error) {
          externalWrite.callback?.(error as Error);
          throw error;
        }
      }
    }

    if (ttyStream) {
      if (nextStatusStr.length > 0) {
        await this._writeInternal(nextStatusStr + '\n');
      }
    } else {
      this._writeStatusThrottled(
        nextStatusStr.length > 0 ? nextStatusStr + '\n' : ''
      );
    }
  }

  /**
   * Shows some text that is meant to be overriden later. Return the previous
   * status that was shown and is no more. Calling `status()` with no argument
   * removes the status altogether. The status is never shown in a
   * non-interactive terminal: for example, if the output is redirected to a
   * file, then we don't care too much about having a progress bar.
   */
  status(format: string, ...args: Array<any>): string {
    const { _nextStatusStr } = this;

    const statusStr = util.format(format, ...args);
    this._nextStatusStr = this._ttyStream
      ? chunkString(statusStr, this._ttyStream.columns).join('\n')
      : statusStr;

    this._scheduleUpdate();

    return _nextStatusStr;
  }

  /**
   * Similar to `console.log`, except it moves the status/progress text out of
   * the way correctly. In non-interactive terminals this is the same as
   * `console.log`.
   */
  log(format: string, ...args: Array<any>): void {
    this._logLines.push(util.format(format, ...args));
    this._scheduleUpdate();
  }

  /**
   * Log the current status and start from scratch. This is useful if the last
   * status was the last one of a series of updates.
   */
  persistStatus(): void {
    this.log(this._nextStatusStr);
    this._nextStatusStr = '';
  }
}

const COMPILED_REGEX = /Compiled/;

/**
 * Terminal that keeps separate status lines per platform
 * and renders them together as a multi-line status.
 */
class MultiPlatformTerminal extends Terminal {
  private platformStatuses: Map<string, string> = new Map();

  status(platform: string, ...args: Array<any>): string {
    if (this.checkAllPlatformsDone()) {
      this.persistStatus();
      this.platformStatuses.clear();
      return '';
    }

    this.platformStatuses.set(platform, util.format(...args));
    return super.status(this.buildCombinedStatus());
  }

  private buildCombinedStatus(): string {
    const lines: string[] = [];

    for (const [, status] of this.platformStatuses) {
      if (status) lines.push(status);
    }

    return lines.join('\n');
  }

  private checkAllPlatformsDone(): boolean {
    const statuses = [...this.platformStatuses.values()];
    return Boolean(
      statuses.length && statuses.every((status) => COMPILED_REGEX.test(status))
    );
  }
}

export { MultiPlatformTerminal, Terminal };
