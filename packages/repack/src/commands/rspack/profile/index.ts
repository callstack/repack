import { getRspackVersion } from '../../../helpers/index.js';

function getInstalledRspackVersion() {
  // get rid of `-beta`, `-rc` etc.
  const version = (getRspackVersion() ?? '0.0.0').split('-')[0];
  const [major, minor, patch] = version.split('.').map(Number);
  return { major, minor, patch };
}

async function getProfilingHandler() {
  const { major, minor } = getInstalledRspackVersion();
  if (major > 1 || (major === 1 && minor >= 4)) {
    return await import('./profile-1.4.js');
  }
  return await import('./profile-legacy.js');
}

export async function applyProfile(
  filterValue: string,
  traceLayer?: string,
  traceOutput?: string
) {
  const { applyProfile } = await getProfilingHandler();
  return applyProfile(filterValue, traceLayer, traceOutput);
}
