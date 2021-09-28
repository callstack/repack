import { DASHBOARD_API_PATH, DEV_SERVER_HTTP_URL } from '../constants';
import { Stats } from '../types';

export async function fetchStats(platform: string): Promise<Stats> {
  const response = await fetch(
    `${DEV_SERVER_HTTP_URL}${DASHBOARD_API_PATH}/stats?platform=${platform}`
  );
  const stats = await response.json();

  return stats;
}
