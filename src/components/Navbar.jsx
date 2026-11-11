import { Bell, Search, Moon, Sun, User, LogOut, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  const isLoggedIn = Boolean(user);

  return (
    <header className="topbar">
      <nav className="nav container">
        <div className="brand-wrap">
          <div className="brand-mark">Q</div>
          <div>
            <span className="brand-name">QuizMaster</span>
          </div>
        </div>

        <div className="nav-links">
          <a href="/" onClick={(event) => { event.preventDefault(); navigate('/'); }}>Home</a>
          <a href="/quizzes" onClick={(event) => { event.preventDefault(); navigate('/quizzes'); }}>Quizzes</a>
          <a href="/categories" onClick={(event) => { event.preventDefault(); navigate('/categories'); }}>Categories</a>
          <a href="/leaderboard" onClick={(event) => { event.preventDefault(); navigate('/leaderboard'); }}>Leaderboard</a>
          <a href="/patient-intake" onClick={(event) => { event.preventDefault(); navigate('/patient-intake'); }}>Patient Intake</a>
          <a href="/auth" onClick={(event) => { event.preventDefault(); navigate('/auth'); }}>How It Works</a>
        </div>

        <div className="nav-actions">
          <form className="search-box" onSubmit={(event) => { event.preventDefault(); onSearchSubmit?.(); }}>
            <Search size={16} />
            <input
              type="search"
              placeholder="Search quizzes"
              value={searchTerm}
              onChange={(event) => onSearchChange?.(event.target.value)}
              aria-label="Search quizzes"
            />
          </form>
          <button className="icon-btn" aria-label="Notifications">
            <Bell size={18} />
            <span className="notif-dot" />
          </button>
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
