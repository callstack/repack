import { LoaderContext } from 'loader-utils';

export async function getFilesInDirectory(
  dirname: string,
  fs: LoaderContext['fs']
) {
  return await new Promise<string[]>((resolve, reject) =>
    fs.readdir(dirname, (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(
          (results as Array<any> | undefined)?.filter(
            (result) => typeof result === 'string'
          ) ?? []
        );
      }
    })
  );
}
