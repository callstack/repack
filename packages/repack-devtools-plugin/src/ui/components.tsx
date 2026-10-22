import { Alert, Badge, Button, JsonInspector, type Tone } from '@rozenite/ui';
import type { ReactNode } from 'react';
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

export const Diagnostics = ({ items }: { items: Diagnostic[] }) => {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 p-3">
      {items.map((item, index) => (
        <Alert
          // biome-ignore lint/suspicious/noArrayIndexKey: diagnostics are an immutable, ordered snapshot; position is their identity
          key={`${item.ref ?? ''}-${index}`}
          tone={SEVERITY_TONES[item.severity]}
        >
          <Alert.Title>{item.message}</Alert.Title>
          {item.hint ? (
            <Alert.Description>{item.hint}</Alert.Description>
          ) : null}
        </Alert>
      ))}
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
    <div className="mr-auto text-sm font-semibold">{title}</div>
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
    <div className="px-3 pb-3">{children}</div>
  </section>
);

export const Detail = ({
  title,
  data,
  onClose,
}: {
  title: string;
  data: unknown;
  onClose: () => void;
}) => (
  <div className="flex min-h-0 flex-col border-t border-border">
    <Header title={title}>
      <Button size="sm" tone="neutral" variant="ghost" onClick={onClose}>
        Close
      </Button>
    </Header>
    <div className="overflow-auto p-3 text-xs">
      <JsonInspector data={data} defaultExpandedDepth={2} />
    </div>
  </div>
);

export const Notice = ({ children }: { children: ReactNode }) => (
  <div className="p-4 text-sm text-muted-foreground">{children}</div>
);

export const Mono = ({ children }: { children: ReactNode }) => (
  <span className="font-mono text-[11px] break-all">{children}</span>
);
