import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { operationApi, productApi, warehouseApi, stockApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, XCircle, ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdjustmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const isNew = !id;

  const [operation, setOperation] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [recordedStock, setRecordedStock] = useState(null);
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    type: 'ADJUSTMENT',
    warehouse_id: '',
    to_location_id: '',
    product_id: '',
    quantity: '',
  });

  useEffect(() => {
    Promise.all([warehouseApi.list(), warehouseApi.listLocations(), productApi.list()])
      .then(([wRes, lRes, pRes]) => {
        setWarehouses(wRes.data);
        setLocations(lRes.data);
        setProducts(pRes.data);
      });
  }, []);

  const loadOperation = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    try {
      const res = await operationApi.get(id);
      const op = res.data;
      setOperation(op);
      setForm({
        type: 'ADJUSTMENT',
        warehouse_id: op.warehouse_id || '',
        to_location_id: op.to_location_id || '',
        product_id: op.lines?.[0]?.product_id || '',
        quantity: op.lines?.[0]?.quantity || 0,
      });
    } catch {
      toast.error('Failed to load adjustment');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  }, [id, isNew, navigate]);

  useEffect(() => {
    loadOperation();
  }, [loadOperation]);

  useEffect(() => {
    // Fetch recorded stock when location or product changes
    if (form.to_location_id && form.product_id) {
      stockApi.list({ location_id: form.to_location_id }).then(res => {
        const stockItem = res.data.find(s => s.product_id === form.product_id);
        setRecordedStock(stockItem ? stockItem.on_hand : 0);
      });
    } else {
      setRecordedStock(null);
    }
  }, [form.to_location_id, form.product_id]);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!form.product_id || form.quantity === '') {
      toast.error('Please select a product and enter the counted quantity');
      return false;
    }
    
    setSaving(true);
    const payload = {
      type: 'ADJUSTMENT',
      warehouse_id: form.warehouse_id || undefined,
      to_location_id: form.to_location_id || undefined,
      lines: [{ product_id: form.product_id, quantity: Number(form.quantity) }],
    };

    try {
      if (isNew) {
        const res = await operationApi.create(payload);
        toast.success(`Adjustment created`);
        navigate(`/adjustments/${res.data.id}`, { replace: true });
        return true;
      } else {
        await operationApi.update(id, payload);
        toast.success(`Adjustment updated`);
        await loadOperation();
        return true;
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    if (!operation) return;
    try {
      await operationApi.validate(operation.id);
      toast.success('Adjustment validated!');
      loadOperation();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Validation failed');
    }
  };

  const handleCancel = async () => {
    if (!operation) return;
    if (!confirm('Cancel this adjustment?')) return;
    try {
      await operationApi.cancel(operation.id);
      toast.success('Adjustment canceled');
      loadOperation();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Cancellation failed');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: 'auto' }} />
      </div>
    );
  }

  const isReadonly = operation && (operation.status === 'done' || operation.status === 'canceled');
  
  // Calculate difference
  let difference = null;
  if (recordedStock !== null && form.quantity !== '') {
    difference = Number(form.quantity) - recordedStock;
  }

  return (
    <div className="operation-detail" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: 0, paddingBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <button className="btn btn-icon btn-ghost" onClick={() => navigate('/adjustments')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              {operation ? operation.reference : 'New Inventory Adjustment'}
              {operation && <span className={`badge badge-${operation.status}`} style={{ fontSize: '0.8rem' }}>{operation.status}</span>}
            </h1>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {!isReadonly && (
            <button className="btn btn-secondary" onClick={handleSave} disabled={saving}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save Draft'}
            </button>
          )}
          {operation && (operation.status === 'draft' || operation.status === 'ready') && (
            <button className="btn btn-success" onClick={handleValidate}>
              <CheckCircle size={16} /> Validate Count
            </button>
          )}
          {operation && (operation.status === 'draft' || operation.status === 'ready') && (
            <button className="btn btn-ghost" onClick={handleCancel} style={{ color: 'var(--color-error)' }}>
              <XCircle size={16} /> Cancel
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 'var(--space-6)', marginTop: 'var(--space-4)' }}>
        <form onSubmit={handleSave}>
          <div className="grid-2" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="form-group">
              <label className="form-label required">Warehouse</label>
              <select
                className="form-select"
                value={form.warehouse_id}
                onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
                disabled={isReadonly}
                required
              >
                <option value="">Select warehouse…</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label required">Location</label>
              <select
                className="form-select"
                value={form.to_location_id}
                onChange={(e) => setForm({ ...form, to_location_id: e.target.value })}
                disabled={isReadonly}
                required
              >
                <option value="">Select location…</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 'var(--space-8)' }}>
            <label className="form-label required">Product</label>
            <select
              className="form-select"
              value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              disabled={isReadonly}
              required
            >
              <option value="">Select product to count…</option>
              {products.map((p) => <option key={p.id} value={p.id}>[{p.sku}] {p.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)' }}>
            <div>
              <label className="form-label" style={{ color: 'var(--text-muted)' }}>Recorded Stock</label>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                {recordedStock !== null ? recordedStock : '—'}
              </div>
            </div>
            <div>
              <label className="form-label required">Counted Quantity</label>
              <input
                type="number"
                className="form-input"
                style={{ fontSize: '1.5rem', fontWeight: 600, fontFamily: 'var(--font-mono)', height: 48 }}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                disabled={isReadonly}
                placeholder="0"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="form-label" style={{ color: 'var(--text-muted)' }}>Difference</label>
              <div style={{ 
                fontSize: '1.5rem', 
                fontWeight: 600, 
                fontFamily: 'var(--font-mono)',
                color: difference === null ? 'inherit' : difference > 0 ? 'var(--color-success)' : difference < 0 ? 'var(--color-error)' : 'inherit'
              }}>
                {difference !== null ? (difference > 0 ? `+${difference}` : difference) : '—'}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
