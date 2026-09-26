import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownToLine, ArrowUpFromLine, Filter, Search
} from 'lucide-react';

export default function DashboardPage() {
  const navigate = useNavigate();
  
  // Dashboard filters state
  const [filters, setFilters] = useState({
    documentType: 'all',
    status: 'all',
    warehouse: 'all',
    category: 'all',
  });

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
            <option value="main">Main Warehouse</option>
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
      <div className="grid-2">
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
              background: 'hsla(231,100%,65%,0.15)', color: 'var(--brand-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <ArrowDownToLine size={20} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Receipts</h2>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1, marginBottom: 'var(--space-2)' }}>
              4
            </div>
            <div style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 'var(--space-6)' }}>
              to receive
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-4)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-error)' }}>1</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Late</div>
            </div>
            <div style={{ width: 1, background: 'var(--border-subtle)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>6</div>
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
              background: 'hsla(168,85%,48%,0.15)', color: 'var(--color-success)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <ArrowUpFromLine size={20} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Deliveries</h2>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1, marginBottom: 'var(--space-2)' }}>
              4
            </div>
            <div style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 'var(--space-6)' }}>
              to Deliver
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-4)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-error)' }}>1</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Late</div>
            </div>
            <div style={{ width: 1, background: 'var(--border-subtle)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-warning)' }}>2</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>waiting</div>
            </div>
            <div style={{ width: 1, background: 'var(--border-subtle)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>6</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>operations</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
