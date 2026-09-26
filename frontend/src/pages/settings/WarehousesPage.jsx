import { useState, useEffect, useCallback } from 'react';
import { warehouseApi } from '../../api/client';
import { Plus, Pencil, Trash2, Warehouse } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

function WarehouseModal({ warehouse, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: warehouse?.name || '',
    short_code: warehouse?.short_code || '',
    address: warehouse?.address || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (warehouse) {
        await warehouseApi.update(warehouse.id, form);
        toast.success('Warehouse updated');
      } else {
        await warehouseApi.create(form);
        toast.success('Warehouse created');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{warehouse ? 'Edit Warehouse' : 'New Warehouse'}</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label required">Name</label>
                <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Main Warehouse" required />
              </div>
              <div className="form-group">
                <label className="form-label required">Short Code</label>
                <input
                  className="form-input font-mono"
                  value={form.short_code}
                  onChange={(e) => setForm({ ...form, short_code: e.target.value.toUpperCase() })}
                  placeholder="WH01"
                  required
                  maxLength={20}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea className="form-textarea" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full warehouse address…" style={{ minHeight: 72 }} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <div className="spinner" /> : (warehouse ? 'Update' : 'Create Warehouse')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function WarehousesPage() {
  const { isManager } = useAuth();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await warehouseApi.list();
      setWarehouses(data);
    } catch { toast.error('Failed to load warehouses'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const deleteWarehouse = async (id) => {
    if (!confirm('Delete this warehouse? All linked locations will also be deleted.')) return;
    try {
      await warehouseApi.delete(id);
      toast.success('Warehouse deleted');
      load();
    } catch { toast.error('Cannot delete warehouse'); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Warehouses</h1>
          <p className="page-subtitle">{warehouses.length} warehouses configured</p>
        </div>
        {isManager && (
          <button className="btn btn-primary" onClick={() => setModal('create')}>
            <Plus size={16} /> New Warehouse
          </button>
        )}
      </div>

      <div className="table-container">
        {loading ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}><div className="spinner" style={{ margin: 'auto' }} /></div>
        ) : warehouses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Warehouse size={32} /></div>
            <h3>No warehouses yet</h3>
            <p>Add your first warehouse to start configuring locations</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Short Code</th>
                <th>Name</th>
                <th>Address</th>
                {isManager && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {warehouses.map((w) => (
                <tr key={w.id} onClick={() => isManager && setModal(w)} style={{ cursor: isManager ? 'pointer' : 'default' }} className="hover-row">
                  <td>
                    <span className="badge font-mono" style={{ background: 'hsla(231,100%,65%,0.1)', color: 'var(--brand-primary-light)', border: '1px solid hsla(231,100%,65%,0.2)' }}>
                      {w.short_code}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{w.name}</td>
                  <td className="text-muted">{w.address || '—'}</td>
                  {isManager && (
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
                        <button className="btn btn-icon btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setModal(w); }} data-tooltip="Edit">
                          <Pencil size={14} />
                        </button>
                        <button className="btn btn-icon btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); deleteWarehouse(w.id); }} style={{ color: 'var(--color-error)' }} data-tooltip="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <WarehouseModal
          warehouse={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
