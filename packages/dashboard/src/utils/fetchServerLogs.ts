import { DASHBOARD_API_PATH, DEV_SERVER_HTTP_URL } from '../constants';
import { LogEntry } from '../types';

export async function fetchServerLogs(): Promise<LogEntry[]> {
  const response = await fetch(
    `${DEV_SERVER_HTTP_URL}${DASHBOARD_API_PATH}/server-logs`
  );
  const { logs } = await response.json();

  return logs;
}
