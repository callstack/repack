import { DASHBOARD_API_PATH, DEV_SERVER_HTTP_URL } from '../constants';

export interface Stats {
  time: number;
  builtAt: number;
  chunks: Array<{
    rendered: boolean;
    initial: boolean;
    entry: boolean;
    recorded: boolean;
    // reason?: string;
    size: number;
    sizes: Record<string, number>;
    names: string[];
    idHints: string[];
    runtime: string[];
    files: string[];
    auxiliaryFiles: string[];
    hash: string;
    // childrenByOrder?: Record<string, (string | number)[]>;
    // id?: string | number;
    // siblings?: (string | number)[];
    // parents?: (string | number)[];
    // children?: (string | number)[];
    // modules?: StatsModule[];
    // filteredModules?: number;
    // origins?: StatsChunkOrigin[];
  }>;
  assets: Array<{
    type: string;
    name: string;
    info: {
      size: number;
      related: Record<string, string>;
    };
    size: number;
    emitted: boolean;
    comparedForEmit: boolean;
    cached: boolean;
    chunkNames: (string | number)[];
    chunkIdHints: (string | number)[];
    auxiliaryChunkNames?: (string | number)[];
    auxiliaryChunks?: (string | number)[];
    auxiliaryChunkIdHints?: (string | number)[];
    filteredRelated?: number;
    isOverSizeLimit?: boolean;
  }>;
  errors: Array<{
    message: string;
    moduleIdentifier: string;
    moduleName: string;
    loc: string;
  }>;
  warnings: Array<{
    message: string;
    moduleIdentifier: string;
    moduleName: string;
    loc: string;
  }>;
}

export async function fetchStats(platform: string): Promise<Stats> {
  const response = await fetch(
    `${DEV_SERVER_HTTP_URL}${DASHBOARD_API_PATH}/stats?platform=${platform}`
  );
  const stats = await response.json();

  return stats;
}
