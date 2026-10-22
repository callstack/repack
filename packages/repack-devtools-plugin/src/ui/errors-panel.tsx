import {
  Button,
  DataTable,
  type DataTableColumn,
  PluginShell,
  Textarea,
} from '@rozenite/ui';
import { useState } from 'react';
import type { RecordedError, SymbolicationResult } from '../shared/types';
import {
  Diagnostics,
  formatTime,
  Header,
  Mono,
  Notice,
  Section,
} from './components';
import { useAppData } from './useDevToolsData';
import '@rozenite/ui/styles.css';

const errorColumns: DataTableColumn<RecordedError>[] = [
  {
    id: 'at',
    header: 'Time',
    accessorFn: (row) => row.at,
    cell: ({ row }) => formatTime(row.original.at),
  },
  {
    id: 'source',
    header: 'Source',
    accessorFn: (row) => `${row.source}${row.isFatal ? ' (fatal)' : ''}`,
  },
  {
    id: 'message',
    header: 'Message',
    accessorFn: (row) => row.message,
    cell: ({ row }) => (
      <span>
        {row.original.name ? `${row.original.name}: ` : ''}
        {row.original.message}
      </span>
    ),
  },
  {
    id: 'ref',
    header: 'Ref',
    accessorFn: (row) => row.ref ?? '',
    cell: ({ row }) => <Mono>{row.original.ref}</Mono>,
  },
];

const formatFrame = (frame: {
  methodName: string;
  file?: string;
  lineNumber?: number;
  column?: number;
}) =>
  `${frame.methodName} ${frame.file ?? '?'}:${frame.lineNumber ?? '?'}:${frame.column ?? '?'}`;

const Symbolication = ({ result }: { result: SymbolicationResult }) => (
  <div className="flex flex-col gap-2">
    <div className="text-xs text-muted-foreground">
      {result.devServer ?? 'no dev server'}
      {result.status !== undefined ? ` · /symbolicate ${result.status}` : ''}
      {result.error ? ` · ${result.error}` : ''}
    </div>
    <Diagnostics items={result.diagnostics} />
    {result.codeFrame ? (
      <pre className="overflow-auto rounded border border-border p-2 text-[11px]">
        {result.codeFrame.content}
      </pre>
    ) : null}
    <div className="flex flex-col gap-1 font-mono text-[11px]">
      {result.frames.map((frame, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: stack frames are an immutable, ordered snapshot; position is their identity
          key={`${frame.original.file ?? ''}-${index}`}
          className={frame.unmapped ? 'text-danger' : undefined}
        >
          {frame.symbolicated
            ? formatFrame(frame.symbolicated)
            : formatFrame(frame.original)}
          {frame.unmapped ? '  ← unmapped' : ''}
        </div>
      ))}
    </div>
    {result.sourceMaps.length > 0 ? (
      <div className="flex flex-col gap-1 text-[11px]">
        {result.sourceMaps.map((check) => (
          <Mono key={check.sourceMapUrl}>
            {check.status ?? check.error ?? '?'} {check.sourceMapUrl}
          </Mono>
        ))}
      </div>
    ) : null}
  </div>
);

export default function ErrorsPanel() {
  const { connected, rpc, snapshot, error, refresh } = useAppData();
  const [selected, setSelected] = useState<RecordedError | null>(null);
  const [stack, setStack] = useState('');
  const [result, setResult] = useState<SymbolicationResult | null>(null);
  const [busy, setBusy] = useState(false);

  const symbolicate = async (params: { stack?: string; errorId?: string }) => {
    if (!rpc) return;
    setBusy(true);
    try {
      setResult(await rpc.method('symbolicate').invoke(params));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PluginShell>
      <Header title="Re.Pack errors & symbolication">
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
            void rpc.method('clear').invoke({ scope: 'errors' }).then(refresh)
          }
        >
          Clear
        </Button>
      </Header>
      <PluginShell.Body>
        {!connected ? <Notice>Waiting for the app to connect…</Notice> : null}
        {error ? <Notice>{error}</Notice> : null}
        <Section title={`Errors (${snapshot?.errors.length ?? 0})`}>
          <DataTable
            ariaLabel="Errors"
            columns={errorColumns}
            data={[...(snapshot?.errors ?? [])].reverse()}
            getRowId={(row) => row.id}
            onRowClick={(row) => {
              setSelected(row);
              setResult(null);
            }}
            emptyMessage="No errors recorded."
          />
        </Section>
        {selected ? (
          <Section
            title={selected.id}
            actions={
              <>
                <Button
                  size="sm"
                  disabled={!rpc || busy || !selected.stack}
                  onClick={() => symbolicate({ errorId: selected.id })}
                >
                  Symbolicate
                </Button>
                <Button
                  size="sm"
                  tone="neutral"
                  variant="ghost"
                  onClick={() => setSelected(null)}
                >
                  Close
                </Button>
              </>
            }
          >
            <pre className="overflow-auto text-[11px] whitespace-pre-wrap">
              {selected.stack ?? selected.message}
            </pre>
          </Section>
        ) : null}
        <Section
          title="Symbolicate a stack"
          actions={
            <Button
              size="sm"
              disabled={!rpc || busy}
              onClick={() => symbolicate({ stack: stack || undefined })}
            >
              {stack ? 'Symbolicate' : 'Run probe'}
            </Button>
          }
        >
          <Textarea
            size="sm"
            rows={5}
            placeholder="Paste a JS stack trace, or leave empty to symbolicate a probe error thrown in the app."
            value={stack}
            onChange={(event) => setStack(event.target.value)}
          />
        </Section>
        {result ? (
          <Section title="Symbolication result">
            <Symbolication result={result} />
          </Section>
        ) : null}
      </PluginShell.Body>
    </PluginShell>
  );
}
