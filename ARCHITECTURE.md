# Architecture

This document describes the high-level architecture of Re.Pack.
If you want to familiarize yourself with the code base, you are just in the right place!

Before you start, make sure you've gone through the [README](./README.md).

Feel free to jump between this document and [Documentation](https://re-pack.netlify.app/)
for an additional context on configuration, parameters and types.

## General overview

There are 2 ways to look at the content of the Re.Pack:

- by command that are exposed to React Native CLI
- by Webpack plugins and utilities

Here's a chart that represents both aspect of the codebase:

![Overview of Re.Pack codebase](./overview.png)

## Structure

The following list describes the components that create Re.Pack:

- `packages`
  - `repack` — Main source code for Re.Pack
    - `ios` — source code for iOS native module
    - `android` — source coce for Android native module
    - `src/`
      - `client/`
        - `runtime/` — Source code for runtime code embedded into a final bundle.
        - `chunks-api/` — Source code for `ChunkManager` used for dealing with Code Splitting.
      - `commands/` — Source code for React Native CLI commands.
      - `server/` — Source code for Development server, proxy and all related functionality.
      - `webpack/` — Source code for Webpack plugins and utilities.
  - `debugger-ui` — Source code for Chrome Remote JS debugger.
  - `TesterApp` — Example tester application.
- `templates/` — Templates for files to initialize a new project.

## Bundling

The core of bundling functionality is to load platform-specific Webpack configuration file, then using Webpack API, create and run a compiler.

Depending on how code is run, the final Webpack configuration might be different:

- if Webpack and Re.Pack are run by React Native CLI, it provides data to functions like `getMode`, `getContext` etc.
- if Webpack and Re.Pack are run by Webpack CLI, the results for functions like `getMode`, `getContext`, etc is based on `fallback` values.

## Development server

When running a development server, there is a wide difference in the functionality provided by `(webpack-)start` command and Webpack CLI:

- Webpack CLI:
  - Will create platform-specific Webpack configuration, so when the compiler calls `DevSeverPlugin`, a platform-specific `DevServer` will be created.
  - The platform-specific `DevServer` has all the required features (debugging, symbolication, logging, message/events WebSocket server, HMR, Dev endpoints).
- `webpack-start`:
  - Uses `DevServerProxy`, which sole purpose is to allow running multiple Webpack compilers for multiple platforms.
  - Each platform will get its own _compiler worker_, which runs Webpack compiler in watch mode. For each compilation a platform-specific Webpack
  configuration will be created, which will include platform-specific `DevServer`.
  - Each platform-specific `DevServer` will listen on randomly picked free-port.
  - `DevServerProxy` will handle the creation of said workers, as well as forwarding the requests based on `?platform=<platform>` query param.
  - Additionally `DevServerProxy` has the same Dev endpoints as `DevServer` (they both extend `BaseDevServer`) and dedicated `POST /symbolicate` endpoint.

The overall architecture of `DevServerProxy` is as follows:
```
`DevServerProxy`
├── <compiler worker platform=ios>
│   └── <webpack compilation>
│       └── `DevServerPlugin`
│           └── `DevServer`
├── <compiler worker platform=android>
│   └── <webpack compilation>
│       └── `DevServerPlugin`
│           └── `DevServer`
└── ...
```

Check [`getDevServerOptions` function](https://re-pack.netlify.app/docs/api/functions/getDevServerOptions) for details on configuration options that the `DevServer` or `DevServerProxy` will receive.
  
## Logging

Depending on how you run Re.Pack the logging works slightly differently, but
the end destination for all logs is `Reporter` instance — this is the place where all logs are
written to the terminal and/or file. The route that each log takes to get to the reporter instance
will differ.

The top-level `Reporter` instance will also try to broadcast logs to the connected Flipper instance
under _React Native_ -> _Logs_ with tag `repack_<type>` where `type` can be `debug`, `info`, `warn`
or `error`. Because of the Flipper tight integration with Metro all Re.Pack
logs will be reported as `verbose` so make sure you sent the filter to include type `Verbose`
and use searching to filter logs e.g. by typing `repack_debug`.

### Bundling with `webpack-bundle` command and Webpack CLI / Running with development server via Webpack CLI

> Read as stack trace, from bottom to the top.

```
<terminal/file>
└── Reporter
    └── LoggerPlugin
        ├── <webpack stats>
        ├── compilation.hooks.log
        └── compiler.hooks.infrastructureLog
            └── DevServerPlugin
                └── DevServer
```

### Running with development server via `webpack-start` command

> Read as stack trace, from bottom to the top.

```
<terminal>
└── Reporter
    └── DevServerProxy
        └── <compiler worker>
            └── Reporter <file: if enabled> (format: json)
                └── LoggerPlugin
                    ├── <webpack stats>
                    ├── compilation.hooks.log
                    └── compiler.hooks.infrastructureLog
                        └── DevServerPlugin
                            └── DevServer
```