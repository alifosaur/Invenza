import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../api/client';
import {
  ArrowDownToLine, ArrowUpFromLine, ArrowRightLeft,
  Filter, Package, AlertTriangle
} from 'lucide-react';

export default function DashboardPage() {
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    documentType: 'all',
    status: 'all',
    warehouse: 'all',
    category: 'all',
  });

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data } = await dashboardApi.kpis();
        setStats(data);
      } catch (err) {
        console.error("Failed to fetch dashboard stats", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  // Adapt to whichever backend format we get (nested or flat)
  const getVal = (nestedPath, flatKey, fallback = 0) => {
    if (!stats) return fallback;
    // Try nested first (e.g. stats.receipts.to_do)
    const parts = nestedPath.split('.');
    let val = stats;
    for (const p of parts) {
      if (val && typeof val === 'object' && p in val) val = val[p];
      else { val = undefined; break; }
    }
    if (val !== undefined) return val;
    // Fallback to flat key
    if (flatKey in stats) return stats[flatKey];
    return fallback;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of your inventory operations</p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.875rem' }}>
            <Filter size={16} /> Filters
          </div>

          <select
            className="form-select"
            style={{ width: 'auto', minWidth: 160 }}
            value={filters.documentType}
            onChange={(e) => setFilters({ ...filters, documentType: e.target.value })}
          >
            <option value="all">All Document Types</option>
            <option value="receipt">Receipts</option>
            <option value="delivery">Deliveries</option>
            <option value="internal">Internal Transfers</option>
            <option value="adjustment">Adjustments</option>
          </select>

          <select
            className="form-select"
            style={{ width: 'auto', minWidth: 160 }}
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="waiting">Waiting</option>
            <option value="ready">Ready</option>
            <option value="done">Done</option>
            <option value="canceled">Canceled</option>
          </select>

          <select
            className="form-select"
            style={{ width: 'auto', minWidth: 160 }}
            value={filters.warehouse}
            onChange={(e) => setFilters({ ...filters, warehouse: e.target.value })}
          >
            <option value="all">All Warehouses / Locations</option>
          </select>

          <select
            className="form-select"
            style={{ width: 'auto', minWidth: 160 }}
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          >
            <option value="all">All Product Categories</option>
          </select>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          {/* Top KPIs */}
          <div className="grid-2" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
              <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-full)', background: 'hsla(168,85%,48%,0.1)', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Package size={24} />
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}>
                  {getVal('total_products_in_stock', 'total_products')}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontWeight: 500, marginTop: '4px' }}>Total Products in Stock</div>
              </div>
            </div>

            <div
              className="card"
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-4)', cursor: 'pointer' }}
              onClick={() => navigate('/products')}
            >
              <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-full)', background: 'hsla(3,100%,61%,0.1)', color: 'var(--color-error)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1, color: getVal('low_stock_items', 'low_stock_count') > 0 ? 'var(--color-error)' : 'inherit' }}>
                  {getVal('low_stock_items', 'low_stock_count')}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontWeight: 500, marginTop: '4px' }}>Low / Out of Stock Items</div>
              </div>
            </div>
          </div>

          {/* Operation Cards */}
          <div className="grid-3">
            {/* Receipt Card */}
            <div
              className="card"
              style={{ cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column' }}
              onClick={() => navigate('/receipts')}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-md)',
                  background: 'hsla(168,85%,48%,0.15)', color: 'var(--brand-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <ArrowDownToLine size={20} />
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Receipts</h2>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1, marginBottom: 'var(--space-2)' }}>
                  {getVal('receipts.to_do', 'pending_receipts')}
                </div>
                <div style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 'var(--space-6)' }}>
                  to receive
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-4)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: getVal('receipts.late', 'late_receipts') > 0 ? 'var(--color-error)' : 'var(--text-primary)' }}>
                    {getVal('receipts.late', 'late_receipts')}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Late</div>
                </div>
                <div style={{ width: 1, background: 'var(--border-subtle)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                    {getVal('receipts.total_operations', 'pending_receipts')}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>operations</div>
                </div>
              </div>
            </div>

            {/* Delivery Card */}
            <div
              className="card"
              style={{ cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column' }}
              onClick={() => navigate('/deliveries')}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-md)',
                  background: 'hsla(152,70%,48%,0.15)', color: 'var(--color-success)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <ArrowUpFromLine size={20} />
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Deliveries</h2>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1, marginBottom: 'var(--space-2)' }}>
                  {getVal('deliveries.to_do', 'pending_deliveries')}
                </div>
                <div style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 'var(--space-6)' }}>
                  to deliver
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-4)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: getVal('deliveries.late', 'late_deliveries') > 0 ? 'var(--color-error)' : 'var(--text-primary)' }}>
                    {getVal('deliveries.late', 'late_deliveries')}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Late</div>
                </div>
                <div style={{ width: 1, background: 'var(--border-subtle)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                    {getVal('deliveries.total_operations', 'pending_deliveries')}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>operations</div>
                </div>
              </div>
            </div>

            {/* Transfer Card */}
            <div
              className="card"
              style={{ cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column' }}
              onClick={() => navigate('/transfers')}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-md)',
                  background: 'hsla(45,100%,51%,0.15)', color: 'var(--color-warning)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <ArrowRightLeft size={20} />
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Internal Transfers</h2>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1, marginBottom: 'var(--space-2)' }}>
                  {getVal('transfers.to_do', 'scheduled_transfers')}
                </div>
                <div style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 'var(--space-6)' }}>
                  scheduled
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-4)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                    {getVal('transfers.total_operations', 'scheduled_transfers')}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>operations</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
