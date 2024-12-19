import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance } from 'fastify';
import fastifyFavicon from 'fastify-favicon';
import fastifyPlugin from 'fastify-plugin';

// @ts-ignore
const dirname = path.dirname(fileURLToPath(import.meta.url));
const pathToImgDir = path.join(dirname, '../../../static');

async function faviconPlugin(instance: FastifyInstance) {
  instance.register(fastifyFavicon, { path: pathToImgDir });
}

export default fastifyPlugin(faviconPlugin, {
  name: 'favicon-plugin',
});
