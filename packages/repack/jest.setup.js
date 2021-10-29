// eslint-disable-next-line import/no-extraneous-dependencies
const { Headers } = require('node-fetch/lib/index.js');

jest.spyOn(process, 'cwd').mockImplementation(() => '/a/b/c');

global.__DEV__ = false;
global.__repack__ = { loadChunkCallback: [] };
global.__webpack_get_script_filename__ = (url) => `${url}.chunk.bundle`;
global.Headers = Headers;
global.FormData = class FormData {};
