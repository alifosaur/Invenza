import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { operationApi, productApi, warehouseApi, stockApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Printer, CheckCircle, XCircle, ArrowLeft, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const TYPE_CONFIG = {
  IN: {
    label: 'Receipt',
    showFrom: false,
    showTo: true,
    contactLabel: 'Receive From (Vendor)',
    toLabel: 'Destination Location',
  },
  OUT: {
    label: 'Delivery',
    showFrom: true,
    showTo: false,
    contactLabel: 'Deliver To (Customer)',
    fromLabel: 'Source Location',
  },
  TRANSFER: {
    label: 'Transfer',
    showFrom: true,
    showTo: true,
    fromLabel: 'Source Location',
    toLabel: 'Destination Location',
  },
  ADJUSTMENT: {
    label: 'Adjustment',
    showFrom: false,
    showTo: true,
    toLabel: 'Inventory Location',
  },
};

export default function OperationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const isNew = !id;
  const initialType = searchParams.get('type') || 'IN';
  const type = isNew ? initialType : null; 

  const [operation, setOperation] = useState(null);
  const [cfg, setCfg] = useState(TYPE_CONFIG[initialType]);
  
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [stocks, setStocks] = useState({});
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    type: initialType,
    warehouse_id: '',
    from_location_id: '',
    to_location_id: '',
    contact: '',
    schedule_date: '',
    notes: '',
    lines: [{ product_id: '', quantity: 1 }]
  });

  const STATUS_ORDER = form.type === 'OUT' || form.type === 'TRANSFER' 
    ? ['draft', 'waiting', 'ready', 'done'] 
    : ['draft', 'ready', 'done'];

  useEffect(() => {
    Promise.all([warehouseApi.list(), warehouseApi.listLocations(), productApi.list()])
      .then(([wRes, lRes, pRes]) => {
        setWarehouses(wRes.data);
        setLocations(lRes.data);
        setProducts(pRes.data);
      });
  }, []);

  useEffect(() => {
    if (form.from_location_id && ['OUT', 'TRANSFER'].includes(form.type)) {
      stockApi.list({ location_id: form.from_location_id }).then(res => {
        const stockMap = {};
        res.data.forEach(s => {
          stockMap[s.product_id] = s.on_hand; // or free_to_use if backend supports it
        });
        setStocks(stockMap);
      });
    } else {
      setStocks({});
    }
  }, [form.from_location_id, form.type]);

  const loadOperation = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    try {
      const res = await operationApi.get(id);
      const op = res.data;
      setOperation(op);
      setCfg(TYPE_CONFIG[op.type]);
      setForm({
        type: op.type,
        warehouse_id: op.warehouse_id || '',
        from_location_id: op.from_location_id || '',
        to_location_id: op.to_location_id || '',
        contact: op.contact || '',
        schedule_date: op.schedule_date || '',
        notes: op.notes || '',
        lines: op.lines?.length > 0 
          ? op.lines.map(l => ({ product_id: l.product_id, quantity: l.quantity }))
          : [{ product_id: '', quantity: 1 }]
      });
    } catch {
      toast.error('Failed to load operation');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  }, [id, isNew, navigate]);

  useEffect(() => {
    loadOperation();
  }, [loadOperation]);

  const setLine = (idx, field, value) => {
    const updated = [...form.lines];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm({ ...form, lines: updated });
  };

  const addLine = () => setForm({ ...form, lines: [...form.lines, { product_id: '', quantity: 1 }] });
  const removeLine = (idx) => setForm({ ...form, lines: form.lines.filter((_, i) => i !== idx) });

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (form.lines.some((l) => !l.product_id || l.quantity <= 0)) {
      toast.error('All line items must have a product and quantity > 0');
      return false;
    }
    
    setSaving(true);
    const payload = {
      type: form.type,
      warehouse_id: form.warehouse_id || undefined,
      from_location_id: form.from_location_id || undefined,
      to_location_id: form.to_location_id || undefined,
      contact: form.contact || undefined,
      schedule_date: form.schedule_date || undefined,
      notes: form.notes || undefined,
      lines: form.lines.map((l) => ({ product_id: l.product_id, quantity: Number(l.quantity) })),
    };

    try {
      if (isNew) {
        const res = await operationApi.create(payload);
        toast.success(`${cfg.label} created`);
        navigate(`/operations/${res.data.id}`, { replace: true });
        return true;
      } else {
        await operationApi.update(id, payload);
        toast.success(`${cfg.label} updated`);
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
      toast.success('Validated successfully');
      loadOperation();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Validation failed');
    }
  };

  const handleCancel = async () => {
    if (!operation) return;
    if (!confirm('Are you sure you want to cancel this operation?')) return;
    try {
      await operationApi.cancel(operation.id);
      toast.success('Canceled successfully');
      loadOperation();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Cancellation failed');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: 'auto' }} />
      </div>
    );
  }

  const isReadonly = operation && (operation.status === 'done' || operation.status === 'canceled');
  const currentStatus = operation ? operation.status : 'draft';

  return (
    <div className="operation-detail">
      <div className="page-header" style={{ marginBottom: 0, paddingBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <button className="btn btn-icon btn-ghost" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              {operation ? operation.reference : `New ${cfg.label}`}
              {operation && <span className={`badge badge-${operation.status}`} style={{ fontSize: '0.8rem' }}>{operation.status}</span>}
            </h1>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {!isReadonly && (
            <button className="btn btn-secondary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
          {operation && operation.status === 'ready' && (
            <button className="btn btn-success" onClick={handleValidate}>
              <CheckCircle size={16} /> Validate
            </button>
          )}
          {operation && (operation.status === 'draft' || operation.status === 'ready' || operation.status === 'waiting') && (
            <button className="btn btn-ghost" onClick={handleCancel} style={{ color: 'var(--color-error)' }}>
              <XCircle size={16} /> Cancel
            </button>
          )}
          <button 
            className="btn btn-secondary" 
            onClick={handlePrint} 
            disabled={currentStatus !== 'done'}
            title={currentStatus !== 'done' ? "Can only print when Done" : "Print receipt"}
          >
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      <div className="status-stepper" style={{
        display: 'flex', 
        alignItems: 'center', 
        padding: 'var(--space-4)', 
        background: 'var(--bg-card)', 
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: 'var(--space-6)',
        borderTop: '1px solid var(--border-subtle)'
      }}>
        {STATUS_ORDER.map((s, idx) => {
          const isActive = s === currentStatus;
          const isPassed = STATUS_ORDER.indexOf(s) <= STATUS_ORDER.indexOf(currentStatus) && currentStatus !== 'canceled';
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                gap: 'var(--space-2)',
                color: isActive ? 'var(--brand-primary)' : isPassed ? 'var(--text-primary)' : 'var(--text-disabled)',
                fontWeight: isActive ? 600 : 400,
                flex: 1
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: isActive ? 'var(--brand-primary)' : isPassed ? 'var(--bg-elevated)' : 'transparent',
                  border: `2px solid ${isActive || isPassed ? 'var(--brand-primary)' : 'var(--border-default)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isActive ? 'white' : 'inherit',
                  fontSize: '0.75rem'
                }}>
                  {isPassed && !isActive ? <CheckCircle size={14} color="var(--brand-primary)" /> : idx + 1}
                </div>
                <span style={{ textTransform: 'capitalize', fontSize: '0.875rem' }}>{s}</span>
              </div>
              {idx < STATUS_ORDER.length - 1 && (
                <div style={{ height: 2, flex: 1, background: isPassed && !isActive ? 'var(--brand-primary)' : 'var(--border-subtle)' }} />
              )}
            </div>
          )
        })}
      </div>

      <div className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
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
              <label className="form-label">Operation Type</label>
              <select
                className="form-select"
                value={form.type}
                disabled
              >
                <option value="IN">Receipt</option>
                <option value="OUT">Delivery</option>
                <option value="TRANSFER">Transfer</option>
                <option value="ADJUSTMENT">Adjustment</option>
              </select>
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="form-group">
              <label className="form-label">Responsible</label>
              <input
                className="form-input"
                value={operation ? (operation.responsible_user?.login_id || 'Admin') : user?.login_id}
                disabled
              />
            </div>
            <div className="form-group">
              <label className="form-label">Schedule Date</label>
              <input
                type="date"
                className="form-input"
                value={form.schedule_date}
                onChange={(e) => setForm({ ...form, schedule_date: e.target.value })}
                disabled={isReadonly}
              />
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: 'var(--space-8)' }}>
            {cfg.showFrom && (
              <div className="form-group">
                <label className="form-label required">{cfg.fromLabel}</label>
                <select
                  className="form-select"
                  value={form.from_location_id}
                  onChange={(e) => setForm({ ...form, from_location_id: e.target.value })}
                  disabled={isReadonly}
                  required
                >
                  <option value="">Select location…</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            )}
            {cfg.showTo && (
              <div className="form-group">
                <label className="form-label required">{cfg.toLabel}</label>
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
            )}
            
            {cfg.contactLabel && (
              <div className="form-group" style={{ gridColumn: cfg.showFrom && cfg.showTo ? '1 / -1' : 'auto' }}>
                <label className="form-label">{cfg.contactLabel}</label>
                <input
                  className="form-input"
                  placeholder={`${cfg.contactLabel} name…`}
                  value={form.contact}
                  onChange={(e) => setForm({ ...form, contact: e.target.value })}
                  disabled={isReadonly}
                />
              </div>
            )}
          </div>

          <div style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-2)' }}>
              Line Items
            </h3>
            
            <table className="dense-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '60%' }}>Product</th>
                  <th style={{ width: '30%', textAlign: 'right' }}>Quantity</th>
                  <th style={{ width: '10%', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {form.lines.map((line, idx) => {
                  const outOfStock = form.type === 'OUT' && line.product_id && (stocks[line.product_id] || 0) < line.quantity;
                  return (
                    <tr key={idx} style={{ background: outOfStock ? 'hsla(0, 100%, 50%, 0.05)' : 'transparent' }}>
                      <td>
                        <select
                          className="form-select form-select-sm"
                          style={{ width: '100%', borderColor: outOfStock ? 'var(--color-error)' : undefined }}
                          value={line.product_id}
                          onChange={(e) => setLine(idx, 'product_id', e.target.value)}
                          disabled={isReadonly}
                          required
                        >
                          <option value="">Select product…</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>[{p.sku}] {p.name}</option>
                          ))}
                        </select>
                        {outOfStock && (
                          <div style={{ color: 'var(--color-error)', fontSize: '0.75rem', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <AlertTriangle size={12} />
                            Only {stocks[line.product_id] || 0} in stock
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', verticalAlign: 'top' }}>
                        <input
                          type="number"
                          className="form-input form-input-sm"
                          style={{ 
                            width: '100px', 
                            marginLeft: 'auto', 
                            textAlign: 'right',
                            borderColor: outOfStock ? 'var(--color-error)' : undefined,
                            color: outOfStock ? 'var(--color-error)' : 'inherit'
                          }}
                          value={line.quantity}
                          onChange={(e) => setLine(idx, 'quantity', e.target.value)}
                          min="0.01"
                          step="0.01"
                          disabled={isReadonly}
                          required
                        />
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'top', paddingTop: 'var(--space-2)' }}>
                        {!isReadonly && form.lines.length > 1 && (
                          <button type="button" className="btn btn-icon btn-ghost" onClick={() => removeLine(idx)} style={{ color: 'var(--color-error)' }}>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {!isReadonly && (
              <button 
                type="button" 
                className="btn btn-ghost btn-sm" 
                onClick={addLine}
                style={{ marginTop: 'var(--space-2)', color: 'var(--brand-primary)' }}
              >
                <Plus size={14} /> Add new product
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
