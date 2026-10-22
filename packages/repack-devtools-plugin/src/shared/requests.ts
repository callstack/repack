import type { DevServerRequest } from './types.js';

/** Status logged when the connection closed before a response was sent. */
export const NO_RESPONSE_STATUS = 0;

export const isFailedRequest = (request: Pick<DevServerRequest, 'status'>) =>
  request.status === NO_RESPONSE_STATUS || request.status >= 400;
