/**
 * Shared Operation Form Modal
 * Used by Receipts, Deliveries, Transfers, Adjustments
 */
import { useState, useEffect } from 'react';
import { operationApi, productApi, warehouseApi } from '../api/client';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const TYPE_CONFIG = {
  IN: {
    label: 'Receipt',
    showFrom: false,
    showTo: true,
    contactLabel: 'Supplier',
    toLabel: 'Receive Into',
  },
  OUT: {
    label: 'Delivery',
    showFrom: true,
    showTo: false,
    contactLabel: 'Customer / Delivery Address',
    fromLabel: 'Ship From',
  },
  TRANSFER: {
    label: 'Transfer',
    showFrom: true,
    showTo: true,
    fromLabel: 'From Location',
    toLabel: 'To Location',
  },
  ADJUSTMENT: {
    label: 'Adjustment',
    showFrom: false,
    showTo: true,
    toLabel: 'Location',
  },
};

export default function OperationFormModal({ type, operation, onClose, onSaved }) {
  const cfg = TYPE_CONFIG[type];
  const isEdit = !!operation;

  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    warehouse_id: operation?.warehouse_id || '',
    from_location_id: operation?.from_location_id || '',
    to_location_id: operation?.to_location_id || '',
    contact: operation?.contact || '',
    schedule_date: operation?.schedule_date || '',
    notes: operation?.notes || '',
    lines: operation?.lines?.map((l) => ({ product_id: l.product_id, quantity: l.quantity })) || [
      { product_id: '', quantity: 1 },
    ],
  });

  useEffect(() => {
    Promise.all([warehouseApi.list(), warehouseApi.listLocations(), productApi.list()])
      .then(([wRes, lRes, pRes]) => {
        setWarehouses(wRes.data);
        setLocations(lRes.data);
        setProducts(pRes.data);
      });
  }, []);

  const setLine = (idx, field, value) => {
    const updated = [...form.lines];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm({ ...form, lines: updated });
  };

  const addLine = () => setForm({ ...form, lines: [...form.lines, { product_id: '', quantity: 1 }] });
  const removeLine = (idx) => setForm({ ...form, lines: form.lines.filter((_, i) => i !== idx) });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.lines.some((l) => !l.product_id || l.quantity <= 0)) {
      toast.error('All line items must have a product and quantity > 0');
      return;
    }
    setLoading(true);
    const payload = {
      type,
      warehouse_id: form.warehouse_id || undefined,
      from_location_id: form.from_location_id || undefined,
      to_location_id: form.to_location_id || undefined,
      contact: form.contact || undefined,
      schedule_date: form.schedule_date || undefined,
      notes: form.notes || undefined,
      lines: form.lines.map((l) => ({ product_id: l.product_id, quantity: Number(l.quantity) })),
    };
    try {
      if (isEdit) {
        await operationApi.update(operation.id, payload);
        toast.success(`${cfg.label} updated`);
      } else {
        await operationApi.create(payload);
        toast.success(`${cfg.label} created`);
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || `Failed to save ${cfg.label.toLowerCase()}`);
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEdit ? `Edit ${cfg.label}` : `New ${cfg.label}`}</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Warehouse */}
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label required">Warehouse</label>
                <select
                  className="form-select"
                  value={form.warehouse_id}
                  onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
                  required
                >
                  <option value="">Select warehouse…</option>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Schedule Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.schedule_date}
                  onChange={(e) => setForm({ ...form, schedule_date: e.target.value })}
                />
              </div>
            </div>

            {/* Locations */}
            <div className="grid-2">
              {cfg.showFrom && (
                <div className="form-group">
                  <label className="form-label required">{cfg.fromLabel}</label>
                  <select
                    className="form-select"
                    value={form.from_location_id}
                    onChange={(e) => setForm({ ...form, from_location_id: e.target.value })}
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
                    required
                  >
                    <option value="">Select location…</option>
                    {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Contact */}
            {cfg.contactLabel && (
              <div className="form-group">
                <label className="form-label">{cfg.contactLabel}</label>
                <input
                  className="form-input"
                  placeholder={`${cfg.contactLabel} name…`}
                  value={form.contact}
                  onChange={(e) => setForm({ ...form, contact: e.target.value })}
                />
              </div>
            )}

            {/* Notes */}
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                className="form-textarea"
                placeholder="Optional notes…"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                style={{ minHeight: 60 }}
              />
            </div>

            {/* Line Items */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                <label className="form-label" style={{ margin: 0 }}>
                  {type === 'ADJUSTMENT' ? 'Counted Quantities' : 'Products'}
                </label>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addLine}>
                  <Plus size={14} /> Add Line
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {form.lines.map((line, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                    <select
                      className="form-select"
                      style={{ flex: 2 }}
                      value={line.product_id}
                      onChange={(e) => setLine(idx, 'product_id', e.target.value)}
                      required
                    >
                      <option value="">Select product…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      className="form-input"
                      style={{ flex: 1, maxWidth: 120 }}
                      placeholder={type === 'ADJUSTMENT' ? 'Counted qty' : 'Quantity'}
                      value={line.quantity}
                      onChange={(e) => setLine(idx, 'quantity', e.target.value)}
                      min="0.01"
                      step="0.01"
                      required
                    />
                    {form.lines.length > 1 && (
                      <button type="button" className="btn btn-icon btn-ghost" onClick={() => removeLine(idx)} style={{ color: 'var(--color-error)', flexShrink: 0 }}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {type === 'ADJUSTMENT' && (
              <div style={{
                display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start',
                padding: 'var(--space-3) var(--space-4)',
                background: 'hsla(211,95%,60%,0.08)',
                border: '1px solid hsla(211,95%,60%,0.2)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem', color: 'var(--color-info)',
              }}>
                <AlertCircle size={16} style={{ marginTop: 2, flexShrink: 0 }} />
                Enter the physically counted quantity. The system will compute the difference and update stock automatically.
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <div className="spinner" /> : (isEdit ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
