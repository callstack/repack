import path from 'path';
import { URL } from 'url';

export function getDirname(fileUrl: string) {
  return path.dirname(new URL(fileUrl).pathname);
}
