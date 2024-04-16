import path from 'path';
import { fileURLToPath } from 'url';
import fastifyFavicon from 'fastify-favicon';
import type { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';

// @ts-ignore
const dirname = path.dirname(fileURLToPath(import.meta.url));
const pathToImgDir = path.join(dirname, '../../img');

async function faviconPlugin(instance: FastifyInstance) {
  instance.register(fastifyFavicon, { path: pathToImgDir });
}

export default fastifyPlugin(faviconPlugin, {
  name: 'favicon-plugin',
});
