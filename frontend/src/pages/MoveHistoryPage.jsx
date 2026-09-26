import { useState, useEffect, useCallback } from 'react';
import { moveHistoryApi } from '../api/client';
import { Search, History, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function MoveHistoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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
      </div>

      <div className="toolbar">
        <div className="search-input-wrapper">
          <Search size={16} className="icon" />
          <input
            className="form-input"
            placeholder="Search by reference…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {total} total movements
        </span>
      </div>

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
                <th>Dir</th>
                <th>Reference</th>
                <th>Product</th>
                <th>From</th>
                <th>To</th>
                <th>Contact</th>
                <th style={{ textAlign: 'right' }}>Quantity</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {items.map((h) => (
                <tr key={h.id}>
                  <td>
                    {h.direction === 'IN' ? (
                      <span style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ArrowDownToLine size={15} />
                        <span className="badge badge-in">IN</span>
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ArrowUpFromLine size={15} />
                        <span className="badge badge-out">OUT</span>
                      </span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--brand-primary-light)', fontWeight: 600 }}>
                      {h.reference}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{h.product_name || '—'}</td>
                  <td className="text-muted text-sm">{h.from_location_name || '—'}</td>
                  <td className="text-muted text-sm">{h.to_location_name || '—'}</td>
                  <td className="text-muted text-sm">{h.contact || '—'}</td>
                  <td style={{
                    textAlign: 'right',
                    fontWeight: 700,
                    color: h.direction === 'IN' ? 'var(--color-success)' : 'var(--color-error)',
                  }}>
                    {h.direction === 'IN' ? '+' : '−'}{h.quantity}
                  </td>
                  <td className="text-sm text-muted">
                    {format(new Date(h.date), 'dd MMM yyyy, HH:mm')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {total > PAGE_SIZE && (
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
