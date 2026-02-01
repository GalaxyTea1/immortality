import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

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
  const navigate = useNavigate();
  const { gameState, formatNumber } = useGame();
  const { user, logout } = useAuth();
  const { resources } = gameState;

  const handleLogout = () => {
    if (window.confirm('Bạn có chắc muốn đăng xuất?')) {
      logout();
      navigate('/login');
    }
  };

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
            {/* User info */}
            <div className="user-info">
              <span className="user-name">{user?.username || 'Đạo Hữu'}</span>
            </div>

            <button className="notification-btn">
              <span className="material-symbols-outlined">notifications</span>
              <span className="notification-dot"></span>
            </button>

            {/* User dropdown */}
            <div className="user-dropdown">
              <div className="user-avatar">
                <span className="avatar-text">
                  {user?.username?.charAt(0)?.toUpperCase() || 'T'}
                </span>
              </div>
              <div className="dropdown-menu">
                <div className="dropdown-header">
                  <strong>{user?.username}</strong>
                  <span>{user?.email}</span>
                </div>
                <hr />
                <button onClick={handleLogout} className="dropdown-item logout-btn">
                  <span className="material-symbols-outlined">logout</span>
                  Đăng Xuất
                </button>
              </div>
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
