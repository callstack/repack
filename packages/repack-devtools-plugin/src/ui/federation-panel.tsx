import {
  Badge,
  Button,
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
  Clip,
  Detail,
  Diagnostics,
  formatTime,
  Header,
  Notice,
  NoWrap,
  Section,
  Table,
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
    cell: ({ row }) => <Clip>{row.original.alias ?? row.original.name}</Clip>,
  },
  {
    id: 'entry',
    header: 'Entry',
    accessorFn: (row) => row.entry ?? row.version ?? '',
    cell: ({ row }) => (
      <Clip width="xl">{row.original.entry ?? row.original.version}</Clip>
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
    cell: ({ row }) => <Clip width="lg">{row.original.name}</Clip>,
  },
  {
    id: 'versions',
    header: 'Versions',
    accessorFn: (row) =>
      row.versions
        .map(
          (version) =>
            `${version.version}${version.from ? ` (${version.from})` : ''}${version.loaded ? ' ✓' : ''}`
        )
        .join(', '),
    cell: ({ getValue }) => (
      <Clip width="md" mono={false}>
        {String(getValue())}
      </Clip>
    ),
  },
  {
    id: 'requiredVersion',
    header: 'Required',
    accessorFn: (row) =>
      row.versions
        .map((version) => version.requiredVersion)
        .filter(Boolean)
        .join(', '),
    cell: ({ getValue }) => (
      <Clip width="sm" mono={false}>
        {String(getValue())}
      </Clip>
    ),
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
    cell: ({ row }) => <NoWrap>{formatTime(row.original.at)}</NoWrap>,
  },
  {
    id: 'type',
    header: 'Hook',
    accessorFn: (row) => row.type,
    cell: ({ row }) => (
      <span
        className={`whitespace-nowrap ${row.original.error ? 'text-danger' : ''}`}
      >
        {row.original.type}
      </span>
    ),
  },
  {
    id: 'id',
    header: 'Request',
    accessorFn: (row) => row.id ?? '',
    cell: ({ row }) => <Clip width="md">{row.original.id}</Clip>,
  },
  {
    id: 'url',
    header: 'URL / version',
    accessorFn: (row) => row.url ?? row.version ?? '',
    cell: ({ row }) => (
      <Clip width="md">{row.original.url ?? row.original.version}</Clip>
    ),
  },
  {
    id: 'error',
    header: 'Error / detail',
    accessorFn: (row) => row.error ?? row.detail ?? '',
    cell: ({ row }) => (
      <Clip
        width="md"
        mono={false}
        className={row.original.error ? 'text-danger' : ''}
      >
        {row.original.error ?? row.original.detail}
      </Clip>
    ),
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
        {federation?.runtime === 'none' ? null : (
          <Section title="Load a remote module">
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-80 max-w-full">
                <Input
                  size="sm"
                  placeholder="Remote/Module, e.g. MiniApp/MiniAppNavigator"
                  value={requestId}
                  onChange={(event) => setRequestId(event.target.value)}
                />
              </div>
              <Button
                size="sm"
                disabled={!rpc || !requestId.includes('/')}
                onClick={loadRemote}
              >
                Load
              </Button>
            </div>
          </Section>
        )}
        {result ? (
          <Detail
            title="Result"
            data={result}
            onClose={() => setResult(null)}
          />
        ) : null}
        <Section title={`Remotes (${remotes.length})`}>
          <Table
            ariaLabel="Remotes"
            columns={remoteColumns}
            data={remotes}
            getRowId={(row) => `${row.instance}:${row.name}`}
            onRowClick={setSelected}
            emptyMessage="No remotes registered."
          />
        </Section>
        <Section title={`Shared (${shared.length})`}>
          <Table
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
        <Section
          title={`Runtime events (${snapshot?.federationEvents.length ?? 0})`}
        >
          <div className="max-h-[60vh] overflow-y-auto">
            <Table
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
          </div>
        </Section>
      </PluginShell.Body>
    </PluginShell>
  );
}
