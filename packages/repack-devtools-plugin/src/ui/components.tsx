import {
  Alert,
  Badge,
  Button,
  DataTable,
  type DataTableProps,
  JsonInspector,
  type Tone,
} from '@rozenite/ui';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import type { Diagnostic } from '../shared/types';

export const formatTime = (at?: number) =>
  at === undefined
    ? ''
    : new Date(at).toLocaleTimeString(undefined, { hour12: false });

export const formatMs = (ms?: number | null) =>
  ms === undefined || ms === null ? '' : `${Math.round(ms)} ms`;

export const formatBytes = (bytes: number) =>
  bytes < 1024
    ? `${bytes} B`
    : bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / 1024 / 1024).toFixed(2)} MB`;

const STATUS_TONES: Record<string, Tone> = {
  loaded: 'success',
  ok: 'success',
  resolved: 'info',
  prefetching: 'info',
  prefetched: 'info',
  'not requested': 'neutral',
  loading: 'warning',
  resolving: 'warning',
  compiling: 'warning',
  failed: 'danger',
  invalidated: 'neutral',
  idle: 'neutral',
};

export const StatusBadge = ({ status }: { status: string }) => (
  <Badge tone={STATUS_TONES[status] ?? 'neutral'} variant="soft" size="sm">
    {status}
  </Badge>
);

const SEVERITY_TONES: Record<Diagnostic['severity'], Tone> = {
  error: 'danger',
  warning: 'warning',
  info: 'info',
};

const COLLAPSED_DIAGNOSTICS = 3;

/**
 * Severity-ordered findings. Identical messages are shown once, and only the
 * first few are expanded so the data below stays on screen.
 */
export const Diagnostics = ({ items }: { items: Diagnostic[] }) => {
  const [expanded, setExpanded] = useState(false);
  const unique = items.filter(
    (item, index) =>
      items.findIndex(
        (other) =>
          other.severity === item.severity && other.message === item.message
      ) === index
  );
  if (unique.length === 0) return null;
  const shown = expanded ? unique : unique.slice(0, COLLAPSED_DIAGNOSTICS);
  const hidden = unique.length - shown.length;
  return (
    <div className="flex flex-col gap-2 p-3">
      {shown.map((item, index) => (
        <Alert
          // biome-ignore lint/suspicious/noArrayIndexKey: diagnostics are an immutable, ordered snapshot; position is their identity
          key={`${item.ref ?? ''}-${index}`}
          tone={SEVERITY_TONES[item.severity]}
        >
          <Alert.Title className="[overflow-wrap:anywhere]">
            {item.message}
          </Alert.Title>
          {item.hint ? (
            <Alert.Description className="[overflow-wrap:anywhere]">
              {item.hint}
            </Alert.Description>
          ) : null}
        </Alert>
      ))}
      {hidden > 0 || expanded ? (
        <div>
          <Button
            size="sm"
            tone="neutral"
            variant="ghost"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Show fewer' : `Show ${hidden} more`}
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export const Header = ({
  title,
  children,
}: {
  title: ReactNode;
  children?: ReactNode;
}) => (
  <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
    <div className="mr-auto min-w-0 text-sm font-semibold [overflow-wrap:anywhere]">
      {title}
    </div>
    {children}
  </div>
);

export const Section = ({
  title,
  actions,
  children,
}: {
  title: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) => (
  <section className="border-b border-border">
    <div className="flex items-center gap-2 px-3 pt-3 pb-2">
      <h3 className="mr-auto text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {actions}
    </div>
    <div className="min-w-0 px-3 pb-3">{children}</div>
  </section>
);

/** DataTable that scrolls sideways instead of overflowing a narrow panel. */
export const Table = <TRow,>(props: DataTableProps<TRow>) => (
  <div className="overflow-x-auto">
    <DataTable {...props} />
  </div>
);

export const Detail = ({
  title,
  data,
  onClose,
}: {
  title: string;
  data: unknown;
  onClose: () => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  // Opened from a table row that may be far above; bring it on screen.
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, []);
  return (
    // shrink-0: inside the panel's flex column a shrinkable box collapses and
    // its content overlaps the next section
    <div ref={ref} className="flex shrink-0 flex-col border-y border-border">
      <Header title={title}>
        <Button size="sm" tone="neutral" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </Header>
      <div className="max-h-96 overflow-auto p-3 text-xs">
        <JsonInspector data={data} defaultExpandedDepth={2} />
      </div>
    </div>
  );
};

/** Wraps output that appears below the fold after an action and scrolls to it. */
export const Reveal = ({ children }: { children: ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, []);
  return <div ref={ref}>{children}</div>;
};

export const Notice = ({ children }: { children: ReactNode }) => (
  <div className="p-4 text-sm text-muted-foreground">{children}</div>
);

/** Monospace text that wraps only where it has to. */
export const Mono = ({ children }: { children: ReactNode }) => (
  <span className="font-mono text-xs [overflow-wrap:anywhere]">{children}</span>
);

// Relative to the panel (the iframe viewport), so a table with several
// clipped columns still fits a typical DevTools width.
const CLIP_WIDTHS = {
  sm: 'max-w-[min(12rem,14vw)]',
  md: 'max-w-[min(18rem,19vw)]',
  lg: 'max-w-[min(28rem,28vw)]',
  xl: 'max-w-[min(40rem,45vw)]',
} as const;

/**
 * One-line table cell, cut with an ellipsis and shown in full on hover. Keeps
 * rows one line high however long ids, URLs and messages get; selecting the
 * row shows the full value.
 */
export const Clip = ({
  children,
  width = 'md',
  mono = true,
  className,
}: {
  children?: string;
  width?: keyof typeof CLIP_WIDTHS;
  mono?: boolean;
  className?: string;
}) =>
  children ? (
    <span
      title={children}
      className={[
        'block truncate',
        CLIP_WIDTHS[width],
        mono ? 'font-mono text-xs' : '',
        className ?? '',
      ].join(' ')}
    >
      {children}
    </span>
  ) : null;

/** Short values (times, sizes, statuses) that must not wrap. */
export const NoWrap = ({ children }: { children: ReactNode }) => (
  <span className="whitespace-nowrap tabular-nums">{children}</span>
);

/** Long preformatted text (stacks, code frames), collapsed to its first line. */
export const Collapsible = ({
  summary,
  children,
  defaultOpen = false,
  tone,
}: {
  summary: string;
  children: ReactNode;
  defaultOpen?: boolean;
  tone?: 'danger' | 'warning';
}) => (
  <details
    open={defaultOpen}
    className="rounded border border-border [&[open]>summary]:border-b [&[open]>summary]:border-border"
  >
    <summary
      className={`cursor-pointer truncate px-2 py-1 font-mono text-xs ${tone === 'danger' ? 'text-danger' : tone === 'warning' ? 'text-warning' : ''}`}
      title={summary}
    >
      {summary}
    </summary>
    <pre className="max-h-64 overflow-auto p-2 font-mono text-[11px] whitespace-pre-wrap [overflow-wrap:anywhere]">
      {children}
    </pre>
  </details>
);
