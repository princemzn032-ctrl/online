import { ArrowRight, Search, Moon, Sun, User, LogOut, Sparkles } from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';

export default function Navbar({
  darkMode,
  toggleTheme,
  user,
  onLogout,
  searchTerm,
  onSearchChange,
  onSearchSubmit,
  onAuthModeChange,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = Boolean(user);

  return (
    <header className="topbar topbar-modern">
      <nav className="nav nav-modern container" aria-label="Main navigation">
        <Link className="brand-wrap nav-brand" to="/" aria-label="QuizMaster home">
          <div className="brand-mark">Q</div>
          <div>
            <span className="brand-name">QuizMaster</span>
          </div>
        </Link>

        <form className="search-box nav-search" onSubmit={(event) => { event.preventDefault(); onSearchSubmit?.(); }}>
          <Search size={16} />
          <input
            type="search"
            placeholder="Search quizzes..."
            value={searchTerm}
            onChange={(event) => onSearchChange?.(event.target.value)}
            aria-label="Search quizzes"
          />
          <span className="search-shortcut" aria-hidden="true"><ArrowRight size={13} /></span>
        </form>

        <div className="nav-links">
          <NavLink to="/" end className={({ isActive }) => (isActive && !location.hash ? 'active' : undefined)}>Home</NavLink>
          <NavLink to="/branches">Branches</NavLink>
          <NavLink to="/quizzes">Practice</NavLink>
          <NavLink to="/mock-tests">Mock Tests</NavLink>
          <NavLink to="/leaderboard">Leaderboard</NavLink>
          <Link to="/#about" className={location.hash === '#about' ? 'active' : undefined}>About</Link>
        </div>

        <div className="nav-actions">
          <button className="icon-btn" aria-label="Toggle theme" onClick={toggleTheme}>
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {isLoggedIn ? (
            <>
              <button className="ghost-btn" onClick={() => navigate('/dashboard')}>
                <Sparkles size={16} />
                Dashboard
              </button>
              {user.role === 'admin' ? (
                <button className="ghost-btn" onClick={() => navigate('/admin')}>
                  Admin
                </button>
              ) : null}
              <button className="profile-pill" onClick={() => navigate('/profile')}>
                {user.avatar_url
                  ? <img className="avatar" src={user.avatar_url} alt="" />
                  : <User size={16} />}
                <span>{user?.name?.split(' ')[0] || 'User'}</span>
              </button>
              <button className="icon-btn" aria-label="Logout" onClick={onLogout}>
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <div className="auth-buttons">
              <button className="ghost-btn" onClick={() => { onAuthModeChange?.('login'); navigate('/auth'); }}>Login</button>
              <button className="primary-btn" onClick={() => { onAuthModeChange?.('register'); navigate('/auth'); }}>Sign Up</button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
