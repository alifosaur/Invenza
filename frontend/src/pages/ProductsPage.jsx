import { useState, useEffect, useCallback } from 'react';
import { productApi } from '../api/client';
import { Plus, Search, Pencil, Trash2, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function ProductModal({ product, categories, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    category_id: product?.category?.id || '',
    uom: product?.uom || 'pcs',
    reorder_threshold: product?.reorder_threshold || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      ...form,
      category_id: form.category_id || null,
      reorder_threshold: form.reorder_threshold ? Number(form.reorder_threshold) : null,
    };
    try {
      if (product) {
        await productApi.update(product.id, payload);
        toast.success('Product updated');
      } else {
        await productApi.create(payload);
        toast.success('Product created');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save product');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{product ? 'Edit Product' : 'New Product'}</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label required">Name</label>
                <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Product name" />
              </div>
              <div className="form-group">
                <label className="form-label required">SKU / Code</label>
                <input className="form-input font-mono" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required placeholder="SKU-001" />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                  <option value="">No category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label required">Unit of Measure</label>
                <select className="form-select" value={form.uom} onChange={(e) => setForm({ ...form, uom: e.target.value })}>
                  {['pcs', 'kg', 'g', 'litre', 'ml', 'box', 'carton', 'pack', 'dozen', 'm', 'cm'].map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Reorder Threshold</label>
              <input
                type="number"
                className="form-input"
                value={form.reorder_threshold}
                onChange={(e) => setForm({ ...form, reorder_threshold: e.target.value })}
                placeholder="e.g. 10 — triggers low stock alert"
                min="0"
                step="0.01"
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <div className="spinner" /> : (product ? 'Update Product' : 'Create Product')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const { isManager } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | 'create' | product obj

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        productApi.list({ search: search || undefined }),
        productApi.listCategories(),
      ]);
      setProducts(pRes.data);
      setCategories(cRes.data);
    } catch { toast.error('Failed to load products'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const deleteProduct = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      await productApi.delete(id);
      toast.success('Product deleted');
      load();
    } catch { toast.error('Cannot delete product'); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">{products.length} products in catalogue</p>
        </div>
        {isManager && (
          <button className="btn btn-primary" onClick={() => setModal('create')}>
            <Plus size={16} /> New Product
          </button>
        )}
      </div>

      <div className="toolbar">
        <div className="search-input-wrapper">
          <Search size={16} className="icon" />
          <input
            className="form-input"
            placeholder="Search by name or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: 'auto' }} />
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Package size={32} /></div>
            <h3>No products found</h3>
            <p>Add your first product to start tracking inventory</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>UoM</th>
                <th>Reorder At</th>
                {isManager && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td><span className="tag font-mono">{p.sku}</span></td>
                  <td>{p.category?.name || <span className="text-muted">—</span>}</td>
                  <td>{p.uom}</td>
                  <td>
                    {p.reorder_threshold != null ? (
                      <span style={{ color: 'var(--color-warning)' }}>{p.reorder_threshold}</span>
                    ) : <span className="text-muted">—</span>}
                  </td>
                  {isManager && (
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <button className="btn btn-icon btn-ghost" onClick={() => setModal(p)} data-tooltip="Edit">
                          <Pencil size={15} />
                        </button>
                        <button className="btn btn-icon btn-ghost" onClick={() => deleteProduct(p.id)} data-tooltip="Delete" style={{ color: 'var(--color-error)' }}>
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
        <ProductModal
          product={modal === 'create' ? null : modal}
          categories={categories}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
