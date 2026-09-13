const assert = require('node:assert/strict');
const test = require('node:test');

const {
  LOCAL_CHUNK_RESOLVER_KEY,
  createLocalChunkResolver,
  registerLocalChunkResolver,
} = require('../dist/rspack/runtime/localChunkResolver.js');

function createScript() {
  return {
    getDevServerURL: (scriptId) => `dev:${scriptId}`,
    getFileSystemURL: (scriptId) => `file:${scriptId}`,
  };
}

test('resolves local chunks from the development server without caching', async () => {
  const resolver = createLocalChunkResolver({
    isDev: true,
    script: createScript(),
  });

  assert.deepEqual(
    await resolver('chunk-1', 'caller-a', 'https://example.test/reference-a'),
    { cache: false, url: 'dev:chunk-1' }
  );
  assert.deepEqual(
    await resolver('chunk-1', 'caller-b', 'https://example.test/reference-b'),
    { cache: false, url: 'dev:chunk-1' }
  );
});

test('resolves packaged local chunks from the filesystem in release', async () => {
  const resolver = createLocalChunkResolver({
    isDev: false,
    script: createScript(),
  });

  assert.deepEqual(await resolver('chunk-2'), {
    cache: false,
    url: 'file:chunk-2',
  });
});

test('registers once per stable key below a federation resolver', async () => {
  const registrations = [];
  const scriptManager = {
    addResolver(resolver, options = {}) {
      const registration = {
        key: options.key,
        priority: options.priority ?? 2,
        resolver,
      };
      const previous = registrations.findIndex(
        (item) => item.key === options.key
      );
      if (previous >= 0) registrations.splice(previous, 1);
      registrations.push(registration);
      registrations.sort((left, right) => right.priority - left.priority);
    },
  };

  registerLocalChunkResolver({
    isDev: true,
    script: createScript(),
    scriptManager,
  });
  registerLocalChunkResolver({
    isDev: false,
    script: createScript(),
    scriptManager,
  });
  scriptManager.addResolver(
    async (scriptId, caller, referenceUrl) =>
      scriptId === 'Widget' || caller === 'Widget'
        ? { url: `${referenceUrl}/${scriptId}` }
        : undefined,
    { key: 'Widget' }
  );

  assert.equal(registrations.length, 2);
  const localRegistration = registrations.find(
    (item) => item.key === LOCAL_CHUNK_RESOLVER_KEY
  );
  assert.equal(localRegistration.priority, 1);

  async function resolve(scriptId, caller, referenceUrl) {
    for (const registration of registrations) {
      const locator = await registration.resolver(
        scriptId,
        caller,
        referenceUrl
      );
      if (locator) return locator;
    }
  }

  assert.deepEqual(await resolve('Widget', 'main', 'https://widgets.example'), {
    url: 'https://widgets.example/Widget',
  });
  assert.deepEqual(await resolve('chunk-3', 'main'), {
    cache: false,
    url: 'file:chunk-3',
  });
});
