import {
  Button,
  DataTable,
  type DataTableColumn,
  Input,
  PluginShell,
} from '@rozenite/ui';
import { useState } from 'react';
import type { ScriptEvent, ScriptRecord } from '../shared/types';
import {
  Detail,
  formatMs,
  formatTime,
  Header,
  Mono,
  Notice,
  Section,
  StatusBadge,
} from './components';
import { useAppData } from './useDevToolsData';
import '@rozenite/ui/styles.css';

const scriptColumns: DataTableColumn<ScriptRecord>[] = [
  {
    id: 'uniqueId',
    header: 'Script',
    accessorFn: (row) => row.uniqueId,
    cell: ({ row }) => <Mono>{row.original.uniqueId}</Mono>,
  },
  {
    id: 'status',
    header: 'Status',
    accessorFn: (row) => row.status,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: 'source',
    header: 'Source',
    accessorFn: (row) =>
      row.locator?.fetch === undefined
        ? ''
        : row.locator.fetch
          ? 'download'
          : 'cache',
  },
  {
    id: 'loadMs',
    header: 'Load',
    accessorFn: (row) => row.loadMs ?? -1,
    cell: ({ row }) => formatMs(row.original.loadMs),
  },
  {
    id: 'url',
    header: 'URL',
    accessorFn: (row) => row.locator?.url ?? '',
    cell: ({ row }) => <Mono>{row.original.locator?.url}</Mono>,
  },
  {
    id: 'error',
    header: 'Error',
    accessorFn: (row) => row.error?.nativeMessage ?? row.error?.message ?? '',
    cell: ({ row }) =>
      row.original.error ? (
        <span className="text-danger">
          {[row.original.error.stage, row.original.error.code]
            .filter(Boolean)
            .join(' ')}
          {': '}
          {row.original.error.nativeMessage ?? row.original.error.message}
        </span>
      ) : null,
  },
];

const eventColumns: DataTableColumn<ScriptEvent>[] = [
  {
    id: 'at',
    header: 'Time',
    accessorFn: (row) => row.at,
    cell: ({ row }) => formatTime(row.original.at),
  },
  { id: 'type', header: 'Event', accessorFn: (row) => row.type },
  {
    id: 'uniqueId',
    header: 'Script',
    accessorFn: (row) => row.uniqueId ?? '',
    cell: ({ row }) => <Mono>{row.original.uniqueId}</Mono>,
  },
  { id: 'detail', header: 'Detail', accessorFn: (row) => row.detail ?? '' },
];

export default function ScriptsPanel() {
  const { connected, rpc, snapshot, error, refresh } = useAppData();
  const [selected, setSelected] = useState<ScriptRecord | null>(null);
  const [scriptId, setScriptId] = useState('');
  const [caller, setCaller] = useState('');
  const [result, setResult] = useState<unknown>(null);

  const run = async (action: () => Promise<unknown>) => {
    try {
      setResult(await action());
    } catch (cause) {
      setResult({ error: String(cause) });
    }
    void refresh();
  };

  return (
    <PluginShell>
      <Header title="Re.Pack ScriptManager">
        <Button size="sm" tone="neutral" variant="outline" onClick={refresh}>
          Refresh
        </Button>
        <Button
          size="sm"
          tone="neutral"
          variant="outline"
          disabled={!rpc}
          onClick={() =>
            rpc && run(() => rpc.method('clear').invoke({ scope: 'scripts' }))
          }
        >
          Clear records
        </Button>
        <Button
          size="sm"
          tone="danger"
          variant="soft"
          disabled={!rpc}
          onClick={() =>
            rpc && run(() => rpc.method('invalidateScripts').invoke({}))
          }
        >
          Invalidate cache
        </Button>
      </Header>
      <PluginShell.Body>
        {!connected ? <Notice>Waiting for the app to connect…</Notice> : null}
        {error ? <Notice>{error}</Notice> : null}
        <Section title="Load a script">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              size="sm"
              placeholder="scriptId (chunk name)"
              value={scriptId}
              onChange={(event) => setScriptId(event.target.value)}
            />
            <Input
              size="sm"
              placeholder="caller (optional)"
              value={caller}
              onChange={(event) => setCaller(event.target.value)}
            />
            <Button
              size="sm"
              disabled={!rpc || !scriptId}
              onClick={() =>
                rpc &&
                run(() =>
                  rpc
                    .method('loadScript')
                    .invoke({ scriptId, caller: caller || undefined })
                )
              }
            >
              Load
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!rpc || !scriptId}
              onClick={() =>
                rpc &&
                run(() =>
                  rpc
                    .method('prefetchScript')
                    .invoke({ scriptId, caller: caller || undefined })
                )
              }
            >
              Prefetch
            </Button>
          </div>
        </Section>
        {result ? (
          <Detail
            title="Result"
            data={result}
            onClose={() => setResult(null)}
          />
        ) : null}
        <Section title={`Scripts (${snapshot?.scripts.length ?? 0})`}>
          <DataTable
            ariaLabel="Scripts"
            columns={scriptColumns}
            data={snapshot?.scripts ?? []}
            getRowId={(row) => row.uniqueId}
            onRowClick={setSelected}
            emptyMessage="No scripts resolved yet."
          />
        </Section>
        {selected ? (
          <Detail
            title={selected.uniqueId}
            data={{
              record:
                snapshot?.scripts.find(
                  (item) => item.uniqueId === selected.uniqueId
                ) ?? selected,
              events: snapshot?.scriptEvents.filter(
                (event) => event.uniqueId === selected.uniqueId
              ),
            }}
            onClose={() => setSelected(null)}
          />
        ) : null}
        <Section title="Events">
          <DataTable
            ariaLabel="ScriptManager events"
            columns={eventColumns}
            data={[...(snapshot?.scriptEvents ?? [])].reverse()}
            getRowId={(row) => String(row.seq)}
            emptyMessage="No ScriptManager events yet."
          />
        </Section>
      </PluginShell.Body>
    </PluginShell>
  );
}
