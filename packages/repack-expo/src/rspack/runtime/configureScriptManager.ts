import { Script, ScriptManager } from '@callstack/repack/client';
import { registerLocalChunkResolver } from './localChunkResolver.js';

registerLocalChunkResolver({
  isDev: __DEV__,
  script: Script,
  scriptManager: ScriptManager.shared,
});
