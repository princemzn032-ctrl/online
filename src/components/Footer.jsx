import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export default function Footer() {
  const { user } = useAuth();

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <div className="brand-wrap">
            <div className="brand-mark">Q</div>
            <span className="brand-name">QuizMaster</span>
          </div>
          <p className="footer-copy">Engineering learning, built around your syllabus.</p>
        </div>

        <div>
          <h4>Quick Links</h4>
          <ul className="footer-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/branches">Branches</Link></li>
            <li><Link to="/quizzes">Practice</Link></li>
            <li><Link to="/mock-tests">Mock Tests</Link></li>
            <li><Link to="/leaderboard">Leaderboard</Link></li>
            <li><Link to={user ? '/dashboard' : '/auth'}>Dashboard</Link></li>
          </ul>
        </div>

        <div>
          <h4>Support</h4>
          <ul className="footer-links">
            <li><Link to="/branches">Explore subjects</Link></li>
            <li><Link to={user ? '/profile' : '/auth'}>{user ? 'Account settings' : 'Account help'}</Link></li>
          </ul>
        </div>

        <div>
          <h4>Social</h4>
          <p className="footer-copy">Learn. Practice. Perform.</p>
        </div>
      </div>
    </footer>
  );
}
