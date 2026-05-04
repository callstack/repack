# CodeSigningPlugin

This plugin can be used to sign chunks so that their integrity can be verified before execution. You should consider code-signing your chunks when you are using [code splitting](/docs/features/code-splitting) or [ModuleFederation](/docs/features/module-federation) and want to deliver parts of your code remotely to the end-user.

## Usage

```js title="rspack.config.cjs"
const Repack = require("@callstack/repack");

module.exports = {
  plugins: [
    new Repack.plugins.CodeSigningPlugin({
      // options
    }),
  ],
};
```

## Options

### privateKeyPath

- **Required**
- Type: `string`

Path to the private key. This can be either a relative path or an absolute one. Relative paths are resolved within `context` provided with project configuration.

### enabled

- Type: `boolean`
- Default: `true`

Whether to enable the plugin. You typically want to enable the plugin only for production builds and disable it for development.

### excludeChunks

- Type: `string[] | RegExp | RegExp[]`
- Default: `[]`

Names of chunks to exclude from code-signing. You might want to use this if some of the chunks in your setup are not being delivered remotely and don't need to be verified.

### publicKeyPath

- Type: `string`

Path to the public key file. When provided, the plugin will automatically embed the public key into native project files (`Info.plist` for iOS, `strings.xml` for Android) so that the runtime can verify signed bundles without manual file editing.

Relative paths are resolved from the project root (compiler context).

### nativeProjectPaths

- Type: `{ ios?: string; android?: string }`

Override auto-detected paths to native project files where the public key should be embedded. Only used when `publicKeyPath` is set.

- `ios` — Path to `Info.plist`. Auto-detected from `ios/<AppName>/Info.plist` if not provided.
- `android` — Path to `strings.xml`. Auto-detected from `android/app/src/main/res/values/strings.xml` if not provided.

## Guide

To add code-signing to your app, you first need to generate a pair of cryptographic keys that will be used for both signing the bundles (private key) and verifying their integrity in runtime.

### Creating key pair

In terminal, navigate to your project directory and enter the following commands:

```bash
ssh-keygen -t rsa -b 4096 -m PEM -f code-signing.pem
openssl rsa -in code-signing.pem -pubout -outform PEM -out code-signing.pem.pub
```

:::info

The passphrase must be left empty.

:::

### Add the plugin

After that, you need to add `CodeSigningPlugin` to your configuration. Make sure the `privateKeyPath` points to the location of your `code-signing.pem`.

```js title="rspack.config.cjs" {8-12}
const Repack = require("@callstack/repack");

module.exports = (env) => {
  const { mode } = env;
  return {
    plugins: [
      new Repack.RepackPlugin(),
      new Repack.plugins.CodeSigningPlugin({
        enabled: mode === "production",
        privateKeyPath: "./code-signing.pem",
        publicKeyPath: "./code-signing.pem.pub",
      }),
    ],
  };
};
```

### Add the public key

To be able to verify the bundles in runtime, the public key (`code-signing.pem.pub`) needs to be added to the native project files so that the app can verify signed bundles.

#### Automatic embedding (recommended)

When `publicKeyPath` is provided in the plugin configuration (as shown above), the plugin will **automatically** embed the public key into your native project files:

- **iOS**: Adds `RepackPublicKey` entry to `ios/<AppName>/Info.plist`
- **Android**: Adds `RepackPublicKey` string resource to `android/app/src/main/res/values/strings.xml`

The plugin auto-detects the correct file paths. If your project has a non-standard directory structure, you can specify custom paths:

```js title="rspack.config.cjs" {12-15}
const Repack = require("@callstack/repack");

module.exports = (env) => {
  const { mode } = env;
  return {
    plugins: [
      new Repack.RepackPlugin(),
      new Repack.plugins.CodeSigningPlugin({
        enabled: mode === "production",
        privateKeyPath: "./code-signing.pem",
        publicKeyPath: "./code-signing.pem.pub",
        nativeProjectPaths: {
          ios: "./ios/MyApp/Info.plist",
          android: "./android/app/src/main/res/values/strings.xml",
        },
      }),
    ],
  };
};
```

