import { useState, useEffect, useCallback, useRef } from 'react';
import { productApi, warehouseApi } from '../api/client';
import { Plus, Search, Pencil, Trash2, Package, Download, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import imageCompression from 'browser-image-compression';

// Since we need location for initial stock
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function ProductModal({ product, categories, locations, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    category_id: product?.category?.id || '',
    new_category_name: '',
    uom: product?.uom || 'pcs',
    reorder_threshold: product?.reorder_threshold || '',
    initial_stock: '',
    initial_location_id: locations.length > 0 ? locations[0].id : '',
    image_data: product?.image_data || '',
  });
  const [loading, setLoading] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const options = {
        maxSizeMB: 0.1, // 100KB max
        maxWidthOrHeight: 800,
        useWebWorker: true,
      };
      
      const compressedFile = await imageCompression(file, options);
      
      // Convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, image_data: reader.result }));
      };
    } catch (err) {
      toast.error('Failed to compress image');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let finalCategoryId = form.category_id;
      
      // Handle creating new category if selected
      if (isCreatingCategory && form.new_category_name) {
        try {
          const res = await productApi.createCategory({ name: form.new_category_name });
          finalCategoryId = res.data.id;
        } catch (err) {
          toast.error("Failed to create category");
          setLoading(false);
          return;
        }
      }

      const payload = {
        name: form.name,
        sku: form.sku,
        category_id: finalCategoryId || null,
        uom: form.uom,
        reorder_threshold: form.reorder_threshold ? Number(form.reorder_threshold) : null,
        image_data: form.image_data || null,
      };

      if (!product && form.initial_stock) {
        payload.initial_stock = Number(form.initial_stock);
        payload.initial_location_id = form.initial_location_id || null;
      }

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
            <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-4)', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: 100, height: 100, borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border-default)', 
                  overflow: 'hidden', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', background: 'var(--bg-elevated)',
                  flexShrink: 0
                }}>
                  {form.image_data ? (
                    <img src={form.image_data} alt="Product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Package size={32} color="var(--text-disabled)" />
                  )}
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handleImageUpload} 
                />
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>
                  Upload Photo
                </button>
              </div>
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
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
                {!isCreatingCategory ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select className="form-select" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                      <option value="">No category</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button type="button" className="btn btn-secondary" onClick={() => setIsCreatingCategory(true)}>New</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input className="form-input" value={form.new_category_name} onChange={(e) => setForm({ ...form, new_category_name: e.target.value })} placeholder="New category name" required />
                    <button type="button" className="btn btn-secondary" onClick={() => setIsCreatingCategory(false)}>✕</button>
                  </div>
                )}
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
            
            {!product && (
              <div className="grid-2" style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)' }}>
                <div className="form-group">
                  <label className="form-label">Initial Stock (Optional)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.initial_stock}
                    onChange={(e) => setForm({ ...form, initial_stock: e.target.value })}
                    placeholder="0.0"
                    min="0"
                    step="0.01"
                  />
                </div>
                {form.initial_stock && (
                  <div className="form-group">
                    <label className="form-label required">Location</label>
                    <select className="form-select" value={form.initial_location_id} onChange={(e) => setForm({ ...form, initial_location_id: e.target.value })} required>
                      {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}
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
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | 'create' | product obj
  const fileInputRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        productApi.list({ search: search || undefined }),
        productApi.listCategories(),
      ]);
      setProducts(pRes.data);
      setCategories(cRes.data);
      
      // Also load locations for initial stock
      const locRes = await warehouseApi.listLocations();
      setLocations(locRes.data);
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

  

  
  const handleExport = async () => {
    try {
      const res = await productApi.exportExcel({ search: search || undefined });
      const url = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `warehouse_inventory_${date}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      toast.error('Failed to export inventory');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await productApi.downloadTemplate();
      const url = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invenza_inventory_template.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      toast.error('Failed to download template');
    }
  };

  const [importPreview, setImportPreview] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [updateExisting, setUpdateExisting] = useState(true);

  const handleImportSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFile(file);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('confirm', false);
    
    setLoading(true);
    try {
      const res = await productApi.importExcel(formData);
      setImportPreview(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to parse Excel file');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setLoading(false);
    }
  };

  const handleImportConfirm = async () => {
    if (!importFile) return;
    const formData = new FormData();
    formData.append('file', importFile);
    formData.append('confirm', true);
    formData.append('update_existing', updateExisting);
    
    setLoading(true);
    try {
      const res = await productApi.importExcel(formData);
      toast.success(res.data.detail || 'Import successful');
      setImportPreview(null);
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to complete import');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">{products.length} products in catalogue</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="btn btn-secondary" onClick={handleDownloadTemplate} title="Download Template">
            Template
          </button>
          <button className="btn btn-secondary" onClick={handleExport} title="Export to Excel">
            <Download size={16} /> Export
          </button>
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            style={{ display: 'none' }} 
            ref={fileInputRef} 
            onChange={handleImportSelect} 
          />
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} title="Import from Excel">
            <Upload size={16} /> Import
          </button>
          <button className="btn btn-primary" onClick={() => setModal('create')}>
            <Plus size={16} /> New Product
          </button>
        </div>
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
                <th style={{ width: 50 }}></th>
                <th>Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>UoM</th>
                <th style={{ textAlign: 'right' }}>Current Stock</th>
                <th>Reorder At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-subtle)' }}>
                      {p.image_data ? (
                        <img src={p.image_data} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Package size={16} color="var(--text-disabled)" />
                      )}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td><span className="tag font-mono">{p.sku}</span></td>
                  <td>{p.category?.name || <span className="text-muted">—</span>}</td>
                  <td>{p.uom}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {p.current_stock}
                  </td>
                  <td>
                    {p.reorder_threshold != null ? (
                      <span style={{ color: 'var(--color-warning)' }}>{p.reorder_threshold}</span>
                    ) : <span className="text-muted">—</span>}
                  </td>
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
          locations={locations}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}

      {importPreview && (
        <div className="modal-overlay" onClick={() => { setImportPreview(null); setImportFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 800 }}>
            <div className="modal-header">
              <h3>Import Preview</h3>
              <button className="btn btn-icon btn-ghost" onClick={() => { setImportPreview(null); setImportFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                <div style={{ padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', flex: 1, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: '1.25rem' }}>✓ {importPreview.valid_count}</div>
                  <div className="text-muted" style={{ fontSize: '0.875rem' }}>Valid</div>
                </div>
                <div style={{ padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', flex: 1, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ color: 'var(--color-warning)', fontWeight: 600, fontSize: '1.25rem' }}>⚠ {importPreview.warning_count}</div>
                  <div className="text-muted" style={{ fontSize: '0.875rem' }}>Warnings</div>
                </div>
                <div style={{ padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', flex: 1, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ color: 'var(--color-error)', fontWeight: 600, fontSize: '1.25rem' }}>✕ {importPreview.error_count}</div>
                  <div className="text-muted" style={{ fontSize: '0.875rem' }}>Errors</div>
                </div>
              </div>

              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 500 }}>
                  <input type="checkbox" checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)} />
                  Update existing products if SKU matches
                </label>
              </div>

              <div style={{ maxHeight: '40vh', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                <table style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 40, position: 'sticky', top: 0, background: 'var(--bg-card)' }}>Row</th>
                      <th style={{ position: 'sticky', top: 0, background: 'var(--bg-card)' }}>SKU</th>
                      <th style={{ position: 'sticky', top: 0, background: 'var(--bg-card)' }}>Name</th>
                      <th style={{ position: 'sticky', top: 0, background: 'var(--bg-card)' }}>Status</th>
                      <th style={{ position: 'sticky', top: 0, background: 'var(--bg-card)' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.rows.slice(0, 100).map((r, i) => (
                      <tr key={i} style={{ background: r.status === 'Error' ? 'rgba(255,0,0,0.05)' : r.status === 'Warning' ? 'rgba(255,165,0,0.05)' : 'transparent' }}>
                        <td className="text-muted">{r.row_num}</td>
                        <td className="font-mono">{r.sku}</td>
                        <td>{r.name}</td>
                        <td style={{ 
                          color: r.status === 'Error' ? 'var(--color-error)' : r.status === 'Warning' ? 'var(--color-warning)' : 'var(--color-success)',
                          fontWeight: 500
                        }}>{r.status}</td>
                        <td className="text-muted" style={{ fontSize: '0.875rem' }}>{r.issues.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {importPreview.rows.length > 100 && (
                <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '8px', textAlign: 'center' }}>
                  Showing first 100 rows
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setImportPreview(null); setImportFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleImportConfirm} disabled={loading || importPreview.error_count > 0}>
                {loading ? <div className="spinner"/> : 'Import Products'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
