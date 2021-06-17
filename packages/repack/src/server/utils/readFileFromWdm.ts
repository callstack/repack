import { WebpackDevMiddleware } from 'webpack-dev-middleware';

export function readFileFromWdm(
  wdm: WebpackDevMiddleware,
  filename: string
): Promise<string | Buffer> {
  return new Promise<string | Buffer>((resolve, reject) =>
    wdm.context.outputFileSystem.readFile(filename, (error, content) => {
      if (error || !content) {
        reject(error);
      } else {
        resolve(content);
      }
    })
  );
}
