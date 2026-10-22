import {
  Button,
  DataTable,
  type DataTableColumn,
  PluginShell,
} from '@rozenite/ui';
import { useState } from 'react';
import type {
  CompilationIssue,
  DevServerRequest,
  PlatformCompilation,
} from '../shared/types';
import {
  Detail,
  Diagnostics,
  formatBytes,
  formatMs,
  formatTime,
  Header,
  Mono,
  Notice,
  Section,
  StatusBadge,
} from './components';
import { useDevServerData } from './useDevToolsData';
import '@rozenite/ui/styles.css';

const requestColumns: DataTableColumn<DevServerRequest>[] = [
  {
    id: 'at',
    header: 'Time',
    accessorFn: (row) => row.at,
    cell: ({ row }) => formatTime(row.original.at),
  },
  {
    id: 'status',
    header: 'Status',
    accessorFn: (row) => row.status,
    cell: ({ row }) => (
      <span className={row.original.status >= 400 ? 'text-danger' : undefined}>
        {row.original.status}
      </span>
    ),
  },
  { id: 'method', header: 'Method', accessorFn: (row) => row.method },
  {
    id: 'url',
    header: 'URL',
    accessorFn: (row) => row.url,
    cell: ({ row }) => <Mono>{row.original.url}</Mono>,
  },
  {
    id: 'durationMs',
    header: 'Time',
    accessorFn: (row) => row.durationMs,
    cell: ({ row }) => formatMs(row.original.durationMs),
  },
];

const assetColumns: DataTableColumn<PlatformCompilation['assets'][number]>[] = [
  {
    id: 'name',
    header: 'Asset',
    accessorFn: (row) => row.name,
    cell: ({ row }) => <Mono>{row.original.name}</Mono>,
  },
  {
    id: 'size',
    header: 'Size',
    accessorFn: (row) => row.size,
    cell: ({ row }) => formatBytes(row.original.size),
  },
  {
    id: 'chunks',
    header: 'Chunks',
    accessorFn: (row) => (row.chunkNames ?? []).join(', '),
  },
];

const Issues = ({
  title,
  issues,
}: {
  title: string;
  issues: CompilationIssue[];
}) =>
  issues.length === 0 ? null : (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-semibold">{title}</div>
      {issues.map((issue, index) => (
        <pre
          // biome-ignore lint/suspicious/noArrayIndexKey: issues are an immutable, ordered snapshot; position is their identity
          key={`${issue.file ?? ''}-${index}`}
          className="overflow-auto rounded border border-border p-2 text-[11px] whitespace-pre-wrap"
        >
          {[issue.moduleName ?? issue.file, issue.loc]
            .filter(Boolean)
            .join(':')}
          {issue.moduleName || issue.file ? '\n' : ''}
          {issue.message}
        </pre>
      ))}
    </div>
  );

const Compilation = ({ compilation }: { compilation: PlatformCompilation }) => (
  <Section
    title={
      <span className="flex items-center gap-2">
        {compilation.platform}
        <StatusBadge status={compilation.status} />
      </span>
    }
  >
    <div className="mb-2 text-xs text-muted-foreground">
      {compilation.builds} build(s)
      {compilation.durationMs !== undefined
        ? ` · last ${formatMs(compilation.durationMs)}`
        : ''}
      {compilation.finishedAt
        ? ` · finished ${formatTime(compilation.finishedAt)}`
        : ''}
      {` · ${compilation.errorCount} error(s), ${compilation.warningCount} warning(s)`}
      {compilation.changedFiles.length > 0
        ? ` · changed: ${compilation.changedFiles.join(', ')}`
        : ''}
    </div>
    <div className="flex flex-col gap-3">
      <Issues title="Errors" issues={compilation.errors} />
      <Issues title="Warnings" issues={compilation.warnings} />
      <DataTable
        ariaLabel={`${compilation.platform} assets`}
        columns={assetColumns}
        data={compilation.assets}
        getRowId={(row) => row.name}
        emptyMessage="No assets emitted yet."
      />
    </div>
  </Section>
);

export default function DevServerPanel() {
  const { state, error, refresh, clearRequests } = useDevServerData();
  const [selected, setSelected] = useState<DevServerRequest | null>(null);

  return (
    <PluginShell>
      <Header
        title={`Re.Pack dev server${state?.port ? ` :${state.port}` : ''}`}
      >
        <Button size="sm" tone="neutral" variant="outline" onClick={refresh}>
          Refresh
        </Button>
        <Button
          size="sm"
          tone="neutral"
          variant="outline"
          onClick={clearRequests}
        >
          Clear requests
        </Button>
      </Header>
      <PluginShell.Body>
        {error ? <Notice>{error}</Notice> : null}
        <Diagnostics items={state?.diagnostics ?? []} />
        {state?.compilations.map((compilation) => (
          <Compilation key={compilation.platform} compilation={compilation} />
        ))}
        {state && state.compilations.length === 0 ? (
          <Notice>
            No compilation yet. Request a bundle from a device to start one.
          </Notice>
        ) : null}
        <Section title={`Requests (${state?.requests.length ?? 0})`}>
          <DataTable
            ariaLabel="Dev server requests"
            columns={requestColumns}
            data={[...(state?.requests ?? [])].reverse()}
            getRowId={(row) => String(row.seq)}
            onRowClick={setSelected}
            emptyMessage="No requests recorded."
          />
        </Section>
        {selected ? (
          <Detail
            title={`${selected.method} ${selected.url}`}
            data={selected}
            onClose={() => setSelected(null)}
          />
        ) : null}
      </PluginShell.Body>
    </PluginShell>
  );
}
