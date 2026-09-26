import { useState, useEffect, useCallback } from 'react';
import { stockApi, warehouseApi } from '../api/client';
import { Search, Boxes, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StockPage() {
  const [stocks, setStocks] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [filterLocation, setFilterLocation] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, wRes] = await Promise.all([
        stockApi.list({ location_id: filterLocation || undefined }),
        warehouseApi.list(),
      ]);
      setStocks(sRes.data);
      setWarehouses(wRes.data);
    } catch { toast.error('Failed to load stock'); }
    finally { setLoading(false); }
  }, [filterLocation]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (filterWarehouse) {
      warehouseApi.listLocations(filterWarehouse).then((r) => setLocations(r.data));
    } else {
      setLocations([]);
      setFilterLocation('');
    }
  }, [filterWarehouse]);

  const filtered = stocks.filter((s) => {
    const q = search.toLowerCase();
    return !q || s.product?.name?.toLowerCase().includes(q) || s.product?.sku?.toLowerCase().includes(q);
  });

  const getStockStatus = (s) => {
    if (s.on_hand <= 0) return { label: 'Out of Stock', cls: 'badge-out', color: 'var(--color-error)' };
    if (s.product?.reorder_threshold && s.on_hand <= s.product.reorder_threshold)
      return { label: 'Low Stock', cls: 'badge-waiting', color: 'var(--color-warning)' };
    return { label: 'In Stock', cls: 'badge-in', color: 'var(--color-success)' };
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock</h1>
          <p className="page-subtitle">Live inventory levels per location</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-input-wrapper" style={{ minWidth: 260 }}>
          <Search size={16} className="icon" />
          <input
            className="form-input"
            placeholder="Search product or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="form-select"
          style={{ width: 180 }}
          value={filterWarehouse}
          onChange={(e) => setFilterWarehouse(e.target.value)}
        >
          <option value="">All Warehouses</option>
          {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        {locations.length > 0 && (
          <select
            className="form-select"
            style={{ width: 180 }}
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
          >
            <option value="">All Locations</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}
      </div>

      <div className="table-container">
        {loading ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: 'auto' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Boxes size={32} /></div>
            <h3>No stock records</h3>
            <p>Validate a receipt to populate stock levels</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Location</th>
                <th style={{ textAlign: 'right' }}>On Hand</th>
                <th style={{ textAlign: 'right' }}>Reserved</th>
                <th style={{ textAlign: 'right' }}>Free to Use</th>
                <th style={{ textAlign: 'right' }}>Unit Cost (Rs)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const status = getStockStatus(s);
                return (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.product?.name || '—'}</td>
                    <td><span className="tag font-mono">{s.product?.sku || '—'}</span></td>
                    <td>{s.location?.name || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>{s.on_hand}</td>
                    <td style={{ textAlign: 'right', color: 'var(--color-warning)' }}>{s.reserved}</td>
                    <td style={{ textAlign: 'right', color: s.free_to_use > 0 ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 600 }}>
                      {s.free_to_use}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {s.per_unit_cost ? `Rs ${parseFloat(s.per_unit_cost).toFixed(2)}` : '—'}
                    </td>
                    <td>
                      <span className={`badge ${status.cls}`}>{status.label}</span>
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
