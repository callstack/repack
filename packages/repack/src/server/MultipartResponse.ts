/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IncomingHttpHeaders } from 'http';
import { PassThrough } from 'stream';
import { FastifyReply } from 'fastify';
import { FastifyRequest } from 'fastify';

const CRLF = '\r\n';
const BOUNDARY = '3beqjf3apnqeu3h5jqorms4i';

/**
 * an implementation of https://github.com/facebook/metro/blob/347b1d7ed87995d7951aaa9fd597c04b06013dac/packages/metro/src/Server/MultipartResponse.js
 */
export class MultipartResponse {
  static wrap<Req extends FastifyRequest, Res extends FastifyReply>(
    req: Req,
    res: Res
  ) {
    if (acceptsMultipartResponse(req)) {
      return new MultipartResponse(res);
    }

    return undefined;
  }

  headers: IncomingHttpHeaders;
  stream: PassThrough;

  constructor(res: FastifyReply) {
    this.headers = {};
    this.stream = new PassThrough();

    res
      .code(200)
      .header('Content-Type', `multipart/mixed; boundary="${BOUNDARY}"`)
      .send(this.stream);
  }

  writeChunk<T>(headers: IncomingHttpHeaders, data: T, isLast = false) {
    let chunk = `${CRLF}--${BOUNDARY}${CRLF}`;
    if (headers) {
      chunk += MultipartResponse.serializeHeaders(headers) + CRLF + CRLF;
    }

    if (data) {
      chunk += data;
    }

    if (isLast) {
      chunk += `${CRLF}--${BOUNDARY}--${CRLF}`;
    }

    this.stream.write(chunk);
  }

  writeHead(status: string, headers: IncomingHttpHeaders) {
    // We can't actually change the response HTTP status code
    // because the headers have already been sent
    this.setHeader('X-Http-Status', status);
    if (!headers) {
      return;
    }
    for (const key in headers) {
      this.setHeader(key, headers[key]);
    }
  }

  setHeader(name: string, value: string | string[] | undefined) {
    this.headers[name] = value;
  }

  end<T>(data: T) {
    this.writeChunk(this.headers, data, true);
    this.stream.end();
  }

  static serializeHeaders(headers: IncomingHttpHeaders) {
    return Object.keys(headers)
      .map((key) => `${key}: ${headers[key]}`)
      .join(CRLF);
  }
}

function acceptsMultipartResponse(req: FastifyRequest) {
  return req.headers && req.headers.accept === 'multipart/mixed';
}
