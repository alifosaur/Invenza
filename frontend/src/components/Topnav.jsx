import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ChevronDown, User, LogOut
} from 'lucide-react';

const OPERATIONS_NAV = [
  { label: 'Receipts', to: '/receipts' },
  { label: 'Deliveries', to: '/deliveries' },
  { label: 'Transfers', to: '/transfers' },
  { label: 'Adjustments', to: '/adjustments' },
];

const SETTINGS_NAV = [
  { label: 'Warehouses', to: '/settings/warehouses' },
  { label: 'Locations', to: '/settings/locations' },
];

function Dropdown({ label, items, isActive }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="nav-dropdown" ref={ref} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <div className={`nav-item ${isActive ? 'active' : ''}`} onClick={() => setOpen(!open)} style={{ cursor: 'pointer' }}>
        {label} <ChevronDown size={14} style={{ marginLeft: 4 }} />
      </div>
      {open && (
        <div className="nav-dropdown-menu">
          {items.map(({ label, to }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-dropdown-item ${isActive ? 'active' : ''}`}
              onClick={() => setOpen(false)}
            >
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Topnav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isOpActive = window.location.pathname.startsWith('/receipts') || 
                     window.location.pathname.startsWith('/deliveries') ||
                     window.location.pathname.startsWith('/transfers') ||
                     window.location.pathname.startsWith('/adjustments');
                     
  const isSettingsActive = window.location.pathname.startsWith('/settings');

  return (
    <header className="topnav">
      <div className="topnav-content">
        <div className="topnav-left">
          <div className="topnav-logo">
            <div className="logo-mark">Iz</div>
            <span className="logo-text">Invenza</span>
          </div>

          <nav className="topnav-nav">
            <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              Dashboard
            </NavLink>
            <NavLink to="/operations" className={({ isActive }) => `nav-item ${(isActive || isOpActive) ? 'active' : ''}`}>
              Operations
            </NavLink>
            <NavLink to="/products" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              Products
            </NavLink>
            <NavLink to="/stock" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              Stock
            </NavLink>
            <NavLink to="/move-history" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              Move History
            </NavLink>
            <Dropdown label="Settings" items={SETTINGS_NAV} isActive={isSettingsActive} />
          </nav>
        </div>

        <div className="topnav-right">
          <div className="nav-dropdown" ref={profileRef}>
            <div
              className="user-avatar"
              onClick={() => setProfileOpen(!profileOpen)}
              title={user?.login_id}
            >
              {user?.login_id?.[0]?.toUpperCase()}
            </div>
            
            {profileOpen && (
              <div className="nav-dropdown-menu right-aligned">
                <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', marginBottom: 4 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{user?.login_id}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.role === 'inventory_manager' ? 'Inventory Manager' : 'Warehouse Staff'}</div>
                </div>
                <NavLink to="/profile" className="nav-dropdown-item" onClick={() => setProfileOpen(false)}>
                  <User size={14} style={{ marginRight: 8 }} /> Profile
                </NavLink>
                <button className="nav-dropdown-item text-error" onClick={handleLogout} style={{ width: '100%', textAlign: 'left' }}>
                  <LogOut size={14} style={{ marginRight: 8 }} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
