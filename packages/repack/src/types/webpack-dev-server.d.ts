declare module 'webpack-dev-server' {
  export interface Configuration {
    host?: 'local-ip' | 'local-ipv4' | 'local-ipv6' | string;
    port?: 'auto' | number;
    hot?: boolean;
    server?:
      | 'http'
      | 'https'
      | { type: 'http' }
      | { type: 'https'; options?: import('node:https').ServerOptions };
  }
}
