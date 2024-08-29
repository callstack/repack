import {
  EntryNormalized,
  ModuleFilenameHelpers,
  StatsChunk,
} from '@rspack/core';
import { OutputPlugin, OutputPluginConfig } from '../OutputPlugin';

const makeChunk = ({
  name,
  entry = false,
  initial = false,
  parents = [],
  siblings = [],
  children = [],
}: {
  name: string;
  entry?: boolean;
  initial?: boolean;
  parents?: string[];
  siblings?: string[];
  children?: string[];
}) => {
  return {
    id: name,
    names: [name],
    entry,
    initial,
    parents,
    siblings,
    children,
  } as StatsChunk;
};

const getChunkMatcher = (plugin: OutputPlugin) => {
  return plugin.createChunkMatcher(ModuleFilenameHelpers.matchObject);
};

describe('OutputPlugin', () => {
  describe('classifyChunks', () => {
    let config: OutputPluginConfig;
    let entryOptions: EntryNormalized;

    beforeEach(() => {
      config = {
        context: '/path/to/context',
        platform: 'ios',
        output: {},
      };
      entryOptions = { main: { import: ['./src/index.js'] } };
    });

    describe('should classify the chunk as local', () => {
      it('main chunk', () => {
        const plugin = new OutputPlugin(config);
        const chunks = [
          makeChunk({ name: 'main', entry: true, initial: true }),
        ];

        const { localChunks, remoteChunks } = plugin.classifyChunks({
          chunks,
          chunkMatcher: getChunkMatcher(plugin),
          entryOptions,
        });

        expect(localChunks.size).toBe(1);
        expect(remoteChunks.size).toBe(0);

        expect(localChunks.has(chunks[0])).toBe(true); // main
      });

      it('every known entry && initial chunk', () => {
        const plugin = new OutputPlugin(config);
        const chunks = [
          makeChunk({ name: 'main', entry: true, initial: true }),
          makeChunk({ name: 'other', entry: true, initial: true }),
        ];

        entryOptions = {
          ...entryOptions,
          other: { import: ['./src/other.js'] },
        };

        const { localChunks, remoteChunks } = plugin.classifyChunks({
          chunks,
          chunkMatcher: getChunkMatcher(plugin),
          entryOptions,
        });

        expect(localChunks.size).toBe(2);
        expect(remoteChunks.size).toBe(0);

        expect(localChunks.has(chunks[0])).toBe(true); // main
        expect(localChunks.has(chunks[1])).toBe(true); // other
      });

      it('sibling of local chunk', () => {
        const plugin = new OutputPlugin(config);
        const chunks = [
          makeChunk({
            name: 'main',
            entry: true,
            initial: true,
            siblings: ['chunk1'],
          }),
          makeChunk({ name: 'chunk1', siblings: ['main'] }),
        ];

        const { localChunks, remoteChunks } = plugin.classifyChunks({
          chunks,
          chunkMatcher: getChunkMatcher(plugin),
          entryOptions,
        });

        expect(localChunks.size).toBe(2);
        expect(remoteChunks.size).toBe(0);

        expect(localChunks.has(chunks[0])).toBe(true); // main
        expect(localChunks.has(chunks[1])).toBe(true); // chunk1
      });

      it('chunk matching local spec', () => {
        const plugin = new OutputPlugin({
          ...config,
          extraChunks: [{ type: 'local', test: 'chunk1' }],
        });
        const chunks = [makeChunk({ name: 'chunk1' })];

        const { localChunks, remoteChunks } = plugin.classifyChunks({
          chunks,
          chunkMatcher: getChunkMatcher(plugin),
          entryOptions,
        });

        expect(localChunks.size).toBe(1);
        expect(remoteChunks.size).toBe(0);

        expect(localChunks.has(chunks[0])).toBe(true); // chunk1
      });

      it('all parents of local chunk', () => {
        const plugin = new OutputPlugin({
          ...config,
          extraChunks: [{ type: 'local', test: 'chunk4' }],
        });
        const chunks = [
          makeChunk({
            name: 'main',
            entry: true,
            initial: true,
            children: ['chunk1'],
          }),
          makeChunk({
            name: 'chunk1',
            parents: ['main'],
            children: ['chunk2'],
          }),
          makeChunk({
            name: 'chunk2',
            parents: ['chunk1'],
            children: ['chunk3'],
          }),
          makeChunk({
            name: 'chunk3',
            parents: ['chunk2'],
            children: ['chunk4'],
          }),
          makeChunk({
            name: 'chunk4',
            parents: ['chunk3'],
          }),
        ];

        const { localChunks, remoteChunks } = plugin.classifyChunks({
          chunks,
          chunkMatcher: getChunkMatcher(plugin),
          entryOptions,
        });

        expect(localChunks.size).toBe(5);
        expect(remoteChunks.size).toBe(0);

        chunks.forEach((chunk) => expect(localChunks.has(chunk)).toBe(true));
      });
    });

    describe('should classify the chunk as remote', () => {
      it('independent chunk', () => {
        const plugin = new OutputPlugin(config);
        const chunks = [makeChunk({ name: 'chunk1' })];

        const { localChunks, remoteChunks } = plugin.classifyChunks({
          chunks,
          chunkMatcher: getChunkMatcher(plugin),
          entryOptions,
        });

        expect(localChunks.size).toBe(0);
        expect(remoteChunks.size).toBe(1);

        expect(remoteChunks.has(chunks[0])).toBe(true); // chunk2
      });
    });
  });
});
