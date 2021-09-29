import { DASHBOARD_API_PATH, DEV_SERVER_HTTP_URL } from '../constants';

export async function fetchServerLogs(): Promise<any[]> {
  const response = await fetch(
    `${DEV_SERVER_HTTP_URL}${DASHBOARD_API_PATH}/server-logs`
  );
  const { logs } = await response.json();

  return logs;
}
