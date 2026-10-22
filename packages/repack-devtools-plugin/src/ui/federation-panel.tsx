import {
  Badge,
  Button,
  DataTable,
  type DataTableColumn,
  Input,
  PluginShell,
} from '@rozenite/ui';
import { useState } from 'react';
import type {
  FederationEvent,
  FederationRemote,
  FederationSharedPackage,
} from '../shared/types';
import {
  Detail,
  Diagnostics,
  formatTime,
  Header,
  Mono,
  Notice,
  Section,
} from './components';
import { useAppData } from './useDevToolsData';
import '@rozenite/ui/styles.css';

type RemoteRow = FederationRemote & { instance: string };
type SharedRow = FederationSharedPackage & { instance: string };

const remoteColumns: DataTableColumn<RemoteRow>[] = [
  { id: 'instance', header: 'Host', accessorFn: (row) => row.instance },
  {
    id: 'name',
    header: 'Remote',
    accessorFn: (row) => row.alias ?? row.name,
    cell: ({ row }) => <Mono>{row.original.alias ?? row.original.name}</Mono>,
  },
  {
    id: 'entry',
    header: 'Entry',
    accessorFn: (row) => row.entry ?? row.version ?? '',
    cell: ({ row }) => (
      <Mono>{row.original.entry ?? row.original.version}</Mono>
    ),
  },
  {
    id: 'loaded',
    header: 'Loaded',
    accessorFn: (row) => (row.loaded ? 'yes' : 'no'),
    cell: ({ row }) => (
      <Badge
        tone={row.original.loaded ? 'success' : 'neutral'}
        variant="soft"
        size="sm"
      >
        {row.original.loaded ? 'loaded' : 'not loaded'}
      </Badge>
    ),
  },
];

const sharedColumns: DataTableColumn<SharedRow>[] = [
  { id: 'instance', header: 'Host', accessorFn: (row) => row.instance },
  { id: 'scope', header: 'Scope', accessorFn: (row) => row.scope },
  {
    id: 'name',
    header: 'Package',
    accessorFn: (row) => row.name,
    cell: ({ row }) => <Mono>{row.original.name}</Mono>,
  },
  {
    id: 'versions',
    header: 'Versions (provider)',
    accessorFn: (row) =>
      row.versions
        .map(
          (version) =>
            `${version.version}${version.from ? ` (${version.from})` : ''}${version.loaded ? ' ✓' : ''}`
        )
        .join(', '),
  },
  {
    id: 'requiredVersion',
    header: 'Required',
    accessorFn: (row) =>
      row.versions
        .map((version) => version.requiredVersion)
        .filter(Boolean)
        .join(', '),
  },
  {
    id: 'singleton',
    header: 'Singleton',
    accessorFn: (row) =>
      row.versions.some((version) => version.singleton) ? 'yes' : '',
  },
];

const eventColumns: DataTableColumn<FederationEvent>[] = [
  {
    id: 'at',
    header: 'Time',
    accessorFn: (row) => row.at,
    cell: ({ row }) => formatTime(row.original.at),
  },
  {
    id: 'type',
    header: 'Hook',
    accessorFn: (row) => row.type,
    cell: ({ row }) => (
      <span className={row.original.error ? 'text-danger' : undefined}>
        {row.original.type}
      </span>
    ),
  },
  {
    id: 'id',
    header: 'Request',
    accessorFn: (row) => row.id ?? '',
    cell: ({ row }) => <Mono>{row.original.id}</Mono>,
  },
  {
    id: 'url',
    header: 'URL / version',
    accessorFn: (row) => row.url ?? row.version ?? '',
    cell: ({ row }) => <Mono>{row.original.url ?? row.original.version}</Mono>,
  },
  {
    id: 'error',
    header: 'Error',
    accessorFn: (row) => row.error ?? row.detail ?? '',
  },
];

