import { useState, useEffect, useCallback } from 'react';
import { warehouseApi } from '../../api/client';
import { Plus, Pencil, Trash2, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

function LocationModal({ location, warehouses, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: location?.name || '',
    short_code: location?.short_code || '',
    warehouse_id: location?.warehouse_id || (warehouses[0]?.id || ''),
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (location) {
        await warehouseApi.updateLocation(location.id, form);
        toast.success('Location updated');
      } else {
        await warehouseApi.createLocation(form);
        toast.success('Location created');
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
          <h3>{location ? 'Edit Location' : 'New Location'}</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label required">Warehouse</label>
              <select
                className="form-select"
                value={form.warehouse_id}
                onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
                required
              >
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.short_code})</option>)}
              </select>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label required">Name</label>
                <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Production Floor" required />
              </div>
              <div className="form-group">
                <label className="form-label required">Short Code</label>
                <input
                  className="form-input font-mono"
                  value={form.short_code}
                  onChange={(e) => setForm({ ...form, short_code: e.target.value.toUpperCase() })}
                  placeholder="LOC-A"
                  required
                  maxLength={20}
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <div className="spinner" /> : (location ? 'Update' : 'Create Location')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LocationsPage() {
  const { isManager } = useAuth();
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [wRes, lRes] = await Promise.all([
        warehouseApi.list(),
        warehouseApi.listLocations(filterWarehouse || undefined),
      ]);
      setWarehouses(wRes.data);
      setLocations(lRes.data);
    } catch { toast.error('Failed to load locations'); }
    finally { setLoading(false); }
  }, [filterWarehouse]);

  useEffect(() => { load(); }, [load]);

  const deleteLocation = async (id) => {
    if (!confirm('Delete this location?')) return;
    try {
      await warehouseApi.deleteLocation(id);
      toast.success('Location deleted');
      load();
    } catch { toast.error('Cannot delete location'); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Locations</h1>
          <p className="page-subtitle">{locations.length} locations across all warehouses</p>
        </div>
        {isManager && (
          <button className="btn btn-primary" onClick={() => setModal('create')} disabled={warehouses.length === 0}>
            <Plus size={16} /> New Location
          </button>
        )}
      </div>

      <div className="toolbar">
        <select
          className="form-select"
          style={{ width: 220 }}
          value={filterWarehouse}
          onChange={(e) => setFilterWarehouse(e.target.value)}
        >
          <option value="">All Warehouses</option>
          {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>

      {warehouses.length === 0 && !loading && (
        <div style={{
          padding: 'var(--space-4)',
          background: 'hsla(38,95%,55%,0.08)',
          border: '1px solid hsla(38,95%,55%,0.2)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-warning)',
          fontSize: '0.875rem',
          marginBottom: 'var(--space-4)',
        }}>
          ⚠ Create a warehouse first before adding locations.
        </div>
      )}

      <div className="table-container">
        {loading ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}><div className="spinner" style={{ margin: 'auto' }} /></div>
        ) : locations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><MapPin size={32} /></div>
            <h3>No locations yet</h3>
            <p>Add locations to start assigning stock</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Short Code</th>
                <th>Warehouse</th>
                {isManager && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {locations.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 600 }}>{l.name}</td>
                  <td><span className="tag font-mono">{l.short_code}</span></td>
                  <td>
                    {warehouses.find((w) => w.id === l.warehouse_id)?.name || '—'}
                  </td>
                  {isManager && (
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <button className="btn btn-icon btn-ghost" onClick={() => setModal(l)} data-tooltip="Edit">
                          <Pencil size={15} />
                        </button>
                        <button className="btn btn-icon btn-ghost" onClick={() => deleteLocation(l.id)} style={{ color: 'var(--color-error)' }} data-tooltip="Delete">
                          <Trash2 size={15} />
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
        <LocationModal
          location={modal === 'create' ? null : modal}
          warehouses={warehouses}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
