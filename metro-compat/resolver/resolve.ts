import memfs from 'memfs';

function createFilesystemFromFileMap(fileMap) {
  const filesystem = new memfs.Volume();
}

export function resolve(context, request, platform) {
  console.log(context, request, platform);
  return '';
}