export default function FederationPanel() {
  const { connected, rpc, snapshot, error, refresh } = useAppData();
  const [requestId, setRequestId] = useState('');
  const [result, setResult] = useState<unknown>(null);
  const [selected, setSelected] = useState<unknown>(null);
  const federation = snapshot?.federation;

  const remotes: RemoteRow[] =
    federation?.instances.flatMap((instance) =>
      instance.remotes.map((remote) => ({ ...remote, instance: instance.name }))
    ) ?? [];
  const shared: SharedRow[] = [
    ...(federation?.instances.flatMap((instance) =>
      instance.shared.map((item) => ({ ...item, instance: instance.name }))
    ) ?? []),
    ...(federation?.shareScopes?.map((item) => ({ ...item, instance: '' })) ??
      []),
  ];

  const loadRemote = async () => {
    if (!rpc) return;
    try {
      setResult(await rpc.method('loadRemote').invoke({ id: requestId }));
    } catch (cause) {
      setResult({ error: String(cause) });
    }
    void refresh();
  };

  return (
    <PluginShell>
      <Header
        title={
          <>
            Module Federation{' '}
            <Badge size="sm" variant="soft" tone="info">
              {federation?.runtime ?? '…'}
            </Badge>{' '}
            {federation && federation.runtime === 'v2' ? (
              <Badge
                size="sm"
                variant="soft"
                tone={federation.runtimePluginInstalled ? 'success' : 'warning'}
              >
                {federation.runtimePluginInstalled
                  ? 'runtime plugin active'
                  : 'runtime plugin missing'}
              </Badge>
            ) : null}
          </>
        }
      >
        <Button size="sm" tone="neutral" variant="outline" onClick={refresh}>
          Refresh
        </Button>
        <Button
          size="sm"
          tone="neutral"
          variant="outline"
          disabled={!rpc}
          onClick={() =>
            rpc &&
            void rpc
              .method('clear')
              .invoke({ scope: 'federation' })
              .then(refresh)
          }
        >
          Clear events
        </Button>
      </Header>
      <PluginShell.Body>
        {!connected ? <Notice>Waiting for the app to connect…</Notice> : null}
        {error ? <Notice>{error}</Notice> : null}
        {federation?.runtime === 'none' ? (
          <Notice>No Module Federation runtime detected in this app.</Notice>
        ) : null}
        <Diagnostics items={federation?.diagnostics ?? []} />
        <Section title="Load a remote module">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              size="sm"
              placeholder="Remote/Module, e.g. MiniApp/MiniAppNavigator"
              value={requestId}
              onChange={(event) => setRequestId(event.target.value)}
            />
            <Button
              size="sm"
              disabled={!rpc || !requestId.includes('/')}
              onClick={loadRemote}
            >
              Load
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
        <Section title={`Remotes (${remotes.length})`}>
          <DataTable
            ariaLabel="Remotes"
            columns={remoteColumns}
            data={remotes}
            getRowId={(row) => `${row.instance}:${row.name}`}
            onRowClick={setSelected}
            emptyMessage="No remotes registered."
          />
        </Section>
        <Section title={`Shared (${shared.length})`}>
          <DataTable
            ariaLabel="Shared packages"
            columns={sharedColumns}
            data={shared}
            getRowId={(row) => `${row.instance}:${row.scope}:${row.name}`}
            onRowClick={setSelected}
            emptyMessage="No shared packages."
          />
        </Section>
        {selected ? (
          <Detail
            title="Details"
            data={selected}
            onClose={() => setSelected(null)}
          />
        ) : null}
        <Section title="Runtime events">
          <DataTable
            ariaLabel="Federation events"
            columns={eventColumns}
            data={[...(snapshot?.federationEvents ?? [])].reverse()}
            getRowId={(row) => String(row.seq)}
            onRowClick={setSelected}
            emptyMessage={
              federation?.runtimePluginInstalled
                ? 'No federation events yet.'
                : 'Events need the repack-devtools MF runtime plugin.'
            }
          />
        </Section>
      </PluginShell.Body>
    </PluginShell>
  );
}
