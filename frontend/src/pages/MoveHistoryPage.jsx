
import { useState, useEffect, useCallback } from 'react';
import { moveHistoryApi } from '../api/client';
import { Search, History, LayoutGrid, List, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

function KanbanView({ items }) {
  // Move History only contains completed movements, so status is always 'done'
  return (
    <div style={{ display: 'flex', gap: 'var(--space-4)', overflowX: 'auto', paddingBottom: 'var(--space-4)' }}>
      <div style={{ minWidth: 280, flex: '0 0 280px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
          marginBottom: 'var(--space-3)',
        }}>
          <span className="badge badge-done">done</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({items.length})</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {items.map((h) => (
            <div key={h.id} className="card hover-card" style={{ padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', fontFamily: 'var(--font-mono)' }}>
                  {h.reference}
                </div>
                <div style={{
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  color: h.direction === 'IN' ? 'var(--color-success)' : 'var(--color-error)',
                }}>
                  {h.direction === 'IN' ? '+' : '−'}{h.quantity}
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {h.product_name || '—'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 'var(--space-2)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{h.from_location_name || '—'} ➔ {h.to_location_name || '—'}</span>
                <span>{format(new Date(h.date), 'dd MMM yyyy')}</span>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-disabled)', fontSize: '0.8rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-subtle)' }}>
              Empty
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MoveHistoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('list');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await moveHistoryApi.list({ search: search || undefined, page, page_size: PAGE_SIZE });
      setItems(data.items);
      setTotal(data.total);
    } catch { toast.error('Failed to load move history'); }
    finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Move History</h1>
          <p className="page-subtitle">Immutable ledger of all stock movements</p>
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
          {/* New button omitted as manual move history entries are not permitted by system logic */}
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
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {total} total movements
        </span>
      </div>

      {view === 'kanban' ? (
        <KanbanView items={items} />
      ) : (
        <div className="table-container">
          {loading ? (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
              <div className="spinner" style={{ margin: 'auto' }} />
            </div>
          ) : items.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><History size={32} /></div>
              <h3>No movements recorded</h3>
              <p>Movements appear here after validating any operation</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Product</th>
                  <th>Date</th>
                  <th>Contact</th>
                  <th>From</th>
                  <th>To</th>
                  <th style={{ textAlign: 'right' }}>Quantity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((h) => (
                  <tr key={h.id}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--brand-primary-light)', fontWeight: 600 }}>
                        {h.reference}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{h.product_name || '—'}</td>
                    <td className="text-sm">
                      {format(new Date(h.date), 'dd MMM yyyy, HH:mm')}
                    </td>
                    <td className="text-muted text-sm">{h.contact || '—'}</td>
                    <td className="text-muted text-sm">{h.from_location_name || (h.direction === 'IN' ? 'vendor' : '—')}</td>
                    <td className="text-muted text-sm">{h.to_location_name || (h.direction === 'OUT' ? 'customer' : '—')}</td>
                    <td style={{
                      textAlign: 'right',
                      fontWeight: 700,
                      color: h.direction === 'IN' ? 'var(--color-success)' : 'var(--color-error)',
                    }}>
                      {h.direction === 'IN' ? '+' : '−'}{h.quantity}
                    </td>
                    <td>
                      <span className="badge badge-done" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle size={12} /> Done
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {total > PAGE_SIZE && view === 'list' && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
          <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Page {page} of {Math.ceil(total / PAGE_SIZE)}
          </span>
          <button className="btn btn-secondary btn-sm" disabled={page >= Math.ceil(total / PAGE_SIZE)} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
