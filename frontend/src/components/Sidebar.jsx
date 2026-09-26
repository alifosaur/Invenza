import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Package, Boxes, ArrowDownToLine,
  ArrowUpFromLine, ArrowLeftRight, ClipboardList,
  History, Settings, Warehouse, LogOut, User,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Products', to: '/products', icon: Package },
  { label: 'Stock', to: '/stock', icon: Boxes },
];

const OPERATIONS_NAV = [
  { label: 'Receipts', to: '/receipts', icon: ArrowDownToLine },
  { label: 'Deliveries', to: '/deliveries', icon: ArrowUpFromLine },
  { label: 'Transfers', to: '/transfers', icon: ArrowLeftRight },
  { label: 'Adjustments', to: '/adjustments', icon: ClipboardList },
  { label: 'Move History', to: '/move-history', icon: History },
];

const SETTINGS_NAV = [
  { label: 'Warehouses', to: '/settings/warehouses', icon: Warehouse },
  { label: 'Locations', to: '/settings/locations', icon: Settings },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-mark">Iz</div>
        <span className="logo-text">Invenza</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} className="nav-icon" />
            {label}
          </NavLink>
        ))}

        <div className="nav-section-label">Operations</div>
        {OPERATIONS_NAV.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} className="nav-icon" />
            {label}
          </NavLink>
        ))}

        <div className="nav-section-label">Settings</div>
        {SETTINGS_NAV.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} className="nav-icon" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer: User info + logout */}
      <div className="sidebar-footer">
        <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <User size={18} className="nav-icon" />
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.login_id}
          </span>
        </NavLink>
        <button className="nav-item" onClick={handleLogout} style={{ color: 'var(--color-error)' }}>
          <LogOut size={18} className="nav-icon" />
          Logout
        </button>
      </div>
    </aside>
  );
}
