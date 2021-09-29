const IS_DEV = process.env.NODE_ENV === 'development';

export const DEV_SERVER_HTTP_URL = IS_DEV
  ? 'http://localhost:8081'
  : window.location.origin;

export const DEV_SERVER_WS_URL = `ws://${
  IS_DEV ? 'localhost:8081' : window.location.host
}`;
export const DASHBOARD_API_PATH = '/api/dashboard';
export const getCompilerWebSocketUrl = (port: number) =>
  `ws://${IS_DEV ? 'localhost' : window.location.hostname}:${port}`;
