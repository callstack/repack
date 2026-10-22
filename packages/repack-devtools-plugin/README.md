# @callstack/repack-devtools-plugin

Private, workspace-only [Rozenite](https://www.rozenite.dev) plugin for
debugging Re.Pack apps. It is not published; the tester apps install it from
the workspace.

- **Panels** in React Native DevTools: ScriptManager scripts and events,
  Module Federation state and runtime events, dev-server compilation and
  request log, errors and symbolication.
- **Agent tools** (`rozenite agent callstack/repack-devtools <tool>`), the
  same data plus actions (`load-script`, `load-remote`, `invalidate-scripts`,
  `symbolicate`, `reload`, …), a trace of every ScriptManager call
  (`list-script-calls`), ScriptManager internals (`get-script-manager`), and
  fault injection in the app and on dev servers (`inject-script-fault`,
  `inject-server-fault`), with computed diagnostics in `get-overview`.
- **Dev-server endpoints**: `GET /repack-devtools/state`,
  `GET /repack-devtools/compilation?platform=…`, `POST /repack-devtools/clear`,
  `GET|POST|DELETE /repack-devtools/faults`.

Usage, tool reference and debugging playbooks:
[`.agents/skills/repack-debug-runtime`](../../.agents/skills/repack-debug-runtime/SKILL.md).
Design: [`agent_context/repack-devtools-oct2026`](../../agent_context/repack-devtools-oct2026/design.md).

## Setup in an app

```js
// index.js: first, so startup is recorded
import { installRepackDevTools } from '@callstack/repack-devtools-plugin';
installRepackDevTools({ boot: true });

// App root
import { useRepackDevTools } from '@callstack/repack-devtools-plugin';
useRepackDevTools();
```

```js
// rspack.config.mjs / webpack.config.mjs
import { withRepackDevTools } from '@callstack/repack-devtools-plugin/bundler';
import { withRozenite } from '@rozenite/repack';

const enabled = process.env.WITH_ROZENITE === 'true';
export default withRozenite(withRepackDevTools(config, { enabled }), { enabled });
```

For Module Federation 2, optionally add the runtime plugin so events are
recorded from container start-up:

```js
runtimePlugins: [require.resolve('@callstack/repack-devtools-plugin/mf-runtime-plugin')],
```

## Development

```sh
pnpm --filter @callstack/repack-devtools-plugin build      # stop dev servers first
pnpm --filter @callstack/repack-devtools-plugin test
pnpm --filter @callstack/repack-devtools-plugin typecheck
```