:::info

The automatic embedding modifies your source files in-place. After the first build with `publicKeyPath` set, the native files will contain the public key and subsequent builds will reuse it. If you change the key pair, the plugin will update the files automatically on the next build.

:::

#### Standalone usage

You can also use the `embedPublicKey` function independently of the plugin, for example in a setup script:

```js title="setup-code-signing.js"
const { plugins } = require("@callstack/repack");

const result = plugins.embedPublicKey({
  publicKeyPath: "./code-signing.pem.pub",
  projectRoot: __dirname,
});

console.log("iOS:", result.ios);
console.log("Android:", result.android);
```

#### Manual setup

If you prefer to add the public key manually (or if automatic detection doesn't work for your project structure), you can follow the steps below.

##### iOS

Add the public key to `ios/<appName>/Info.plist` under the name `RepackPublicKey`. Add the following to your `Info.plist` and then copy the contents of `code-signing.pem.pub` and paste them inside of the `<string>` tags:

```xml title="Info.plist"
<plist>
<dict>
	<key>RepackPublicKey</key>
	<string>
        <!-- contents of your code-signing.pem.pub -->
	</string>
</dict>
</plist>
```

##### Android

Add the public key to `android/app/src/main/res/values/strings.xml` under the name `RepackPublicKey`. Add the following to your `strings.xml` and then copy the contents of `code-signing.pem.pub` and paste them inside of the `<string>` tags:

```xml title="strings.xml"
<resources>
	<string name="RepackPublicKey">
        <!-- contents of your code-signing.pem.pub -->
	</string>
</resources>
```

### Enable verification

By default, the bundles are not verified since code-signing is entirely optional. You can enable bundle verification by modyifing the return value of `resolver` added through `ScriptManager.shared.addResolver`.

Integrity verification can be set (through `verifyScriptSignature`) to one of the 3 levels:
| Value | Description |
|---------------|-------------|
| `strict` | Always verify the integrity of the bundle |
| `lax` | Verify the integrity only if the signtarure is present |
| `off` | Never verify the integrity of the bundle |

Go to `index.js` and modify your `ScriptManager` setup like this:

```js title="index.js" {17}
import { ScriptManager, Federated } from "@callstack/repack/client";

const containers = {
  MiniApp: "http://localhost:9000/[name][ext]",
};

ScriptManager.shared.addResolver(async (scriptId, caller) => {
  const resolveURL = Federated.createURLResolver({ containers });

  const url = resolveURL(scriptId, caller);
  if (url) {
    return {
      url,
      query: { platform: Platform.OS },
      verifyScriptSignature: __DEV__ ? "off" : "strict",
    };
  }
});
```

### Use multiple public keys

If different teams sign different bundles, the resolver can provide a script-specific public key at runtime. When `publicKey` is present, Re.Pack uses it for verification. When it is omitted, Re.Pack falls back to the key embedded in the app under `RepackPublicKey`.

```js title="index.js"
import { ScriptManager, Federated } from "@callstack/repack/client";

const containers = {
  MiniApp: "https://cdn.example.com/[name][ext]",
};

ScriptManager.shared.addResolver(async (scriptId, caller) => {
  const resolveURL = Federated.createURLResolver({ containers });
  const url = resolveURL(scriptId, caller);

  if (!url) {
    return;
  }

  const metadata = await fetch(
    `https://api.example.com/miniapps/${scriptId}/bundle-metadata`
  ).then((response) => response.json());

  return {
    url,
    query: { platform: Platform.OS },
    verifyScriptSignature: __DEV__ ? "off" : "strict",
    publicKey: metadata.publicKey,
  };
});
```

:::danger Security warning

Only return public keys from a **trusted, authenticated backend**. If both the bundle and its public key can be fetched from the same untrusted location, signature verification no longer protects the download and an attacker can replace both at the same time.

:::
