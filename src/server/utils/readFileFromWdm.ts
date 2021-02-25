import { WebpackDevMiddleware } from 'webpack-dev-middleware';

export function readFileFromWdm(
  wdm: WebpackDevMiddleware,
  filename: string
): Promise<string | Buffer> {
  const sourceMapFilename =
    wdm.context.compiler.options.output.sourceMapFilename || `${filename}.map`;

  return new Promise<string | Buffer>((resolve, reject) =>
    wdm.context.outputFileSystem.readFile(
      sourceMapFilename,
      (error, content) => {
        if (error || !content) {
          reject(error);
        } else {
          resolve(content);
        }
      }
    )
  );
}
