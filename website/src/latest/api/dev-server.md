# DevServer

The Re.Pack DevServer is built on top of [Fastify](https://fastify.dev/) and provides a subset of `webpack-dev-server`  configuration options.

## Usage

The DevServer is configured through the `devServer` option in your configuration:

```js title="rspack.config.mjs"
import * as Repack from '@callstack/repack';

export default {
  // ... other options
  devServer: {
    port: 8081,
    host: 'localhost', 
    hot: true,
    // ... other DevServer options
  },
  plugins: [
    new Repack.RepackPlugin(),
  ],
};
```

## Configuration Options

### host

- Type: `string`
- Default: `'localhost'`

Hostname or IP address under which to run the development server. 

Supported special values:

- `'local-ip'` - Listen on all available network interfaces
- `'local-ipv4'` - Listen on local IPv4 address
- `'local-ipv6'` - Listen on local IPv6 address

### port

- Type: `number`
- Default: `8081`

Port under which to run the development server.

### hot

- Type: `boolean`
- Default: `true`

Whether to enable Hot Module Replacement (HMR).

### server

- Type: `'http' | 'https' | { type: 'http' } | { type: 'https'; options?: HttpsServerOptions }`
- Default: `'http'`

Options for running the server as HTTPS. When set to `'https'` or `{ type: 'https' }`, the server will run with HTTPS using default options. For custom HTTPS configuration, provide an options object.

```js title="rspack.config.mjs"
import fs from 'node:fs';

export default {
  devServer: {
    server: 'https', // Simple HTTPS with default options
    // or
    server: {
      type: 'https',
      options: {
        key: fs.readFileSync('/path/to/server.key'),
        cert: fs.readFileSync('/path/to/server.crt'),
      },
    },
  },
};
```

### proxy

- Type: `ProxyConfig[]`
- Default: `undefined`

Configuration for proxying API requests. Each entry in the array defines a proxy rule that forwards matching requests to a target server.

```ts
interface ProxyConfig extends ProxyOptions {
  path?: ProxyOptions['pathFilter'];
  context?: ProxyOptions['pathFilter'];
}
```

The `ProxyConfig` extends [http-proxy-middleware](https://github.com/chimurai/http-proxy-middleware) options with webpack-dev-server compatible aliases:
- `path` - Alias for `pathFilter`
- `context` - Alias for `pathFilter`

```js title="rspack.config.mjs"
export default {
  devServer: {
    proxy: [
      {
        context: ['/api', '/auth'],
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      {
        path: '/graphql',
        target: 'http://localhost:4000',
        ws: true, // Proxy websockets
      },
    ],
  },
};
```

### setupMiddlewares

- Type: `SetupMiddlewaresFunction`
- Default: `undefined`

Function to customize middleware setup, allowing you to reorder, modify, or add custom middlewares.

```ts
type SetupMiddlewaresFunction = (
  middlewares: Middleware[],
  devServer: FastifyInstance
) => Middleware[];
```

The function receives:
- `middlewares` - Array of built-in middlewares
- `devServer` - Fastify server instance

Built-in middlewares include:
- `dev-middleware` - `@react-native/dev-middleware` enabling use of [React Native Devtools](/docs/features/devtools) 
- `proxy-middleware-*` - proxy middlewares created via [proxy](#proxy)

```js title="rspack.config.mjs"
export default {
  devServer: {
    setupMiddlewares: (middlewares, devServer) => {
      // Add custom middleware before built-ins
      middlewares.unshift({
        name: 'auth-middleware',
        middleware: (req, res, next) => {
          // Custom authentication logic
          next();
        },
      });
      
      // Add custom route
      devServer.get('/health', async () => {
        return { status: 'ok' };
      });
      
      return middlewares;
    },
  },
};
```

## Example

### Add middleware while respecting middlewares order

Use `unshift()` to run middleware before all other middlewares
or use `push()` to run middleware after all other middlewares:

```js title="rspack.config.mjs"
export default {
  devServer: {
    setupMiddlewares: (middlewares, devServer) => {
      // add before every other middleware
      middlewares.unshift({
        name: 'first-in-array',
        path: '/foo/path',
        middleware: (req, res) => {
          res.send('Foo!');
        },
      });

      // add after every other middleware
      middlewares.push({
        name: 'hello-world-test-one',
        path: '/foo/bar',
        middleware: (req, res) => {
          res.send('Foo Bar!');
        },
      });

      return middlewares;
    },
  },
};
```

### Add new route to the DevServer directly

```js title="rspack.config.mjs"
export default {
  devServer: {
    setupMiddlewares: (middlewares, devServer) => {
      devServer.get('/some/path', (_, response) => {
        response.send('/some/path GET response');
      });

      return middlewares;
    },
  },
};
```

### Access the DevServer logger

Access the DevServer instance for routes and logging:

```js title="rspack.config.mjs"
export default {
  devServer: {
    setupMiddlewares: (middlewares, devServer) => {
      devServer.get('/test', (_, response) => {
        response.send('GET test response');
        devServer.log.info('GET /test called');
      });

      return middlewares;
    },
  },
};
```