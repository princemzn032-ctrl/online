import './App.css';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  MessageCircle,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import {
  categories,
  sampleQuizzes,
  leaderboardData,
  recentActivity,
  adminUsers,
  userProfile,
  analyticsData,
} from './data';

const badgeColors = ['#fbbf24', '#f97316', '#8b5cf6', '#10b981', '#60a5fa'];

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('quiz-theme');
    return savedTheme ? savedTheme === 'dark' : true;
  });
  const [selectedCategory, setSelectedCategory] = useState('Computer Science');
  const [currentQuiz, setCurrentQuiz] = useState(sampleQuizzes[0]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(sampleQuizzes[0].timeLimit * 60);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('quiz-user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [authMode, setAuthMode] = useState('login');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [adminQuestionForm, setAdminQuestionForm] = useState({
    question: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: '',
  });
  const [adminQuestionMessage, setAdminQuestionMessage] = useState('');
  const [chatOpen, setChatOpen] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Hi! I am your QuizMaster AI guide. I can explain the platform, show how quizzes work, and help you get started in seconds.',
    },
    {
      id: 2,
      sender: 'bot',
      text: 'Try asking: “What is this website?”, “How do I start a quiz?”, or “What can I do on my dashboard?”',
    },
  ]);

  useEffect(() => {
    document.body.dataset.theme = darkMode ? 'dark' : 'light';
    localStorage.setItem('quiz-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('quiz-user', JSON.stringify(user));
    } else {
      localStorage.removeItem('quiz-user');
    }
  }, [user]);

  useEffect(() => {
    if (submitted) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [submitted, currentQuiz.id]);

  const totalQuestions = currentQuiz.questions?.length || 0;
  const question = currentQuiz.questions?.[activeQuestionIndex];

  const score = useMemo(() => {
    if (!currentQuiz.questions) return 0;
    return currentQuiz.questions.reduce((total, item) => {
      const selected = answers[item.id];
      if (selected === item.correctAnswer) return total + 1;
      return total;
    }, 0);
  }, [answers, currentQuiz.questions]);

  const handleAddQuestion = (event) => {
    event.preventDefault();
    setAdminQuestionMessage('');

    const { question, optionA, optionB, optionC, optionD, correctAnswer } = adminQuestionForm;
    const fields = [question, optionA, optionB, optionC, optionD, correctAnswer];

    if (fields.some((field) => !field.trim())) {
      setAdminQuestionMessage('Please fill in all question fields.');
      return;
    }

    const options = [optionA.trim(), optionB.trim(), optionC.trim(), optionD.trim()];
    const normalizedCorrect = correctAnswer.trim();

    if (!options.includes(normalizedCorrect)) {
      setAdminQuestionMessage('Correct answer must match one of the provided options.');
      return;
    }

    const newQuestion = {
      id: Date.now(),
      question: question.trim(),
      options,
      correctAnswer: normalizedCorrect,
      explanation: 'Added from admin panel',
      marks: 1,
    };

    setCurrentQuiz((prev) => ({
      ...prev,
      questions: [...(prev?.questions || []), newQuestion],
      totalMarks: (prev?.totalMarks || 0) + 1,
    }));

    setAdminQuestionForm({
      question: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctAnswer: '',
    });
    setAdminQuestionMessage('Question added successfully.');
  };

  const handleStartQuiz = (quiz) => {
    setQuizLoading(true);
    setCurrentQuiz(quiz);
    setTimeLeft(quiz.timeLimit * 60);
    setAnswers({});
    setSubmitted(false);
    setActiveQuestionIndex(0);
    window.location.assign('/quiz');
  };

  const handleSubmitQuiz = () => {
    setSubmitted(true);
  };

  const handleLoginSubmit = (event) => {
    event.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!loginForm.email || !loginForm.password) {
      setAuthError('Email and password are required.');
      return;
    }

    const normalizedEmail = loginForm.email.trim();
    if (!normalizedEmail.includes('@')) {
      setAuthError('Please enter a valid email address.');
      return;
    }

    const mockUser = {
      id: 'user-1',
      name: 'Ava Johnson',
      email: normalizedEmail,
      role: 'user',
    };

    setUser(mockUser);
    setAuthSuccess('Login successful. Redirecting to dashboard...');
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 500);
  };

  const handleRegisterSubmit = (event) => {
    event.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!registerForm.name || !registerForm.email || !registerForm.password || !registerForm.confirmPassword) {
      setAuthError('Please fill in all fields.');
      return;
    }

    if (registerForm.password.length < 6) {
      setAuthError('Password must be at least 6 characters long.');
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }

    const mockUser = {
      id: 'new-user',
      name: registerForm.name.trim(),
      email: registerForm.email.trim(),
      role: 'user',
    };

    setUser(mockUser);
    setAuthSuccess('Account created successfully. You are now logged in.');
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 500);
  };

  const handleLogout = () => {
    setUser(null);
    window.location.href = '/';
  };

  const handleChatSubmit = async (event) => {
    event.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setChatInput('');

    // Show a temporary typing indicator message
    const tempId = Date.now() + 1;
    setMessages((prev) => [...prev, { id: tempId, sender: 'bot', text: 'Thinking...' }]);

    try {
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });
      
      const data = await response.json();
      
      setMessages((prev) => 
        prev.map(msg => msg.id === tempId ? { ...msg, text: data.reply || data.error || 'Sorry, I could not generate a response.' } : msg)
      );
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => 
        prev.map(msg => msg.id === tempId ? { ...msg, text: 'Error connecting to the chat server.' } : msg)
      );
    }
  };

  const handleOptionSelect = (questionId, option) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const filteredQuizzes = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'All') return sampleQuizzes;
    return sampleQuizzes.filter((quiz) => quiz.category === selectedCategory);
  }, [selectedCategory]);

  const toggleTheme = () => setDarkMode((prev) => !prev);

  const stats = [
    { label: '10K+ Questions', value: '10K+' },
    { label: '5K+ Students', value: '5K+' },
    { label: '50+ Categories', value: '50+' },
    { label: '100K+ Quizzes Attempted', value: '100K+' },
  ];

  const howItWorks = [
    'Create Account',
    'Choose Quiz',
    'Answer Questions',
    'Get Instant Result',
    'Track Your Progress',
  ];

  const features = [
    'Timed Quizzes',
    'Instant Results',
    'Performance Analytics',
    'Leaderboard',
    'Multiple Categories',
    'Difficulty Levels',
    'Random Questions',
    'Progress Tracking',
  ];

  const renderLandingPage = () => (
    <>
      <section className="hero-section container">
        <div className="hero-copy">
          <span className="eyebrow">Learn. Practice. Compete.</span>
          <h1>Test Your Knowledge. Challenge Yourself. Learn More.</h1>
          <p>
            QuizMaster blends adaptive learning, timed assessments, and real-time rankings into one premium online assessment experience.
          </p>
          <div className="cta-row">
            <button
              className="primary-btn large-btn"
              onClick={() => {
                setSelectedCategory('Computer Science');
                window.location.assign('/quizzes');
              }}
            >
              Start Quiz <ArrowRight size={18} />
            </button>
            <button
              className="secondary-btn large-btn"
              onClick={() => window.location.assign('/categories')}
            >
              Explore Categories
            </button>
          </div>
          <div className="mini-stats">
            {stats.map((stat) => (
              <div key={stat.label} className="mini-stat-card">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-visual hero-visual-clean">
          <div className="hero-spotlight" aria-hidden="true" />
          <div className="hero-panel">
            <span className="eyebrow">Available now</span>
            <h3>Challenge your skills</h3>
            <p>Track progress across categories and sharpen your score with daily quizzes.</p>
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="section-heading">
          <span className="eyebrow">Popular Categories</span>
          <h2>Choose your next challenge</h2>
        </div>
        <div className="category-grid">
          {categories.map((category) => (
            <div key={category.id} className="category-card">
              <div className="category-icon" style={{ background: `${category.color}22`, color: category.color }}>{category.icon}</div>
              <h3>{category.name}</h3>
              <p>{category.questions} Questions</p>
              <div className="category-meta">
                <span>{category.difficulty}</span>
                <strong>{'★'.repeat(4)}</strong>
              </div>
              <button
              className="primary-btn small-btn"
              onClick={() => {
                setSelectedCategory(category.name);
                window.location.assign('/quizzes');
              }}
            >
              Start Quiz
            </button>
            </div>
          ))}
        </div>
      </section>

      <section className="section dark-panel">
        <div className="container">
          <div className="section-heading center">
            <span className="eyebrow">How It Works</span>
            <h2>From signup to success in 5 simple steps</h2>
          </div>
          <div className="steps-grid">
            {howItWorks.map((step, index) => (
              <div key={step} className="step-card">
                <span className="step-number">0{index + 1}</span>
                <h3>{step}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="section-heading center">
          <span className="eyebrow">Features</span>
          <h2>Everything you need to learn smarter</h2>
        </div>
        <div className="features-grid">
          {features.map((feature) => (
            <div key={feature} className="feature-item">
              <CheckCircle2 size={18} />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );

  const renderAuth = () => (
    <section className="auth-shell container">
      <div className="auth-card">
        <div className="auth-side">
          <span className="eyebrow">{authMode === 'login' ? 'Welcome back' : 'Create account'}</span>
          <h2>{authMode === 'login' ? 'Sign in to continue your learning' : 'Join QuizMaster today'}</h2>
          <div className="social-auth">
            <button type="button" className="social-btn wide">Continue with Google</button>
          </div>
          <div className="divider"><span>or</span></div>

          {authError ? <div className="form-message error">{authError}</div> : null}
          {authSuccess ? <div className="form-message success">{authSuccess}</div> : null}

          {authMode === 'login' ? (
            <form className="auth-form" onSubmit={handleLoginSubmit}>
              <label>
                Email
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                />
              </label>
              <label>
                Password
                <div className="password-field">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  />
                  <button type="button" className="toggle-password" onClick={() => setShowLoginPassword((prev) => !prev)}>
                    {showLoginPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>
              <div className="form-row">
                <label className="checkbox-row"><input type="checkbox" /> Remember Me</label>
                <a href="#">Forgot Password?</a>
              </div>
              <button type="submit" className="primary-btn full-btn">Login</button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleRegisterSubmit}>
              <label>
                Full Name
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                />
              </label>
              <label>
                Password
                <div className="password-field">
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    placeholder="Create password"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  />
                  <button type="button" className="toggle-password" onClick={() => setShowRegisterPassword((prev) => !prev)}>
                    {showRegisterPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>
              <label>
                Confirm Password
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={registerForm.confirmPassword}
                  onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                />
              </label>
              <button type="submit" className="primary-btn full-btn">Register</button>
            </form>
          )}
        </div>

        <div className="auth-side alt auth-switch-panel">
          <div className="switch-box">
            <span className="eyebrow">{authMode === 'login' ? 'New here?' : 'Already a member?'}</span>
            <h3>{authMode === 'login' ? 'Create an account' : 'Welcome back'}</h3>
            <p>{authMode === 'login' ? 'Start your learning journey and track your progress with every quiz.' : 'Continue your streak and jump back into your dashboard.'}</p>
            <button
              type="button"
              className="secondary-btn full-btn"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setAuthError('');
                setAuthSuccess('');
              }}
            >
              {authMode === 'login' ? 'Sign Up' : 'Login'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );

  const renderDashboard = () => (
    <section className="container dashboard-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">Dashboard</span>
          <h2>Welcome back, Ava</h2>
        </div>
        <button className="primary-btn">Continue Quiz</button>
      </div>

      <div className="profile-banner">
        <div className="profile-summary">
          <div className="avatar">AJ</div>
          <div>
            <h3>{userProfile.fullName}</h3>
            <p>{userProfile.email}</p>
          </div>
        </div>
        <div className="badge-row">
          <span className="mini-badge">🏆 Quiz Master</span>
          <span className="mini-badge">🔥 7 Day Streak</span>
        </div>
      </div>

      <div className="stats-grid dashboard-stats">
        <div className="stat-card"><label>Total Quizzes</label><strong>42</strong></div>
        <div className="stat-card"><label>Average Score</label><strong>87%</strong></div>
        <div className="stat-card"><label>Best Score</label><strong>98%</strong></div>
        <div className="stat-card"><label>Leaderboard Rank</label><strong>#6</strong></div>
      </div>

      <div className="content-grid dashboard-grid">
        <div className="panel-box">
          <div className="panel-header">
            <h3>Continue Quiz</h3>
            <span className="tag">Live</span>
          </div>
          <div className="quiz-list">
            {sampleQuizzes.slice(0, 3).map((quiz) => (
              <div key={quiz.id} className="quiz-row">
                <div>
                  <strong>{quiz.title}</strong>
                  <small>{quiz.category}</small>
                </div>
                <button className="primary-btn small-btn">Resume</button>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-box">
          <div className="panel-header">
            <h3>Recent Activity</h3>
          </div>
          <div className="activity-list">
            {recentActivity.map((item) => (
              <div key={item.name} className="activity-row">
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.date}</small>
                </div>
                <div className="activity-metrics">
                  <span>{item.score}/20</span>
                  <span>{item.percentage}%</span>
                  <span className="status-pill">{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel-box full-width">
        <div className="panel-header">
          <h3>Recommended Quizzes</h3>
        </div>
        <div className="recommended-grid">
          {categories.slice(0, 4).map((quiz) => (
            <div key={quiz.id} className="mini-quiz-card">
              <div className="category-icon" style={{ background: `${quiz.color}22`, color: quiz.color }}>{quiz.icon}</div>
              <h4>{quiz.name}</h4>
              <p>{quiz.questions} questions</p>
              <button className="secondary-btn small-btn">Try Now</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  const renderCategories = () => (
    <section className="container category-page">
      <div className="section-heading">
        <span className="eyebrow">Quiz Categories</span>
        <h2>Explore by subject</h2>
      </div>
      <div className="category-grid detailed-grid">
        {categories.map((category) => (
          <div key={category.id} className="category-card large-card">
            <div className="category-icon" style={{ background: `${category.color}22`, color: category.color }}>{category.icon}</div>
            <h3>{category.name}</h3>
            <p>{category.description}</p>
            <div className="detail-row">
              <span>{category.questions} Questions</span>
              <span>{category.difficulty}</span>
            </div>
            <div className="detail-row">
              <span>{category.attempts} attempts</span>
              <strong>{'★'.repeat(4)}</strong>
            </div>
            <button
              className="primary-btn small-btn"
              onClick={() => {
                setSelectedCategory(category.name);
                window.location.assign('/quizzes');
              }}
            >
              Start Quiz
            </button>
          </div>
        ))}
      </div>
    </section>
  );

  const renderQuizSelection = () => (
    <section className="container quiz-selection">
      <div className="section-heading">
        <span className="eyebrow">Category</span>
        <h2>{selectedCategory}</h2>
      </div>
      <div className="quiz-list-panel">
        {filteredQuizzes.length === 0 ? (
          <div className="panel-box empty-state">
            <h3>No quiz available</h3>
            <p>There are no quizzes for this category yet. Please select another category.</p>
          </div>
        ) : (
          filteredQuizzes.map((quiz) => (
            <div key={quiz.id} className="quiz-card">
              <div className="quiz-card-top">
                <span className="difficulty-pill green">{quiz.difficulty}</span>
                <strong>{quiz.totalMarks} Marks</strong>
              </div>
              <h3>{quiz.title}</h3>
              <p>{quiz.description}</p>
              <div className="quiz-meta-grid">
                <span>{quiz.category}</span>
                <span>{quiz.questions.length} Questions</span>
                <span>{quiz.timeLimit} min</span>
              </div>
              <button
                className="primary-btn small-btn"
                onClick={() => handleStartQuiz(quiz)}
              >
                {quizLoading ? 'Loading...' : 'Start Quiz'}
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );

  const renderQuiz = () => {
    if (quizLoading) {
      return (
        <section className="container quiz-page">
          <div className="panel-box empty-state">
            <h3>Loading quiz...</h3>
            <p>Please wait while your questions are being prepared.</p>
          </div>
        </section>
      );
    }

    if (!currentQuiz || !currentQuiz.questions || currentQuiz.questions.length === 0) {
      return (
        <section className="container quiz-page">
          <div className="panel-box empty-state">
            <h3>No questions found</h3>
            <p>This quiz has no available questions yet. Please choose a different quiz.</p>
          </div>
        </section>
      );
    }

    if (!question) return null;

    return (
      <section className="container quiz-page">
        <div className="quiz-header-card">
          <div>
            <span className="eyebrow">{currentQuiz.category}</span>
            <h2>{currentQuiz.title}</h2>
          </div>
          <div className="quiz-header-actions">
            <div className="timer-box">Time Remaining: {formatTime(timeLeft)}</div>
            <div className="score-box">Score: {score}</div>
          </div>
        </div>

        <div className="progress-row">
          <span>Question {activeQuestionIndex + 1} of {totalQuestions}</span>
          <div className="progress-bar"><span style={{ width: `${((activeQuestionIndex + 1) / totalQuestions) * 100}%` }} /></div>
        </div>

        <div className="quiz-layout">
          <div className="quiz-main panel-box">
            <h3>{question.question}</h3>
            <div className="options-list">
              {question.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`option-btn ${answers[question.id] === option ? 'selected' : ''}`}
                  onClick={() => handleOptionSelect(question.id, option)}
                >
                  {option}
                </button>
              ))}
            </div>

            <div className="quiz-controls">
              <button className="secondary-btn" onClick={() => setActiveQuestionIndex((prev) => Math.max(prev - 1, 0))}>Previous</button>
              <button className="secondary-btn" onClick={() => handleOptionSelect(question.id, null)}>Clear answer</button>
              <button className="primary-btn" onClick={() => setActiveQuestionIndex((prev) => Math.min(prev + 1, totalQuestions - 1))}>Next</button>
            </div>
          </div>

          <aside className="quiz-sidebar panel-box">
            <h3>Question Panel</h3>
            <div className="question-nav-grid">
              {currentQuiz.questions.map((item, index) => (
                <button
                  key={item.id}
                  className={`nav-dot ${index === activeQuestionIndex ? 'active' : ''} ${answers[item.id] ? 'answered' : ''}`}
                  onClick={() => setActiveQuestionIndex(index)}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            <button className="secondary-btn full-btn">Mark for review</button>
            <button className="primary-btn full-btn" onClick={handleSubmitQuiz}>Submit Quiz</button>
          </aside>
        </div>
      </section>
    );
  };

  const renderResults = () => {
    const safeTotal = Math.max(totalQuestions, 1);
    const percentage = Math.round((score / safeTotal) * 100);
    const correct = score;
    const wrong = totalQuestions - score;

    return (
      <section className="container result-page">
        <div className="result-card panel-box">
          <span className="eyebrow">Quiz Completed!</span>
          <h2>Score: {score} / {totalQuestions}</h2>
          <div className="score-ring-wrap">
            <div className="score-ring">
              <div className="score-ring-inner">
                <strong>{percentage}%</strong>
              </div>
            </div>
          </div>
          <div className="result-metrics">
            <div><label>Correct Answers</label><strong>{correct}</strong></div>
            <div><label>Wrong Answers</label><strong>{wrong}</strong></div>
            <div><label>Time Taken</label><strong>{formatTime((currentQuiz.timeLimit * 60) - timeLeft)}</strong></div>
          </div>
          <p className="result-status">Performance: <span>Excellent!</span></p>
          <div className="result-actions">
            <button className="primary-btn" onClick={() => window.location.assign('/analytics')}>Review Answers</button>
            <button className="secondary-btn" onClick={() => {
              setAnswers({});
              setSubmitted(false);
              setActiveQuestionIndex(0);
              setTimeLeft(currentQuiz.timeLimit * 60);
              window.location.assign('/quizzes');
            }}>Try Again</button>
            <button className="secondary-btn" onClick={() => window.location.assign('/dashboard')}>Back to Dashboard</button>
            <button className="secondary-btn">Share Result</button>
          </div>
        </div>
      </section>
    );
  };

  const renderAnalytics = () => (
    <section className="container analytics-page">
      <div className="section-heading">
        <span className="eyebrow">Performance Analytics</span>
        <h2>Track your progress</h2>
      </div>
      <div className="analytics-grid">
        <div className="panel-box chart-panel">
          <h3>Score Over Time</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={analyticsData.lineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="panel-box chart-panel">
          <h3>Category-wise Performance</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analyticsData.barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="correct" fill="#22c55e" radius={[8, 8, 0, 0]} />
              <Bar dataKey="incorrect" fill="#f59e0b" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel-box chart-panel">
          <h3>Correct vs Incorrect</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={analyticsData.pieData} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {analyticsData.pieData.map((entry, index) => (
                  <Cell key={entry.name} fill={index === 0 ? '#22c55e' : '#f97316'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );

  const renderLeaderboard = () => (
    <section className="container leaderboard-page">
      <div className="section-heading">
        <span className="eyebrow">Leaderboard</span>
        <h2>See who dominates the rankings</h2>
      </div>

      <div className="podium">
        <div className="podium-card second">
          <span>2</span>
          <h3>David</h3>
          <strong>9,015</strong>
        </div>
        <div className="podium-card first">
          <span>1</span>
          <h3>Ariana</h3>
          <strong>9,230</strong>
        </div>
        <div className="podium-card third">
          <span>3</span>
          <h3>Priya</h3>
          <strong>8,850</strong>
        </div>
      </div>

      <div className="leaderboard-table panel-box">
        <div className="table-head">
          <span>Rank</span>
          <span>User</span>
          <span>Points</span>
          <span>Quizzes</span>
          <span>Accuracy</span>
        </div>
        {leaderboardData.map((entry) => (
          <div key={entry.name} className={`table-row ${entry.name === 'Ava Johnson' ? 'highlight' : ''}`}>
            <span>#{entry.rank}</span>
            <span>{entry.badge} {entry.name}</span>
            <span>{entry.points}</span>
            <span>{entry.quizzes}</span>
            <span>{entry.accuracy}%</span>
          </div>
        ))}
      </div>
    </section>
  );

  const renderProfile = () => (
    <section className="container profile-page">
      <div className="profile-layout panel-box">
        <div className="profile-hero">
          <div className="avatar large">AJ</div>
          <div>
            <h2>{userProfile.fullName}</h2>
            <p>{userProfile.email}</p>
            <span className="muted">Joined {userProfile.joinDate}</span>
          </div>
        </div>

        <div className="stats-grid profile-grid">
          <div className="stat-card"><label>Total Quizzes</label><strong>{userProfile.totalQuizzes}</strong></div>
          <div className="stat-card"><label>Total Points</label><strong>{userProfile.totalPoints}</strong></div>
          <div className="stat-card"><label>Average Score</label><strong>{userProfile.averageScore}%</strong></div>
          <div className="stat-card"><label>Best Score</label><strong>{userProfile.bestScore}%</strong></div>
          <div className="stat-card"><label>Current Streak</label><strong>{userProfile.streak} days</strong></div>
        </div>

        <div className="achievements panel-box inner-panel">
          <h3>Achievement Badges</h3>
          <div className="badge-grid">
            {['🏆 Quiz Master', '🔥 7 Day Streak', '⭐ 90% Accuracy', '🎯 100 Questions Completed', '🥇 Top 10 Leader'].map((badge, index) => (
              <span key={badge} className="mini-badge" style={{ borderColor: badgeColors[index % badgeColors.length] }}>{badge}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );

  const renderAdmin = () => (
    <section className="container admin-page">
      <div className="section-heading">
        <span className="eyebrow">Admin Panel</span>
        <h2>Platform overview</h2>
      </div>
      <div className="stats-grid dashboard-stats">
        <div className="stat-card"><label>Total Users</label><strong>1842</strong></div>
        <div className="stat-card"><label>Total Quizzes</label><strong>96</strong></div>
        <div className="stat-card"><label>Total Questions</label><strong>{currentQuiz.questions.length}</strong></div>
        <div className="stat-card"><label>Average Score</label><strong>78%</strong></div>
      </div>

      <div className="admin-panels">
        <div className="panel-box admin-panel">
          <h3>Manage Users</h3>
          <div className="table-head small-table">
            <span>Name</span>
            <span>Email</span>
            <span>Status</span>
          </div>
          {adminUsers.map((user) => (
            <div key={user.id} className="table-row small-row">
              <span>{user.name}</span>
              <span>{user.email}</span>
              <span>{user.status}</span>
            </div>
          ))}
        </div>
        <div className="panel-box admin-panel">
          <h3>Question Management</h3>
          <form className="admin-form" onSubmit={handleAddQuestion}>
            <input
              type="text"
              placeholder="Question text"
              value={adminQuestionForm.question}
              onChange={(e) => setAdminQuestionForm({ ...adminQuestionForm, question: e.target.value })}
            />
            <input
              type="text"
              placeholder="Option A"
              value={adminQuestionForm.optionA}
              onChange={(e) => setAdminQuestionForm({ ...adminQuestionForm, optionA: e.target.value })}
            />
            <input
              type="text"
              placeholder="Option B"
              value={adminQuestionForm.optionB}
              onChange={(e) => setAdminQuestionForm({ ...adminQuestionForm, optionB: e.target.value })}
            />
            <input
              type="text"
              placeholder="Option C"
              value={adminQuestionForm.optionC}
              onChange={(e) => setAdminQuestionForm({ ...adminQuestionForm, optionC: e.target.value })}
            />
            <input
              type="text"
              placeholder="Option D"
              value={adminQuestionForm.optionD}
              onChange={(e) => setAdminQuestionForm({ ...adminQuestionForm, optionD: e.target.value })}
            />
            <input
              type="text"
              placeholder="Correct answer"
              value={adminQuestionForm.correctAnswer}
              onChange={(e) => setAdminQuestionForm({ ...adminQuestionForm, correctAnswer: e.target.value })}
            />
            {adminQuestionMessage ? <div className={`form-message ${adminQuestionMessage.includes('successfully') ? 'success' : 'error'}`}>{adminQuestionMessage}</div> : null}
            <button type="submit" className="primary-btn full-btn">Add Question</button>
          </form>
        </div>
      </div>
    </section>
  );

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar darkMode={darkMode} toggleTheme={toggleTheme} user={user} onLogout={handleLogout} />
        <main>
          <Routes>
            <Route path="/" element={renderLandingPage()} />
            <Route path="/auth" element={renderAuth()} />
            <Route path="/dashboard" element={renderDashboard()} />
            <Route path="/categories" element={renderCategories()} />
            <Route path="/quizzes" element={renderQuizSelection()} />
            <Route path="/quiz" element={submitted ? renderResults() : renderQuiz()} />
            <Route path="/analytics" element={renderAnalytics()} />
            <Route path="/leaderboard" element={renderLeaderboard()} />
            <Route path="/profile" element={renderProfile()} />
            <Route path="/admin" element={renderAdmin()} />
          </Routes>
        </main>
        <Footer />
      </div>

      <div className="ai-chatbot">
        {!chatOpen ? (
          <button className="chat-launcher" onClick={() => setChatOpen(true)} aria-label="Open AI assistant">
            <MessageCircle size={18} />
            AI Guide
          </button>
        ) : (
          <div className="chat-panel">
            <div className="chat-header">
              <div className="chat-title-wrap">
                <div className="chat-icon">
                  <Bot size={16} />
                </div>
                <div>
                  <strong>QuizMaster AI</strong>
                  <span>Online assistant</span>
                </div>
              </div>
              <button className="chat-close" onClick={() => setChatOpen(false)} aria-label="Close AI assistant">
                <X size={16} />
              </button>
            </div>

            <div className="chat-body">
              {messages.map((message) => (
                <div key={message.id} className={`chat-message ${message.sender}`}>
                  {message.text}
                </div>
              ))}
            </div>

            <form className="chat-form" onSubmit={handleChatSubmit}>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about quizzes, dashboard, rankings..."
              />
              <button type="submit" aria-label="Send message">
                <Send size={16} />
              </button>
            </form>
          </div>
        )}
      </div>
    </BrowserRouter>
  );
}

export default App;
