import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../api/client';
import { ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OperationsDashboardPage() {
  const [stats, setStats] = useState({
    receipts: { to_do: 0 },
    deliveries: { to_do: 0 },
    adjustments: { to_do: 0 },
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await dashboardApi.kpis();
        setStats(data);
      } catch (err) {
        toast.error('Failed to load operation stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Operations</h1>
          <p className="page-subtitle">Manage your warehouse tasks and movements</p>
        </div>
      </div>

      <div style={{ padding: 'var(--space-8)' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="spinner" />
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 'var(--space-6)',
          }}>
            {/* Receipts Card */}
            <div 
              className="card hover-card" 
              style={{ padding: 'var(--space-6)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
              onClick={() => navigate('/receipts')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div style={{ background: 'var(--bg-elevated)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
                    <ArrowDownToLine size={24} color="var(--brand-primary)" />
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Receipts</h3>
                </div>
              </div>
              <div style={{ marginTop: 'var(--space-2)' }}>
                {(stats?.receipts?.to_do > 0 || stats?.pending_receipts > 0) ? (
                  <span className="badge badge-waiting" style={{ fontSize: '0.875rem', padding: '6px 12px' }}>
                    {stats?.receipts?.to_do || stats?.pending_receipts || 0} to receive
                  </span>
                ) : (
                  <span className="text-muted" style={{ fontSize: '0.875rem' }}>No pending receipts</span>
                )}
              </div>
            </div>

            {/* Delivery Card */}
            <div 
              className="card hover-card" 
              style={{ padding: 'var(--space-6)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
              onClick={() => navigate('/deliveries')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div style={{ background: 'var(--bg-elevated)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
                    <ArrowUpFromLine size={24} color="var(--brand-primary)" />
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Delivery</h3>
                </div>
              </div>
              <div style={{ marginTop: 'var(--space-2)' }}>
                {(stats?.deliveries?.to_do > 0 || stats?.pending_deliveries > 0) ? (
                  <span className="badge badge-waiting" style={{ fontSize: '0.875rem', padding: '6px 12px' }}>
                    {stats?.deliveries?.to_do || stats?.pending_deliveries || 0} to deliver
                  </span>
                ) : (
                  <span className="text-muted" style={{ fontSize: '0.875rem' }}>No pending deliveries</span>
                )}
              </div>
            </div>

            {/* Inventory Adjustment Card */}
            <div 
              className="card hover-card" 
              style={{ padding: 'var(--space-6)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
              onClick={() => navigate('/adjustments')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div style={{ background: 'var(--bg-elevated)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
                    <SlidersHorizontal size={24} color="var(--brand-primary)" />
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Inventory Adjustment</h3>
                </div>
              </div>
              <div style={{ marginTop: 'var(--space-2)' }}>
                {(stats?.adjustments?.to_do > 0 || stats?.pending_adjustments > 0) ? (
                  <span className="badge badge-waiting" style={{ fontSize: '0.875rem', padding: '6px 12px' }}>
                    {stats?.adjustments?.to_do || stats?.pending_adjustments || 0} pending
                  </span>
                ) : (
                  <span className="text-muted" style={{ fontSize: '0.875rem' }}>No pending adjustments</span>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
