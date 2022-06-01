import { FastifyInstance, FastifyReply } from 'fastify';
import fastifyPlugin from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyReply {
    sendBundleAsset: (
      file?: string,
      platform?: string
    ) => Promise<FastifyReply>;
  }
}

export type ProgressData = { completed: number; total: number };
export type SendProgress = (data: ProgressData) => void;

export interface CompilerOptions {
  getAsset: (
    filename: string,
    platform: string,
    sendProgress?: SendProgress
  ) => Promise<string | Buffer>;
}

async function compilerPlugin(
  instance: FastifyInstance,
  options: { compiler: CompilerOptions }
) {
  async function sendBundleAsset(
    this: FastifyReply,
    file?: string,
    platform?: string
  ) {
    if (!file) {
      return this.notFound();
    }

    if (!platform) {
      return this.badRequest('Missing platform query param');
    }

    const asset = await options.compiler.getAsset(file, platform);

    return this.code(200).type('text/javascript').send(asset);
  }

  instance.decorateReply('sendBundleAsset', sendBundleAsset);
}

export default fastifyPlugin(compilerPlugin, {
  name: 'compiler-plugin',
});
