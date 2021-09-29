import { DASHBOARD_API_PATH, DEV_SERVER_HTTP_URL } from '../constants';

export async function fetchPlatforms() {
  const response = await fetch(
    `${DEV_SERVER_HTTP_URL}${DASHBOARD_API_PATH}/platforms`
  );

  const { platforms } = (await response.json()) as {
    platforms: Array<{ id: string; port: number }>;
  };

  return platforms;
}
