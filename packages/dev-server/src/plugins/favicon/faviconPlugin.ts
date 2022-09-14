import fastifyFavicon from 'fastify-favicon';
import type { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';

// @ts-ignore
const pathToImg = new URL('../../img', import.meta.url).pathname;

async function faviconPlugin(instance: FastifyInstance) {
  instance.register(fastifyFavicon, { path: pathToImg });
}

export default fastifyPlugin(faviconPlugin, {
  name: 'favicon-plugin',
});
