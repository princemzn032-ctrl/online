import { Bell, Search, Moon, Sun, User, LogOut, Sparkles } from 'lucide-react';

export default function Navbar({ darkMode, toggleTheme, user, onLogout }) {
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
          <a href="/">Home</a>
          <a href="/quizzes">Quizzes</a>
          <a href="/categories">Categories</a>
          <a href="/leaderboard">Leaderboard</a>
          <a href="/auth">How It Works</a>
        </div>

        <div className="nav-actions">
          <div className="search-box">
            <Search size={16} />
            <input type="text" placeholder="Search quizzes" />
          </div>
          <button className="icon-btn" aria-label="Notifications">
            <Bell size={18} />
            <span className="notif-dot" />
          </button>
          <button className="icon-btn" aria-label="Toggle theme" onClick={toggleTheme}>
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {isLoggedIn ? (
            <>
              <button className="ghost-btn" onClick={() => window.location.href = '/dashboard'}>
                <Sparkles size={16} />
                Dashboard
              </button>
              <div className="profile-pill">
                <User size={16} />
                <span>{user?.name?.split(' ')[0] || 'User'}</span>
              </div>
              <button className="icon-btn" aria-label="Logout" onClick={onLogout}>
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <div className="auth-buttons">
              <button className="ghost-btn" onClick={() => window.location.href = '/auth'}>Login</button>
              <button className="primary-btn" onClick={() => window.location.href = '/auth'}>Sign Up</button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
