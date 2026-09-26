import { useState, useEffect, useCallback } from 'react';
import { stockApi, warehouseApi } from '../api/client';
import { Search, Boxes, Edit2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StockPage() {
  const [stocks, setStocks] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  
  const [sortField, setSortField] = useState('product.name');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ on_hand: '', per_unit_cost: '' });

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

  const handleEditClick = (stock) => {
    setEditingId(stock.id);
    setEditForm({
      on_hand: stock.on_hand,
      per_unit_cost: stock.per_unit_cost,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async (id) => {
    try {
      await stockApi.update(id, {
        on_hand: Number(editForm.on_hand),
        per_unit_cost: Number(editForm.per_unit_cost)
      });
      toast.success('Stock updated successfully');
      setEditingId(null);
      load();
    } catch (err) {
      toast.error('Failed to update stock');
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filtered = stocks.filter((s) => {
    const q = search.toLowerCase();
    return !q || s.product?.name?.toLowerCase().includes(q) || s.product?.sku?.toLowerCase().includes(q);
  });

  const sortedStocks = [...filtered].sort((a, b) => {
    let valA = a;
    let valB = b;

    const keys = sortField.split('.');
    for (const key of keys) {
      valA = valA ? valA[key] : '';
      valB = valB ? valB[key] : '';
    }

    if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

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
        ) : sortedStocks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Boxes size={32} /></div>
            <h3>No stock records</h3>
            <p>Validate a receipt to populate stock levels</p>
          </div>
        ) : (
          <table className="dense-table" style={{ fontSize: '0.9rem' }}>
            <thead>
              <tr>
                <th onClick={() => handleSort('product.name')} style={{ cursor: 'pointer' }}>
                  Product {sortField === 'product.name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('location.name')} style={{ cursor: 'pointer' }}>
                  Location {sortField === 'location.name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('per_unit_cost')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                  Per Unit Cost {sortField === 'per_unit_cost' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('on_hand')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                  On Hand {sortField === 'on_hand' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('free_to_use')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                  Free to Use {sortField === 'free_to_use' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{ textAlign: 'center', width: '80px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedStocks.map((s) => {
                const isEditing = editingId === s.id;
                
                return (
                  <tr key={s.id} className={isEditing ? 'editing-row' : ''}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{s.product?.name || '—'}</div>
                      <div className="text-muted font-mono" style={{ fontSize: '0.75rem' }}>{s.product?.sku}</div>
                    </td>
                    <td>{s.location?.name || '—'}</td>
                    
                    <td style={{ textAlign: 'right' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                          <span className="text-muted">Rs</span>
                          <input 
                            type="number" 
                            className="form-input form-input-sm" 
                            style={{ width: '80px', padding: '4px 8px', fontSize: '0.9rem' }}
                            value={editForm.per_unit_cost}
                            onChange={(e) => setEditForm({...editForm, per_unit_cost: e.target.value})}
                            step="0.01"
                            min="0"
                          />
                        </div>
                      ) : (
                        <span>{s.per_unit_cost ? `Rs ${parseFloat(s.per_unit_cost).toFixed(2)}` : '—'}</span>
                      )}
                    </td>
                    
                    <td style={{ textAlign: 'right' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                          <input 
                            type="number" 
                            className="form-input form-input-sm" 
                            style={{ width: '80px', padding: '4px 8px', fontSize: '0.9rem' }}
                            value={editForm.on_hand}
                            onChange={(e) => setEditForm({...editForm, on_hand: e.target.value})}
                            step="0.01"
                          />
                          <span className="text-muted" style={{ fontSize: '0.75rem' }}>{s.product?.uom}</span>
                        </div>
                      ) : (
                        <span style={{ fontWeight: 600 }}>{s.on_hand} <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 400 }}>{s.product?.uom}</span></span>
                      )}
                    </td>
                    
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 600, color: s.free_to_use > 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
                        {s.free_to_use} <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 400 }}>{s.product?.uom}</span>
                      </span>
                    </td>
                    
                    <td style={{ textAlign: 'center' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button className="btn btn-icon btn-ghost" onClick={() => handleSaveEdit(s.id)} style={{ color: 'var(--color-success)', padding: '4px' }}>
                            <Check size={16} />
                          </button>
                          <button className="btn btn-icon btn-ghost" onClick={handleCancelEdit} style={{ color: 'var(--color-error)', padding: '4px' }}>
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button className="btn btn-icon btn-ghost" onClick={() => handleEditClick(s)} data-tooltip="Edit Stock">
                          <Edit2 size={15} />
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
