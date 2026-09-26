import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { operationApi } from '../api/client';
import { Plus, CheckCircle, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function AdjustmentsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await operationApi.list({ type: 'ADJUSTMENT', page_size: 100 });
      setItems(data.items);
    } catch { 
      toast.error('Failed to load adjustments'); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleValidate = async (id, e) => {
    e.stopPropagation();
    try {
      await operationApi.validate(id);
      toast.success('Adjustment validated!');
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Validation failed');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory Adjustments</h1>
          <p className="page-subtitle">{items.length} adjustments · Physical count reconciliation</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-primary" onClick={() => navigate('/adjustments/new')}>
            <Plus size={16} /> New Adjustment
          </button>
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: 'auto' }} />
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><ClipboardList size={32} /></div>
            <h3>No adjustments found</h3>
            <p>Create your first adjustment to get started</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Product</th>
                <th>Location</th>
                <th style={{ textAlign: 'right' }}>Recorded</th>
                <th style={{ textAlign: 'right' }}>Counted</th>
                <th style={{ textAlign: 'right' }}>Difference</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((op) => {
                const line = op.lines?.[0]; // Assume 1 product per adjustment for simple form
                const product = line?.product;
                // Since we don't save recorded_stock in the DB, we can reverse calculate it:
                // counted = line.quantity
                // difference = line.done_quantity ? line.done_quantity (Wait, line.quantity is counted, but what is recorded?)
                // Actually, if we just show it dynamically. Wait, if it's already done, line.done_quantity is counted.
                // It's tricky to show "recorded" and "difference" accurately for past operations unless we store them.
                // For now we'll just show the counted quantity in "Counted".
                
                return (
                  <tr key={op.id} onClick={() => navigate(`/adjustments/${op.id}`)} style={{ cursor: 'pointer' }} className="hover-row">
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--brand-primary-light)' }}>
                        {op.reference}
                      </span>
                    </td>
                    <td>{product ? `[${product.sku}] ${product.name}` : '—'}</td>
                    <td>{op.to_location?.name || '—'}</td>
                    <td style={{ textAlign: 'right' }}>—</td>
                    <td style={{ textAlign: 'right' }}>{line?.quantity || '—'}</td>
                    <td style={{ textAlign: 'right' }}>—</td>
                    <td><span className={`badge badge-${op.status}`}>{op.status}</span></td>
                    <td>{op.created_at ? format(new Date(op.created_at), 'MMM d, yyyy') : '—'}</td>
                    <td>
                      {op.status !== 'done' && op.status !== 'canceled' && (
                        <button className="btn btn-success btn-sm" onClick={(e) => handleValidate(op.id, e)}>
                          <CheckCircle size={13} /> Validate
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
