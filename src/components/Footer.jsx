import { Globe, MessageCircle, Send, Sparkles } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <div className="brand-wrap">
            <div className="brand-mark">Q</div>
            <span className="brand-name">QuizMaster</span>
          </div>
          <p className="footer-copy">Learn. Practice. Compete. Improve.</p>
        </div>

        <div>
          <h4>Quick Links</h4>
          <ul className="footer-links">
            <li>Home</li>
            <li>Quizzes</li>
            <li>Categories</li>
            <li>Leaderboard</li>
            <li>About</li>
            <li>Contact</li>
          </ul>
        </div>

        <div>
          <h4>Support</h4>
          <ul className="footer-links">
            <li>Help Center</li>
            <li>FAQ</li>
            <li>Privacy Policy</li>
            <li>Terms & Conditions</li>
          </ul>
        </div>

        <div>
          <h4>Social</h4>
          <div className="social-row">
            <button className="social-btn" aria-label="Website"><Globe size={16} /></button>
            <button className="social-btn" aria-label="Community"><MessageCircle size={16} /></button>
            <button className="social-btn" aria-label="Follow"><Send size={16} /></button>
            <button className="social-btn" aria-label="Updates"><Sparkles size={16} /></button>
          </div>
        </div>
      </div>
    </footer>
  );
}
