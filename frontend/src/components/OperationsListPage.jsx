/**
 * Shared Operations List Page
 * Used by Receipts, Deliveries, Transfers, Adjustments
 */
import { useState, useEffect, useCallback } from 'react';
import { operationApi } from '../api/client';
import { Plus, Search, CheckCircle, XCircle, Eye, LayoutGrid, List } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import OperationFormModal from './OperationFormModal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const STATUS_ORDER = ['draft', 'waiting', 'ready', 'done', 'canceled'];

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

function KanbanView({ items, onValidate, onCancel, onRowClick }) {
  const columns = STATUS_ORDER.filter((s) => s !== 'canceled');
  const grouped = Object.fromEntries(columns.map((s) => [s, items.filter((i) => i.status === s)]));

  return (
    <div style={{ display: 'flex', gap: 'var(--space-4)', overflowX: 'auto', paddingBottom: 'var(--space-4)' }}>
      {columns.map((col) => (
        <div key={col} style={{ minWidth: 240, flex: '0 0 240px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
            marginBottom: 'var(--space-3)',
          }}>
            <StatusBadge status={col} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({grouped[col].length})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {grouped[col].map((op) => (
              <div key={op.id} className="card hover-card" onClick={() => onRowClick(op)} style={{ padding: 'var(--space-4)', cursor: 'pointer' }}>
                <div style={{ fontWeight: 600, marginBottom: 4, fontSize: '0.875rem', fontFamily: 'var(--font-mono)' }}>
                  {op.reference}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
                  {op.contact || '—'}
                  {op.schedule_date && <> · {op.schedule_date}</>}
                </div>
                {col === 'ready' && (
                  <button className="btn btn-success btn-sm w-full" onClick={(e) => { e.stopPropagation(); onValidate(op.id); }} style={{ justifyContent: 'center' }}>
                    <CheckCircle size={13} /> Validate
                  </button>
                )}
              </div>
            ))}
            {grouped[col].length === 0 && (
              <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-disabled)', fontSize: '0.8rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-subtle)' }}>
                Empty
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function OperationsListPage({ type, title, subtitle, icon: Icon }) {
  const { isManager } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [view, setView] = useState('list'); // 'list' | 'kanban'
  const [modal, setModal] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await operationApi.list({
        type,
        status: filterStatus || undefined,
        search: search || undefined,
        page,
        page_size: PAGE_SIZE,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch { toast.error('Failed to load operations'); }
    finally { setLoading(false); }
  }, [type, filterStatus, search, page]);

  useEffect(() => { load(); }, [load]);

  const handleValidate = async (id) => {
    try {
      await operationApi.validate(id);
      toast.success('Operation validated!');
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Validation failed');
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Cancel this operation?')) return;
    try {
      await operationApi.cancel(id);
      toast.success('Operation canceled');
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Cancel failed');
    }
  };

  const canValidate = (status) => status === 'ready';
  const canCancel = (status) => !['done', 'canceled'].includes(status);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{total} operations · {subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            className={`btn ${view === 'list' ? 'btn-secondary' : 'btn-ghost'} btn-icon`}
            onClick={() => setView('list')} data-tooltip="List view"
          >
            <List size={16} />
          </button>
          <button
            className={`btn ${view === 'kanban' ? 'btn-secondary' : 'btn-ghost'} btn-icon`}
            onClick={() => setView('kanban')} data-tooltip="Kanban view"
          >
            <LayoutGrid size={16} />
          </button>
          <button className="btn btn-primary" onClick={() => setModal(true)}>
            <Plus size={16} /> New {title.replace(/s$/, '')}
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-input-wrapper">
          <Search size={16} className="icon" />
          <input
            className="form-input"
            placeholder="Search by reference or contact…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="form-select"
          style={{ width: 160 }}
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          {STATUS_ORDER.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {view === 'kanban' ? (
        <KanbanView items={items} onValidate={handleValidate} onCancel={handleCancel} onRowClick={setModal} />
      ) : (
        <>
          <div className="table-container">
            {loading ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: 'auto' }} />
              </div>
            ) : items.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><Icon size={32} /></div>
                <h3>No {title.toLowerCase()} found</h3>
                <p>Create your first {title.toLowerCase().replace(/s$/, '')} to get started</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Contact</th>
                    <th>Schedule Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((op) => (
                    <tr key={op.id} onClick={() => setModal(op)} style={{ cursor: 'pointer' }} className="hover-row">
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--brand-primary-light)' }}>
                          {op.reference}
                        </span>
                      </td>
                      <td>{op.type === 'IN' ? 'Vendor' : op.from_location?.name || '—'}</td>
                      <td>{op.type === 'OUT' ? 'Customer' : op.to_location?.name || '—'}</td>
                      <td>{op.contact || <span className="text-muted">—</span>}</td>
                      <td>
                        {op.schedule_date ? (
                          <span style={{ color: new Date(op.schedule_date) < new Date() && op.status !== 'done' ? 'var(--color-error)' : 'inherit' }}>
                            {op.schedule_date}
                          </span>
                        ) : <span className="text-muted">—</span>}
                      </td>
                      <td><StatusBadge status={op.status} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                          {canValidate(op.status) && (
                            <button className="btn btn-success btn-sm" onClick={(e) => { e.stopPropagation(); handleValidate(op.id); }}>
                              <CheckCircle size={13} /> Validate
                            </button>
                          )}
                          {op.status === 'done' && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <CheckCircle size={13} /> Done
                            </span>
                          )}
                          {canCancel(op.status) && (
                            <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); handleCancel(op.id); }} style={{ color: 'var(--text-muted)' }}>
                              <XCircle size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
              <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
              <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Page {page} of {Math.ceil(total / PAGE_SIZE)}
              </span>
              <button className="btn btn-secondary btn-sm" disabled={page >= Math.ceil(total / PAGE_SIZE)} onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}

      {modal && (
        <OperationFormModal
          type={type}
          operation={modal === true ? null : modal}
          onClose={() => setModal(false)}
          onSaved={load}
        />
      )}
    </div>
  );
}
