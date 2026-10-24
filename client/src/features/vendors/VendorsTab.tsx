import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { followUpsDue, linkedExpenseTotal, summarizeVendors, vendorPaid, vendorPending } from '@shared/calc/vendors';
import { PAYMENT_STATUS_LABELS, VENDOR_CATEGORIES, VENDOR_CATEGORY_LABELS, VENDOR_STATUS_LABELS, type VendorStatus } from '@shared/constants';
import type { VendorRecord, Workspace } from '@shared/types';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/Feedback';
import { Notice } from '../../components/ui/Notice';
import { useToast } from '../../components/ui/Toasts';
import { useWorkspaceMutation } from '../../hooks/useEvents';
import { getToday } from '../../hooks/useToday';
import { api } from '../../lib/api';
import { formatDate, formatRupees } from '../../lib/format';
import { VendorDialog } from './VendorDialog';

const STATUS_BADGE: Record<VendorStatus, string> = { shortlisted: 'badge-neutral', contacted: 'badge', quoted: 'badge-warning', booked: 'badge-success', rejected: 'badge-danger' };

export default function VendorsTab({ workspace }: { workspace: Workspace }) {
  const { event, vendors, tasks, expenses } = workspace;
  const today = getToday();
  const toast = useToast();
  const [dialog, setDialog] = useState<{ vendor: VendorRecord | null } | null>(null);
  const [deleting, setDeleting] = useState<VendorRecord | null>(null);
  const remove = useWorkspaceMutation(event.id, (id: string) => api.deleteVendor(event.id, id));

  const totals = summarizeVendors(vendors);
  const due = followUpsDue(vendors, today);
  const ordered = [...vendors].sort((a, b) => VENDOR_CATEGORIES.indexOf(a.category) - VENDOR_CATEGORIES.indexOf(b.category) || a.name.localeCompare(b.name));

  return (
    <div className="stack">
      <Notice tone="info">
        <p>This is your own vendor tracker. Festiva AI does not look up, verify or rate vendors, so every name, contact, quote and status here is information you entered.</p>
      </Notice>

      <div className="stat-grid">
        <div className="stat"><div className="stat-label">Quoted (active vendors)</div><div className="stat-value">{formatRupees(totals.quotedTotal)}</div><div className="stat-note">Excludes rejected vendors</div></div>
        <div className="stat"><div className="stat-label">Committed (booked)</div><div className="stat-value">{formatRupees(totals.committedTotal)}</div><div className="stat-note">{totals.bookedCount} booked</div></div>
        <div className="stat"><div className="stat-label">Paid to vendors</div><div className="stat-value">{formatRupees(totals.paidTotal)}</div></div>
        <div className="stat"><div className="stat-label">Pending payments</div><div className="stat-value">{formatRupees(totals.pendingTotal)}</div><div className="stat-note">Balance on booked vendors</div></div>
      </div>

      {due.length > 0 && <Notice tone="warning" live><p><strong>Follow-ups due:</strong> {due.map((v) => `${v.name} (${formatDate(v.followUpDate)})`).join(', ')}</p></Notice>}

      <section className="card" aria-labelledby="vendors-heading">
        <div className="card-header">
          <h2 id="vendors-heading">Vendors</h2>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setDialog({ vendor: null })}><Plus size={16} aria-hidden="true" /> Add vendor</button>
        </div>
        {vendors.length === 0 ? <EmptyState title="No vendors yet">Add the venues, caterers and others you are speaking to, and track quotes, advances and follow-ups.</EmptyState> : (
          <ul className="list-plain">
            {ordered.map((vendor) => {
              const linkedTasks = tasks.filter((task) => task.vendorId === vendor.id);
              const spent = linkedExpenseTotal(expenses, vendor.id);
              return (
                <li key={vendor.id}>
                  <div className="row-between">
                    <div>
                      <strong>{vendor.name}</strong> <span className="muted">· {VENDOR_CATEGORY_LABELS[vendor.category]}</span>
                    </div>
                    <div className="row-actions">
                      <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setDialog({ vendor })} aria-label={`Edit ${vendor.name}`}><Pencil size={16} aria-hidden="true" /></button>
                      <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setDeleting(vendor)} aria-label={`Delete ${vendor.name}`}><Trash2 size={16} aria-hidden="true" /></button>
                    </div>
                  </div>
                  <div className="event-meta" style={{ marginTop: 6 }}>
                    <span className={`badge ${STATUS_BADGE[vendor.bookingStatus]}`}>{VENDOR_STATUS_LABELS[vendor.bookingStatus]}</span>
                    <span className="badge badge-neutral">{PAYMENT_STATUS_LABELS[vendor.paymentStatus]}</span>
                    {vendor.followUpDate && <span className="badge badge-neutral">Follow up {formatDate(vendor.followUpDate)}</span>}
                  </div>
                  <p className="small" style={{ margin: '6px 0 0' }}>
                    Quoted {formatRupees(vendor.quotedPrice)} · Paid {formatRupees(vendorPaid(vendor))} · Pending {formatRupees(vendorPending(vendor))}
                    {spent > 0 && <> · Expenses logged {formatRupees(spent)}</>}
                  </p>
                  {vendor.contact && <p className="small muted" style={{ margin: '2px 0 0' }}>Contact: {vendor.contact}</p>}
                  {vendor.notes && <p className="small" style={{ margin: '2px 0 0' }}>{vendor.notes}</p>}
                  {linkedTasks.length > 0 && <p className="small muted" style={{ margin: '2px 0 0' }}>Linked tasks: {linkedTasks.map((t) => t.title).join(', ')}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {dialog && <VendorDialog eventId={event.id} vendor={dialog.vendor} onClose={() => setDialog(null)} />}
      {deleting && (
        <ConfirmDialog title="Delete this vendor?" message={`“${deleting.name}” will be removed. Tasks and expenses that mention it are kept but unlinked.`} confirmLabel="Delete vendor" busy={remove.isPending}
          onConfirm={() => remove.mutate(deleting.id, { onSuccess: () => { toast.success('Vendor deleted'); setDeleting(null); }, onError: (e) => { toast.error(e.message); setDeleting(null); } })}
          onCancel={() => setDeleting(null)} />
      )}
    </div>
  );
}
