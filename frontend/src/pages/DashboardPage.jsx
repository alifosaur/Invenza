import { useState, useEffect, useRef } from 'react';
import { dashboardApi } from '../api/client';
import {
  Package, AlertTriangle, ShoppingCart, Truck,
  ArrowLeftRight, Clock, TrendingUp, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

const WS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000')
  .replace('http', 'ws') + '/ws/dashboard';

const KPI_CARDS = [
  { key: 'total_products', label: 'Total Products', icon: Package, color: 'hsl(231,100%,65%)' },
  { key: 'low_stock_count', label: 'Low Stock', icon: AlertTriangle, color: 'hsl(38,95%,55%)' },
  { key: 'out_of_stock_count', label: 'Out of Stock', icon: AlertTriangle, color: 'hsl(0,80%,60%)' },
  { key: 'pending_receipts', label: 'Pending Receipts', icon: ShoppingCart, color: 'hsl(168,85%,48%)' },
  { key: 'pending_deliveries', label: 'Pending Deliveries', icon: Truck, color: 'hsl(271,90%,65%)' },
  { key: 'scheduled_transfers', label: 'Scheduled Transfers', icon: ArrowLeftRight, color: 'hsl(211,95%,60%)' },
  { key: 'late_receipts', label: 'Late Receipts', icon: Clock, color: 'hsl(0,80%,60%)' },
  { key: 'late_deliveries', label: 'Late Deliveries', icon: Clock, color: 'hsl(0,80%,60%)' },
];

function KPICard({ label, value, icon: Icon, color, loading }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon" style={{ background: `${color}18` }}>
        <Icon size={20} color={color} />
      </div>
      {loading ? (
        <div className="skeleton" style={{ height: 40, width: 80, marginBottom: 8, borderRadius: 8 }} />
      ) : (
        <div className="kpi-value">{value ?? '—'}</div>
      )}
      <div className="kpi-label">{label}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef(null);

  const fetchKpis = async () => {
    try {
      const { data } = await dashboardApi.kpis();
      setKpis(data);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKpis();

    // WebSocket for live updates
    const connect = () => {
      try {
        wsRef.current = new WebSocket(WS_URL);
        wsRef.current.onmessage = (e) => {
          const msg = JSON.parse(e.data);
          if (msg.event === 'operation_validated') fetchKpis();
        };
        wsRef.current.onclose = () => {
          // Reconnect after 3s
          setTimeout(connect, 3000);
        };
      } catch { /* WS not available in dev without backend */ }
    };
    connect();
    return () => wsRef.current?.close();
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Real-time inventory overview</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--color-success)',
            animation: 'pulse-glow 2s infinite',
          }} />
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Live</span>
          <button className="btn btn-secondary btn-sm" onClick={fetchKpis}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid" style={{ marginBottom: 'var(--space-8)' }}>
        {KPI_CARDS.map(({ key, label, icon, color }) => (
          <KPICard
            key={key}
            label={label}
            value={kpis?.[key]}
            icon={icon}
            color={color}
            loading={loading}
          />
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid-2" style={{ gap: 'var(--space-4)' }}>
        <SummaryCard
          title="Receipts Overview"
          icon={ShoppingCart}
          color="hsl(168,85%,48%)"
          items={[
            { label: 'To Receive', value: kpis?.pending_receipts ?? '—' },
            { label: 'Late', value: kpis?.late_receipts ?? '—', warn: (kpis?.late_receipts || 0) > 0 },
          ]}
          loading={loading}
        />
        <SummaryCard
          title="Deliveries Overview"
          icon={Truck}
          color="hsl(271,90%,65%)"
          items={[
            { label: 'To Deliver', value: kpis?.pending_deliveries ?? '—' },
            { label: 'Late', value: kpis?.late_deliveries ?? '—', warn: (kpis?.late_deliveries || 0) > 0 },
          ]}
          loading={loading}
        />
      </div>
    </div>
  );
}

function SummaryCard({ title, icon: Icon, color, items, loading }) {
  return (
    <div className="card" style={{ background: 'var(--bg-card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
        <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={color} />
        </div>
        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{title}</h3>
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
        {items.map(({ label, value, warn }) => (
          <div key={label}>
            {loading ? (
              <div className="skeleton" style={{ height: 30, width: 50, marginBottom: 6, borderRadius: 6 }} />
            ) : (
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: warn ? 'var(--color-error)' : 'var(--text-primary)', lineHeight: 1 }}>
                {value}
              </div>
            )}
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
