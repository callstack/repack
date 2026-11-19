import {
  addDebugIdToSourceMap,
  getSourceMapDebugId,
} from '../sourceMapDebugId.js';

const DEBUG_ID = '3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f';

describe('sourceMapDebugId', () => {
  it('adds both spellings of the Debug ID', () => {
    const sourceMap = addDebugIdToSourceMap(
      JSON.stringify({ version: 3, mappings: 'AAAA' }, null, 2) + '\n',
      DEBUG_ID
    );

    expect(JSON.parse(sourceMap)).toEqual({
      version: 3,
      mappings: 'AAAA',
      debugId: DEBUG_ID,
      debug_id: DEBUG_ID,
    });
  });

  it('adds the Debug ID to an empty source map', () => {
    expect(JSON.parse(addDebugIdToSourceMap('{}', DEBUG_ID))).toEqual({
      debugId: DEBUG_ID,
      debug_id: DEBUG_ID,
    });
  });

  it('throws when the source map is not a JSON object', () => {
    expect(() => addDebugIdToSourceMap('', DEBUG_ID)).toThrow();
  });

  it('reads either spelling of the Debug ID', () => {
    expect(getSourceMapDebugId(`{"debugId":"${DEBUG_ID}"}`)).toBe(DEBUG_ID);
    expect(getSourceMapDebugId(`{"debug_id":"${DEBUG_ID}"}`)).toBe(DEBUG_ID);
  });

  it('ignores a Debug ID inside sourcesContent', () => {
    const sourceMap = JSON.stringify({
      sourcesContent: [`const map = {"debugId": "${DEBUG_ID}"};`],
      names: ['debugId'],
    });

    expect(getSourceMapDebugId(sourceMap)).toBeUndefined();
  });
});
