import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { warehouseApi } from '../../api/client';
import { Building2, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [stats, setStats] = useState({ warehouses: 0, locations: 0 });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [whRes, locRes] = await Promise.all([
          warehouseApi.list(),
          warehouseApi.listLocations()
        ]);
        setStats({
          warehouses: whRes.data.length || 0,
          locations: locRes.data.length || 0,
        });
      } catch (err) {
        console.error('Failed to load settings stats', err);
        // Fallback to 0 if api fails
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
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage system configuration and master data</p>
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
            {/* Warehouse Card */}
            <div 
              className="card hover-card" 
              style={{ padding: 'var(--space-6)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
              onClick={() => navigate('/settings/warehouses')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div style={{ background: 'var(--bg-elevated)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
                  <Building2 size={24} color="var(--brand-primary)" />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Warehouse</h3>
              </div>
              <div style={{ marginTop: 'var(--space-2)' }}>
                <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                  {stats.warehouses} {stats.warehouses === 1 ? 'warehouse' : 'warehouses'}
                </span>
              </div>
            </div>

            {/* Locations Card */}
            <div 
              className="card hover-card" 
              style={{ padding: 'var(--space-6)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
              onClick={() => navigate('/settings/locations')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div style={{ background: 'var(--bg-elevated)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
                  <MapPin size={24} color="var(--brand-primary)" />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Locations</h3>
              </div>
              <div style={{ marginTop: 'var(--space-2)' }}>
                <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                  {stats.locations} {stats.locations === 1 ? 'location' : 'locations'}
                </span>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
