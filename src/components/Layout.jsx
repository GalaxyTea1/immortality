import { Outlet, Link, useLocation } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import './Layout.css';
import logo from '../assets/logo.png';

const navItems = [
  { path: '/', label: 'Trang Chủ', icon: 'home' },
  { path: '/cultivation', label: 'Tu Luyện', icon: 'self_improvement' },
  { path: '/world', label: 'Thế Giới', icon: 'public' },
  { path: '/inventory', label: 'Kho Đồ', icon: 'backpack' },
  { path: '/shop', label: 'Cửa Hàng', icon: 'storefront' },
  { path: '/leaderboard', label: 'Bảng Xếp Hạng', icon: 'leaderboard' },
];

function Layout() {
  const location = useLocation();
  const { gameState, formatNumber } = useGame();
  const { resources } = gameState;

  return (
    <div className="app-container">
      {/* Header */}
      <header className="main-header">
        <div className="header-content">
          <nav className="main-nav">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
              >
                <span className="material-symbols-outlined nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="header-actions">
            <button className="notification-btn">
              <span className="material-symbols-outlined">notifications</span>
              <span className="notification-dot"></span>
            </button>

            <div className="user-avatar">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAM99U2yz_DBRPHbMVcTOt9kHwXgcQDwdvAT-YDmSHJDrBhO9UY05GLJSU04x3qh-UyWPMBLMaSUvHcmpn0kfzrcMUJ3XsvohSiIphDKK0hzG41PRHJkE3S3yt1yl5DYaBiXWhMs0z-NHqDuP95jRp49W00avrpaicxgcW3ChqTxs186hk-_rtbaEG4WHhvfMHp7_zfEcwtgXMG8JbiKs-Fnt3nSdJrxdiyP6p86FWYIzZyuIkpd8aVo8-wHXFs2ACdODWr5uNsKrg"
                alt="Avatar"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Mobile Navigation */}
      <nav className="mobile-nav">
        {navItems.slice(0, 5).map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`mobile-nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="mobile-nav-label">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export default Layout;
