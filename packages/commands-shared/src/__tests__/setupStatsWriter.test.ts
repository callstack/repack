import path from 'node:path';
import { fs } from 'memfs';
import { describe, expect, it, vi } from 'vitest';
import type { Logger } from '../types.js';
import {
  normalizeStatsOptions,
  writeStats,
} from '../utils/setupStatsWriter.js';

vi.mock('node:fs', async () => {
  const memfs = await import('memfs');
  return { default: memfs.fs };
});

describe('setupStatsWriter', () => {
  const logger = { info: vi.fn() } as unknown as Logger;

  describe('normalizeStatsOptions', () => {
    it('should return options with preset if preset is provided', () => {
      const options = {};
      const preset = 'detailed';
      const result = normalizeStatsOptions(options, preset);
      expect(result).toHaveProperty('preset', 'detailed');
    });

    it('should return options with preset "normal" if options is true', () => {
      const options = true;
      const result = normalizeStatsOptions(options);
      expect(result).toHaveProperty('preset', 'normal');
    });

    it('should return options with preset "none" if options is false', () => {
      const options = false;
      const result = normalizeStatsOptions(options);
      expect(result).toHaveProperty('preset', 'none');
    });

    it('should return options as is if no preset is provided', () => {
      const options = { custom: 'value' };
      const result = normalizeStatsOptions(options);
      expect(result).toEqual(options);
    });
  });

  describe('writeStats', () => {
    it('should write stats to the specified file', async () => {
      const stats = { key: 'value' };
      const filepath = 'stats.json';

      await writeStats(stats, { filepath, logger, rootDir: '/' });

      const absoluteFilepath = path.resolve('/', filepath);
      const fileContent = fs.readFileSync(absoluteFilepath, 'utf-8') as string;
      expect(JSON.parse(fileContent)).toEqual(stats);
    });

    it('should ensure path exists', async () => {
      const stats = { key: 'value' };
      const filepath = './my/custom/dir/stats.json';

      await writeStats(stats, { filepath, logger, rootDir: '/' });

      const absoluteFilepath = path.resolve('/', filepath);
      const fileContent = fs.readFileSync(absoluteFilepath, 'utf-8') as string;
      expect(JSON.parse(fileContent)).toEqual(stats);
    });
  });
});
