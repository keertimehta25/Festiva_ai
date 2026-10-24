import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { ApiError } from '../../lib/api';
import { Notice } from './Notice';

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="loading-block" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}…</span>
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <Inbox size={40} aria-hidden="true" />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

/** Understandable error message with an optional retry. */
export function ErrorNotice({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof ApiError || error instanceof Error ? error.message : 'Something went wrong. Please try again.';
  return (
    <Notice tone="danger" live>
      <p>{message}</p>
      {onRetry && (
        <div className="notice-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>Try again</button>
        </div>
      )}
    </Notice>
  );
}
