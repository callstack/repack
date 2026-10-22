import { Button, type DataTableColumn, PluginShell } from '@rozenite/ui';
import { useState } from 'react';
import { isFailedRequest, NO_RESPONSE_STATUS } from '../shared/requests';
import type {
  CompilationIssue,
  DevServerRequest,
  PlatformCompilation,
} from '../shared/types';
import {
  Clip,
  Collapsible,
  Detail,
  Diagnostics,
  formatBytes,
  formatMs,
  formatTime,
  Header,
  Notice,
  NoWrap,
  Section,
  StatusBadge,
  Table,
} from './components';
import { useDevServerData } from './useDevToolsData';
import '@rozenite/ui/styles.css';

const requestColumns: DataTableColumn<DevServerRequest>[] = [
  {
    id: 'at',
    header: 'Time',
    accessorFn: (row) => row.at,
    cell: ({ row }) => <NoWrap>{formatTime(row.original.at)}</NoWrap>,
  },
  {
    id: 'status',
    header: 'Status',
    accessorFn: (row) => row.status,
    cell: ({ row }) => (
      <span
        className={`whitespace-nowrap ${isFailedRequest(row.original) ? 'text-danger' : ''}`}
      >
        {row.original.status === NO_RESPONSE_STATUS
          ? 'closed'
          : row.original.status}
      </span>
    ),
  },
  { id: 'method', header: 'Method', accessorFn: (row) => row.method },
  {
    id: 'url',
    header: 'URL',
    accessorFn: (row) => row.url,
    cell: ({ row }) => <Clip width="xl">{row.original.url}</Clip>,
  },
  {
    id: 'durationMs',
    header: 'Duration',
    accessorFn: (row) => row.durationMs,
    cell: ({ row }) => <NoWrap>{formatMs(row.original.durationMs)}</NoWrap>,
  },
  {
    id: 'fault',
    header: 'Fault',
    accessorFn: (row) => row.fault ?? '',
    cell: ({ row }) => (
      <span className="font-mono text-xs whitespace-nowrap">
        {row.original.fault}
      </span>
    ),
  },
];

const assetColumns: DataTableColumn<PlatformCompilation['assets'][number]>[] = [
  {
    id: 'name',
    header: 'Asset',
    accessorFn: (row) => row.name,
    cell: ({ row }) => <Clip width="xl">{row.original.name}</Clip>,
  },
  {
    id: 'size',
    header: 'Size',
    accessorFn: (row) => row.size,
    cell: ({ row }) => <NoWrap>{formatBytes(row.original.size)}</NoWrap>,
  },
  {
    id: 'chunks',
    header: 'Chunks',
    accessorFn: (row) => (row.chunkNames ?? []).join(', '),
  },
];

const firstLine = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean) ?? text;

const issueSummary = (issue: CompilationIssue) => {
  const location = [issue.moduleName ?? issue.file, issue.loc]
    .filter(Boolean)
    .join(':');
  // the message usually repeats the location on its first line
  const message = issue.message
    .split('\n')
    .map((line) => line.trim())
    .filter(
      (line) => line && !line.startsWith('../') && !line.startsWith('./')
    );
  return [firstLine(message.join('\n') || issue.message), location]
    .filter(Boolean)
    .join(' · ');
};

const Issues = ({
  title,
  issues,
  tone,
}: {
  title: string;
  issues: CompilationIssue[];
  tone: 'danger' | 'warning';
}) =>
  issues.length === 0 ? null : (
    <div className="flex flex-col gap-1">
      <div className="text-xs font-semibold">
        {title} ({issues.length})
      </div>
      {issues.map((issue, index) => (
        <Collapsible
          // biome-ignore lint/suspicious/noArrayIndexKey: issues are an immutable, ordered snapshot; position is their identity
          key={`${issue.file ?? ''}-${index}`}
          summary={issueSummary(issue)}
          tone={tone}
          // errors stop the build, so show the first one in full
          defaultOpen={tone === 'danger' && index === 0}
        >
          {[issue.moduleName ?? issue.file, issue.loc]
            .filter(Boolean)
            .join(':')}
          {issue.moduleName || issue.file ? '\n' : ''}
          {issue.message}
        </Collapsible>
      ))}
    </div>
  );

/** The store starts every platform as `compiling`; with no build it was never requested. */
const compilationStatus = (compilation: PlatformCompilation) =>
  compilation.builds === 0 && compilation.status === 'compiling'
    ? 'not requested'
    : compilation.status;

const Compilation = ({ compilation }: { compilation: PlatformCompilation }) => (
  <Section
    title={
      <span className="flex items-center gap-2">
        {compilation.platform}
        <StatusBadge status={compilationStatus(compilation)} />
      </span>
    }
  >
    <div className="mb-2 text-xs text-muted-foreground [overflow-wrap:anywhere]">
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
      <Issues tone="danger" title="Errors" issues={compilation.errors} />
      <Issues tone="warning" title="Warnings" issues={compilation.warnings} />
      {compilation.assets.length > 0 ? (
        <details>
          <summary className="cursor-pointer text-xs font-semibold">
            Assets ({compilation.assets.length})
          </summary>
          <Table
            ariaLabel={`${compilation.platform} assets`}
            columns={assetColumns}
            data={compilation.assets}
            getRowId={(row) => row.name}
          />
        </details>
      ) : null}
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
        <Section title={`Requests (${state?.requests.length ?? 0})`}>
          <div className="max-h-[50vh] overflow-y-auto">
            <Table
              ariaLabel="Dev server requests"
              columns={requestColumns}
              data={[...(state?.requests ?? [])].reverse()}
              getRowId={(row) => String(row.seq)}
              onRowClick={setSelected}
              emptyMessage="No requests recorded."
            />
          </div>
        </Section>
        {selected ? (
          <Detail
            title={`${selected.method} ${selected.url}`}
            data={selected}
            onClose={() => setSelected(null)}
          />
        ) : null}
        {state?.compilations.map((compilation) => (
          <Compilation key={compilation.platform} compilation={compilation} />
        ))}
        {state && state.compilations.length === 0 ? (
          <Notice>
            No compilation yet. Request a bundle from a device to start one.
          </Notice>
        ) : null}
      </PluginShell.Body>
    </PluginShell>
  );
}
