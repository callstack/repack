interface RepackDevServer {
  host?: 'local-ip' | 'local-ipv4' | 'local-ipv6' | string;
  port?: number;
  hot?: boolean;
  server?:
    | 'http'
    | 'https'
    | { type: 'http' }
    | { type: 'https'; options?: import('node:https').ServerOptions };
}

// extend webpack Configuration with devServer field
export module 'webpack' {
  export interface Configuration {
    devServer?: RepackDevServer;
  }
}

// override rspack DevServer type
export module '@rspack/core' {
  export interface DevServer extends RepackDevServer {}
}
