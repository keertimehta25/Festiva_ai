import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';

type Tone = 'info' | 'warning' | 'danger' | 'success';
const ICONS = { info: Info, warning: AlertTriangle, danger: XCircle, success: CheckCircle2 } as const;

interface NoticeProps {
  tone?: Tone;
  children: ReactNode;
  /** Danger notices are announced immediately; others politely. */
  live?: boolean;
}

/** Inline message. The icon and text carry the meaning, not colour alone. */
export function Notice({ tone = 'info', children, live = false }: NoticeProps) {
  const Icon = ICONS[tone];
  return (
    <div className={`notice notice-${tone}`} role={live ? (tone === 'danger' ? 'alert' : 'status') : undefined}>
      <Icon size={20} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
