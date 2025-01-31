declare module 'webpack-dev-server' {
  export interface Configuration {
    ipc?: string | boolean | undefined;
    host?: string | undefined;
    port?: Port | undefined;
    hot?: boolean | 'only' | undefined;
    liveReload?: boolean | undefined;
    devMiddleware?:
      | DevMiddlewareOptions<
          import('express').Request<
            import('express-serve-static-core').ParamsDictionary,
            any,
            any,
            qs.ParsedQs,
            Record<string, any>
          >,
          import('express').Response<any, Record<string, any>>
        >
      | undefined;
    compress?: boolean | undefined;
    allowedHosts?: string | string[] | undefined;
    historyApiFallback?:
      | boolean
      | import('connect-history-api-fallback').Options
      | undefined;
    bonjour?:
      | boolean
      | Record<string, never>
      | import('bonjour-service').Service
      | undefined;
    watchFiles?:
      | string
      | string[]
      | WatchFiles
      | (string | WatchFiles)[]
      | undefined;
    static?: string | boolean | Static | (string | Static)[] | undefined;
    server?: ServerType<A, S> | ServerConfiguration<A, S> | undefined;
    app?: (() => Promise<A>) | undefined;
    webSocketServer?:
      | string
      | boolean
      | WebSocketServerConfiguration
      | undefined;
    proxy?: ProxyConfigArray | undefined;
    open?: string | boolean | Open | (string | Open)[] | undefined;
    setupExitSignals?: boolean | undefined;
    client?: boolean | ClientConfiguration | undefined;
    headers?:
      | Headers
      | ((
          req: Request,
          res: Response,
          context: DevMiddlewareContext<Request, Response> | undefined
        ) => Headers)
      | undefined;
    onListening?: ((devServer: Server<A, S>) => void) | undefined;
    setupMiddlewares?:
      | ((middlewares: Middleware[], devServer: Server<A, S>) => Middleware[])
      | undefined;
  }
}
