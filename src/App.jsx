import './App.css';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  MessageCircle,
  Send,
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
import PatientIntake from './components/PatientIntake';
import { getAdminUsers, sendChatMessage } from './api';
import { getAssistantReply } from '../shared/assistant';
import { RequireAuth } from './auth/AuthContext.jsx';
import { useAuth } from './auth/useAuth';
import { isLocalBackend } from './lib/appMode';
import {
  fetchCategories,
  fetchLeaderboard,
  fetchPlatformStats,
  fetchQuizzes,
  fetchUserAttempts,
  saveAttempt,
} from './lib/quizData';

const badgeColors = ['#fbbf24', '#f97316', '#8b5cf6', '#10b981', '#60a5fa'];

function getAuthErrorMessage(error, fallback) {
  const message = error?.message || '';
  if (/failed to fetch|networkerror|fetch failed|name_not_resolved/i.test(message)) {
    return 'Cannot connect to Supabase. Check that VITE_SUPABASE_URL points to an active project and that your internet connection is available.';
  }
  return message || fallback;
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user: authUser,
    profile,
    profileLoading,
    profileError,
    configurationError,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    refreshProfile,
  } = useAuth();
  const user = authUser ? {
    id: authUser.id,
    name: profile?.username || authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'Learner',
    email: authUser.email,
    avatar_url: profile?.avatar_url,
    role: authUser.user_metadata?.role,
  } : null;
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('quiz-theme');
    return savedTheme ? savedTheme === 'dark' : true;
  });
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [lastStartedQuizId, setLastStartedQuizId] = useState(() => sessionStorage.getItem('quiz-last-started') || '');
  const [currentQuiz, setCurrentQuiz] = useState({ id: '', title: '', category: '', timeLimit: 0, questions: [] });
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [resultScore, setResultScore] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [authMode, setAuthMode] = useState('login');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [quizLoading, setQuizLoading] = useState(true);
  const [quizzes, setQuizzes] = useState([]);
  const [quizError, setQuizError] = useState('');
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState('');
  const [platformStats, setPlatformStats] = useState(null);
  const [statsError, setStatsError] = useState('');
  const [attemptsState, setAttemptsState] = useState({ userId: null, items: [] });
  const [attemptsLoadedFor, setAttemptsLoadedFor] = useState(null);
  const [attemptsErrorState, setAttemptsErrorState] = useState({ userId: null, message: '' });
  const userAttempts = attemptsState.userId === user?.id ? attemptsState.items : [];
  const attemptsLoading = Boolean(user?.id && attemptsLoadedFor !== user.id);
  const attemptsError = attemptsErrorState.userId === user?.id ? attemptsErrorState.message : '';
  const [attemptSaveError, setAttemptSaveError] = useState('');
  const [attemptSaving, setAttemptSaving] = useState(false);
  const [attemptSaved, setAttemptSaved] = useState(false);
  const attemptSavingRef = useRef(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [managedUsers, setManagedUsers] = useState([]);
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminLoadError, setAdminLoadError] = useState('');
  const [adminQuestionForm, setAdminQuestionForm] = useState({
    question: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: '',
  });
  const [adminQuestionMessage, setAdminQuestionMessage] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatPending, setChatPending] = useState(false);
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
    if (authUser && location.pathname === '/auth') {
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    }
  }, [authUser, location.pathname, location.state, navigate]);

  useEffect(() => {
    let mounted = true;
    fetchCategories()
      .then((items) => { if (mounted) setCategories(items); })
      .catch((error) => { if (mounted) setCategoriesError(error.message || 'Unable to load categories.'); })
      .finally(() => { if (mounted) setCategoriesLoading(false); });
    fetchQuizzes()
      .then((items) => { if (mounted) setQuizzes(items); })
      .catch((error) => { if (mounted) setQuizError(error.message || 'Unable to load quizzes.'); })
      .finally(() => { if (mounted) setQuizLoading(false); });
    fetchPlatformStats()
      .then((stats) => { if (mounted) setPlatformStats(stats); })
      .catch((error) => { if (mounted) setStatsError(error.message || 'Unable to load platform statistics.'); });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchLeaderboard()
      .then((items) => { if (mounted) setLeaderboard(items); })
      .catch((error) => { if (mounted) setLeaderboardError(error.message || 'Unable to load the leaderboard.'); })
      .finally(() => { if (mounted) setLeaderboardLoading(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!user?.id) return undefined;
    let mounted = true;
    fetchUserAttempts(user.id)
      .then((items) => { if (mounted) setAttemptsState({ userId: user.id, items }); })
      .catch((error) => {
        if (mounted) setAttemptsErrorState({ userId: user.id, message: error.message || 'Unable to load your quiz history.' });
      })
      .finally(() => { if (mounted) setAttemptsLoadedFor(user.id); });
    return () => { mounted = false; };
  }, [user?.id]);

  useEffect(() => {
    if (user?.role !== 'admin') {
      return undefined;
    }

    let mounted = true;
    getAdminUsers()
      .then((users) => {
        if (mounted) setManagedUsers(users);
      })
      .catch((error) => {
        if (mounted) setAdminLoadError(error.message);
      })
      .finally(() => {
        if (mounted) setAdminLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [user?.role]);

  useEffect(() => {
    if (submitted || !currentQuiz.id) return undefined;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setSubmitted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [submitted, currentQuiz.id]);

  const totalQuestions = currentQuiz.questions?.length || 0;
  const question = currentQuiz.questions?.[activeQuestionIndex];
  const attemptsTotalQuestions = userAttempts.reduce((total, attempt) => total + attempt.total_questions, 0);
  const attemptsTotalCorrect = userAttempts.reduce((total, attempt) => total + attempt.score, 0);
  const averageAttemptScore = attemptsTotalQuestions
    ? Math.round((attemptsTotalCorrect / attemptsTotalQuestions) * 100)
    : 0;
  const bestAttemptScore = userAttempts.reduce((best, attempt) => (
    Math.max(best, attempt.total_questions ? Math.round((attempt.score / attempt.total_questions) * 100) : 0)
  ), 0);
  const userRank = leaderboard.find((entry) => entry.user_id === user?.id)?.rank;
  const analyticsLineData = [...userAttempts].reverse().map((attempt, index) => ({
    name: `${index + 1}`,
    score: attempt.total_questions ? Math.round((attempt.score / attempt.total_questions) * 100) : 0,
  }));
  const analyticsCategoryMap = userAttempts.reduce((summary, attempt) => {
    const name = attempt.quizzes?.categories?.name || 'Other';
    const category = summary[name] || { name, correct: 0, incorrect: 0 };
    category.correct += attempt.score;
    category.incorrect += attempt.total_questions - attempt.score;
    summary[name] = category;
    return summary;
  }, {});
  const analyticsBarData = Object.values(analyticsCategoryMap);
  const analyticsPieData = [
    { name: 'Correct', value: attemptsTotalCorrect },
    { name: 'Incorrect', value: Math.max(0, attemptsTotalQuestions - attemptsTotalCorrect) },
  ];

  const score = resultScore ?? 0;

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
    setQuizLoading(false);
    const quizId = String(quiz.id || quiz._id);
    sessionStorage.setItem('quiz-last-started', quizId);
    setLastStartedQuizId(quizId);
    setCurrentQuiz(quiz);
    setTimeLeft(quiz.timeLimit * 60);
    setAnswers({});
    setSubmitted(false);
    setResultScore(null);
    setAttemptSaveError('');
    setAttemptSaved(false);
    attemptSavingRef.current = false;
    setActiveQuestionIndex(0);
    navigate('/quiz');
  };

  const handleSubmitQuiz = () => {
    if (submitted) return;
    setSubmitted(true);
  };

  useEffect(() => {
    if (!submitted || !user?.id || !currentQuiz.id || attemptSavingRef.current) return;
    attemptSavingRef.current = true;
    setAttemptSaving(true);
    saveAttempt({
      quizId: currentQuiz.id,
      answers,
      timeTaken: Math.max(0, (currentQuiz.timeLimit * 60) - timeLeft),
    })
      .then(async (result) => {
        setResultScore(result.score);
        setAttemptSaved(true);
        try {
          setAttemptsState({ userId: user.id, items: await fetchUserAttempts(user.id) });
        } catch (error) {
          setAttemptsErrorState({ userId: user.id, message: error.message || 'Unable to refresh your quiz history.' });
        }
        try {
          await refreshProfile();
        } catch (error) {
          setAttemptSaveError(`Your result was saved, but your profile could not be refreshed: ${error.message}`);
        }
        try {
          setLeaderboard(await fetchLeaderboard());
        } catch (error) {
          setLeaderboardError(error.message || 'Unable to refresh the leaderboard.');
        }
        try {
          setPlatformStats(await fetchPlatformStats());
        } catch (error) {
          setStatsError(error.message || 'Unable to refresh platform statistics.');
        }
      })
      .catch((error) => {
        setAttemptSaveError(`Quiz completed, but the result could not be saved: ${error.message}`);
      })
      .finally(() => {
        setAttemptSaving(false);
      });
  }, [answers, currentQuiz, refreshProfile, submitted, timeLeft, user?.id]);

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);

    const credentials = { email: loginForm.email.trim(), password: loginForm.password };
    if (!credentials.email || !credentials.password) {
      setAuthError('Email and password are required.');
      setAuthLoading(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email)) {
      setAuthError('Please enter a valid email address.');
      setAuthLoading(false);
      return;
    }

    try {
      await signIn(credentials.email, credentials.password);
      setAuthSuccess('Login successful. Redirecting...');
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (error) {
      setAuthError(getAuthErrorMessage(error, 'Unable to log in. Please try again.'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);

    const details = {
      username: registerForm.name.trim(),
      email: registerForm.email.trim(),
      password: registerForm.password,
    };
    if (!details.username || !details.email || !details.password || !registerForm.confirmPassword) {
      setAuthError('Please fill in all fields.');
      setAuthLoading(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) {
      setAuthError('Please enter a valid email address.');
      setAuthLoading(false);
      return;
    }

    if (details.password.length < 6) {
      setAuthError('Password must be at least 6 characters long.');
      setAuthLoading(false);
      return;
    }

    if (details.password !== registerForm.confirmPassword) {
      setAuthError('Passwords do not match.');
      setAuthLoading(false);
      return;
    }

    try {
      const { session } = await signUp(details);
      if (session) {
        setAuthSuccess('Account created successfully. Redirecting...');
        navigate('/dashboard', { replace: true });
      } else {
        setAuthSuccess('Account created. Check your email to confirm your address before signing in.');
      }
    } catch (error) {
      setAuthError(getAuthErrorMessage(error, 'Unable to create your account. Please try again.'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);
    try {
      await signInWithGoogle(`${window.location.origin}/auth`);
    } catch (error) {
      setAuthError(getAuthErrorMessage(error, 'Unable to sign in with Google. Please try again.'));
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setManagedUsers([]);
      setAdminLoadError('');
      setAdminLoading(true);
      navigate('/');
    } catch (error) {
      setAuthError(error.message || 'Unable to sign out. Please try again.');
    }
  };

  const handleChatSubmit = async (event) => {
    event.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    const userMessage = {
      id: `${Date.now()}-user`,
      sender: 'user',
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setChatInput('');

    // Show a temporary typing indicator message
    const tempId = `${Date.now()}-bot`;
    setMessages((prev) => [...prev, { id: tempId, sender: 'bot', text: 'Thinking...' }]);
    setChatPending(true);

    try {
      let reply;
      try {
        const data = await sendChatMessage(trimmed);
        reply = data.mode === 'guide'
          ? `The AI service is unavailable, but I can still help: ${data.reply}`
          : data.reply;
      } catch {
        reply = `The AI service is unavailable, but I can still help: ${getAssistantReply(trimmed)}`;
      }

      setMessages((prev) => prev.map((message) => (
        message.id === tempId ? { ...message, text: reply || getAssistantReply(trimmed) } : message
      )));
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => prev.map((message) => (
        message.id === tempId
          ? { ...message, text: 'Sorry, I could not answer just now. Please try again.' }
          : message
      )));
    } finally {
      setChatPending(false);
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
    const matchesCategory = !selectedCategory || selectedCategory === 'All'
      ? quizzes
      : quizzes.filter((quiz) => quiz.category === selectedCategory);
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const matchesSearch = normalizedSearch
      ? matchesCategory.filter((quiz) => (
        `${quiz.title} ${quiz.description} ${quiz.category}`.toLowerCase().includes(normalizedSearch)
      ))
      : matchesCategory;
    return [...matchesSearch].sort((first, second) => (
      Number(String(first.id) === lastStartedQuizId) - Number(String(second.id) === lastStartedQuizId)
    ));
  }, [lastStartedQuizId, searchTerm, selectedCategory, quizzes]);

  const toggleTheme = () => setDarkMode((prev) => !prev);

  const stats = [
    { label: 'Questions', value: platformStats?.question_count },
    { label: 'Students', value: platformStats?.student_count },
    { label: 'Categories', value: platformStats?.category_count },
    { label: 'Quizzes Attempted', value: platformStats?.attempt_count },
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
                setSelectedCategory('All');
                navigate('/quizzes');
              }}
            >
              Start Quiz <ArrowRight size={18} />
            </button>
            <button
              className="secondary-btn large-btn"
              onClick={() => navigate('/categories')}
            >
              Explore Categories
            </button>
          </div>
          <div className="mini-stats">
            {stats.map((stat) => (
              <div key={stat.label} className="mini-stat-card">
                <strong>{stat.value == null ? '—' : Number(stat.value).toLocaleString()}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
          {statsError ? <div className="form-message error">{statsError}</div> : null}
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
          {categoriesLoading ? <p>Loading categories...</p> : null}
          {categoriesError ? <div className="form-message error">{categoriesError}</div> : null}
          {!categoriesLoading && !categoriesError && categories.map((category, index) => (
            <div key={category.id} className="category-card">
              <div className="category-icon" style={{ background: `${badgeColors[index % badgeColors.length]}22`, color: badgeColors[index % badgeColors.length] }}>{category.icon}</div>
              <h3>{category.name}</h3>
              <p>{category.questionCount} Questions</p>
              <div className="category-meta">
                <span>{category.difficulty}</span>
                <strong>{'★'.repeat(4)}</strong>
              </div>
              <button
              className="primary-btn small-btn"
              onClick={() => {
                setSelectedCategory(category.name);
                navigate('/quizzes');
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

          {authError ? <div className="form-message error">{authError}</div> : null}
          {configurationError ? <div className="form-message error">{configurationError}</div> : null}
          {authSuccess ? <div className="form-message success">{authSuccess}</div> : null}

          {authMode === 'login' ? (
            <form className="auth-form" onSubmit={handleLoginSubmit}>
              <label>
                Email
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={loginForm.email}
                  required
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
                    required
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  />
                  <button type="button" className="toggle-password" onClick={() => setShowLoginPassword((prev) => !prev)}>
                    {showLoginPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>
              <button type="submit" className="primary-btn full-btn" disabled={authLoading}>
                {authLoading ? 'Signing in...' : 'Login'}
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleRegisterSubmit}>
              <label>
                Full Name
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={registerForm.name}
                  required
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={registerForm.email}
                  required
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
                    minLength={6}
                    required
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
                  required
                  onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                />
              </label>
              <button type="submit" className="primary-btn full-btn" disabled={authLoading}>
                {authLoading ? 'Creating account...' : 'Register'}
              </button>
            </form>
          )}
          <div className="divider"><span>or continue with</span></div>
          {isLocalBackend ? (
            <p className="form-message">
              Google sign-in needs a configured Supabase project and Google OAuth credentials. Local email signup and login are ready.
            </p>
          ) : (
            <button
              type="button"
              className="social-btn wide google-auth-btn"
              onClick={handleGoogleSignIn}
              disabled={authLoading}
            >
              <svg aria-hidden="true" viewBox="0 0 48 48" width="20" height="20">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(0 4)" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.72 7.18l7.66 5.94c4.47-4.13 7.1-10.2 7.1-17.59Z" />
                <path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.9 23.9 0 0 0 0 21.56l7.98-6.19Z" transform="translate(0 4)" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.86l-7.66-5.94c-2.13 1.43-4.85 2.28-8.24 2.28-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" transform="translate(0 -4)" />
              </svg>
              {authLoading ? 'Connecting to Google...' : 'Continue with Google'}
            </button>
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
          <h2>Welcome back, {user?.name?.split(' ')[0] || 'Learner'}</h2>
        </div>
        <button className="primary-btn" onClick={() => quizzes[0] && handleStartQuiz(quizzes[0])} disabled={!quizzes.length}>
          Continue Quiz
        </button>
      </div>

      <div className="profile-banner">
        <div className="profile-summary">
          {user?.avatar_url
            ? <img className="avatar" src={user.avatar_url} alt="" />
            : <div className="avatar">{user?.name?.slice(0, 2).toUpperCase() || 'U'}</div>}
          <div>
            <h3>{user?.name}</h3>
            <p>{user?.email}</p>
          </div>
        </div>
        <div className="badge-row">
          <span className="mini-badge">🏆 Quiz Master</span>
          <span className="mini-badge">🔥 7 Day Streak</span>
        </div>
      </div>

      <div className="stats-grid dashboard-stats">
        <div className="stat-card"><label>Total Quizzes</label><strong>{userAttempts.length}</strong></div>
        <div className="stat-card"><label>Average Score</label><strong>{averageAttemptScore}%</strong></div>
        <div className="stat-card"><label>Best Score</label><strong>{bestAttemptScore}%</strong></div>
        <div className="stat-card"><label>Leaderboard Rank</label><strong>{userRank ? `#${userRank}` : '—'}</strong></div>
      </div>
      {attemptsError ? <div className="form-message error">{attemptsError}</div> : null}

      <div className="content-grid dashboard-grid">
        <div className="panel-box">
          <div className="panel-header">
            <h3>Continue Quiz</h3>
            <span className="tag">Live</span>
          </div>
          <div className="quiz-list">
            {quizLoading ? <p>Loading quizzes...</p> : null}
            {!quizLoading && quizzes.slice(0, 3).map((quiz) => (
              <div key={quiz.id} className="quiz-row">
                <div>
                  <strong>{quiz.title}</strong>
                  <small>{quiz.category}</small>
                </div>
                <button className="primary-btn small-btn" onClick={() => handleStartQuiz(quiz)}>Start</button>
              </div>
            ))}
            {!quizLoading && quizzes.length === 0 ? <p>No quizzes available yet.</p> : null}
          </div>
        </div>

        <div className="panel-box">
          <div className="panel-header">
            <h3>Recent Activity</h3>
          </div>
          <div className="activity-list">
            {attemptsLoading ? <p>Loading recent activity...</p> : null}
            {!attemptsLoading && userAttempts.slice(0, 5).map((item) => (
              <div key={item.id} className="activity-row">
                <div>
                  <strong>{item.quizzes?.title || 'Quiz'}</strong>
                  <small>{new Date(item.created_at).toLocaleDateString()}</small>
                </div>
                <div className="activity-metrics">
                  <span>{item.score}/{item.total_questions}</span>
                  <span>{item.total_questions ? Math.round((item.score / item.total_questions) * 100) : 0}%</span>
                  <span className="status-pill">Completed</span>
                </div>
              </div>
            ))}
            {!attemptsLoading && userAttempts.length === 0 ? <p>No quiz attempts yet.</p> : null}
          </div>
        </div>
      </div>

      <div className="panel-box full-width">
        <div className="panel-header">
          <h3>Recommended Quizzes</h3>
        </div>
        <div className="recommended-grid">
          {quizzes.slice(0, 4).map((quiz, index) => (
            <div key={quiz.id} className="mini-quiz-card">
              <div className="category-icon" style={{ background: `${badgeColors[index % badgeColors.length]}22`, color: badgeColors[index % badgeColors.length] }}>{quiz.category.slice(0, 1)}</div>
              <h4>{quiz.title}</h4>
              <p>{quiz.questions.length} questions</p>
              <button className="secondary-btn small-btn" onClick={() => handleStartQuiz(quiz)}>Try Now</button>
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
        {categoriesLoading ? <p>Loading categories...</p> : null}
        {categoriesError ? <div className="form-message error">{categoriesError}</div> : null}
        {!categoriesLoading && !categoriesError && categories.map((category, index) => (
          <div key={category.id} className="category-card large-card">
            <div className="category-icon" style={{ background: `${badgeColors[index % badgeColors.length]}22`, color: badgeColors[index % badgeColors.length] }}>{category.icon}</div>
            <h3>{category.name}</h3>
            <p>{category.description}</p>
            <div className="detail-row">
              <span>{category.questionCount} Questions</span>
              <span>{category.difficulty}</span>
            </div>
            <div className="detail-row">
              <span>{category.quizCount} Quizzes</span>
              <strong>{'★'.repeat(4)}</strong>
            </div>
            <button
              className="primary-btn small-btn"
              onClick={() => {
                setSelectedCategory(category.name);
                navigate('/quizzes');
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
        <h2>{searchTerm ? `Search: ${searchTerm}` : selectedCategory}</h2>
      </div>
      {quizError ? <div className="form-message error">{quizError}</div> : null}
      <div className="quiz-list-panel">
        {quizLoading ? <div className="panel-box empty-state"><h3>Loading quizzes...</h3></div> : null}
        {!quizLoading && filteredQuizzes.length === 0 ? (
          <div className="panel-box empty-state">
            <h3>No quiz available</h3>
            <p>There are no quizzes matching this category or search yet. Try another search or category.</p>
          </div>
        ) : !quizLoading ? (
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
                disabled={!quiz.questions.length}
              >
                {quiz.questions.length ? 'Start Quiz' : 'No Questions'}
              </button>
            </div>
          ))
        ) : null}
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
            <div className="score-box">Answered: {Object.values(answers).filter(Boolean).length}</div>
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
          <p className="result-status">Performance: <span>{percentage >= 80 ? 'Excellent!' : percentage >= 60 ? 'Good work!' : 'Keep practicing!'}</span></p>
          {attemptSaving ? <p className="form-message">Saving your result...</p> : null}
          {attemptSaved ? <p className="form-message success">Your result has been saved.</p> : null}
          {attemptSaveError ? <div className="form-message error">{attemptSaveError}</div> : null}
          <div className="result-actions">
            <button className="primary-btn" onClick={() => navigate('/analytics')}>Review Answers</button>
            <button className="secondary-btn" onClick={() => {
              setAnswers({});
              setSubmitted(false);
              setActiveQuestionIndex(0);
              setTimeLeft(currentQuiz.timeLimit * 60);
              navigate('/quizzes');
            }}>Try Again</button>
            <button className="secondary-btn" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
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
      {attemptsLoading ? <div className="panel-box empty-state"><h3>Loading your analytics...</h3></div> : null}
      {attemptsError ? <div className="form-message error">{attemptsError}</div> : null}
      {!attemptsLoading && !attemptsError && userAttempts.length === 0
        ? <div className="panel-box empty-state"><h3>No quiz data yet</h3><p>Complete a quiz to see your performance analytics.</p></div>
        : null}
      {!attemptsLoading && !attemptsError && userAttempts.length > 0 ? (
      <div className="analytics-grid">
        <div className="panel-box chart-panel">
          <h3>Score Over Time</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={analyticsLineData}>
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
            <BarChart data={analyticsBarData}>
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
              <Pie data={analyticsPieData} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {analyticsPieData.map((entry, index) => (
                  <Cell key={entry.name} fill={index === 0 ? '#22c55e' : '#f97316'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      ) : null}
    </section>
  );

  const renderLeaderboard = () => {
    const second = leaderboard[1];
    const first = leaderboard[0];
    const third = leaderboard[2];
    const podiumEntry = (entry, place, className) => entry ? (
      <div className={`podium-card ${className}`} key={entry.user_id}>
        <span>{place}</span>
        <h3>{entry.username}</h3>
        <strong>{Number(entry.total_score).toLocaleString()}</strong>
      </div>
    ) : null;

    return (
    <section className="container leaderboard-page">
      <div className="section-heading">
        <span className="eyebrow">Leaderboard</span>
        <h2>See who dominates the rankings</h2>
      </div>

      {leaderboardLoading ? <div className="panel-box empty-state"><h3>Loading leaderboard...</h3></div> : null}
      {leaderboardError ? <div className="form-message error">{leaderboardError}</div> : null}
      {!leaderboardLoading && !leaderboardError && leaderboard.length === 0
        ? <div className="panel-box empty-state"><h3>No scores yet</h3><p>Complete a quiz to appear on the leaderboard.</p></div>
        : null}
      {!leaderboardLoading && !leaderboardError && leaderboard.length > 0 ? (
        <div className="podium">
          {podiumEntry(second, 2, 'second')}
          {podiumEntry(first, 1, 'first')}
          {podiumEntry(third, 3, 'third')}
        </div>
      ) : null}

      <div className="leaderboard-table panel-box">
        <div className="table-head">
          <span>Rank</span>
          <span>User</span>
          <span>Points</span>
          <span>Quizzes</span>
          <span>Accuracy</span>
        </div>
        {leaderboard.map((entry) => (
          <div key={entry.user_id} className={`table-row ${entry.user_id === user?.id ? 'highlight' : ''}`}>
            <span>#{entry.rank}</span>
            <span>{entry.avatar_url ? <img className="avatar" src={entry.avatar_url} alt="" /> : null} {entry.username}</span>
            <span>{Number(entry.total_score).toLocaleString()}</span>
            <span>{entry.quizzes}</span>
            <span>{Number(entry.accuracy || 0)}%</span>
          </div>
        ))}
      </div>
    </section>
    );
  };

  const renderProfile = () => (
    <section className="container profile-page">
      <div className="profile-layout panel-box">
        {profileLoading ? <p>Loading your profile...</p> : null}
        {profileError ? <div className="form-message error">{profileError}</div> : null}
        <div className="profile-hero">
          {user?.avatar_url
            ? <img className="avatar large" src={user.avatar_url} alt="" />
            : <div className="avatar large">{user?.name?.slice(0, 2).toUpperCase() || 'U'}</div>}
          <div>
            <h2>{user?.name}</h2>
            <p>{user?.email}</p>
            <span className="muted">Joined {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}</span>
          </div>
        </div>

        <div className="stats-grid profile-grid">
          <div className="stat-card"><label>Total Quizzes</label><strong>{userAttempts.length}</strong></div>
          <div className="stat-card"><label>Total Points</label><strong>{profile?.total_score ?? 0}</strong></div>
          <div className="stat-card"><label>Average Score</label><strong>{averageAttemptScore}%</strong></div>
          <div className="stat-card"><label>Best Score</label><strong>{bestAttemptScore}%</strong></div>
          <div className="stat-card"><label>Questions Completed</label><strong>{attemptsTotalQuestions}</strong></div>
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

  const renderAdmin = () => {
    if (user?.role !== 'admin') {
      return (
        <section className="container admin-page">
          <div className="panel-box">
            <h2>Admin access required</h2>
            <p>Sign in with the configured administrator account to view registered user details.</p>
            <button className="primary-btn" onClick={() => navigate('/auth')}>Go to Login</button>
          </div>
        </section>
      );
    }

    return (
      <section className="container admin-page">
        <div className="section-heading">
          <span className="eyebrow">Admin Panel</span>
          <h2>Registered users</h2>
        </div>
        <div className="stats-grid dashboard-stats">
          <div className="stat-card"><label>Total Users</label><strong>{managedUsers.length}</strong></div>
          <div className="stat-card"><label>Database</label><strong>MongoDB</strong></div>
          <div className="stat-card"><label>Total Questions</label><strong>{currentQuiz.questions.length}</strong></div>
          <div className="stat-card"><label>Signed in as</label><strong>{user.email}</strong></div>
        </div>

        <div className="admin-panels">
          <div className="panel-box admin-panel">
            <h3>User accounts</h3>
            {adminLoading ? <p>Loading registered users...</p> : null}
            {adminLoadError ? <div className="form-message error">{adminLoadError}</div> : null}
            <div className="table-head small-table">
              <span>Name</span>
              <span>Email</span>
              <span>Last login</span>
            </div>
            {managedUsers.map((account) => (
              <div key={account._id} className="table-row small-row">
                <span>{account.name}</span>
                <span>{account.email}</span>
                <span>{account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString() : 'Never'}</span>
              </div>
            ))}
            {!adminLoading && !adminLoadError && managedUsers.length === 0 ? <p>No registered accounts yet.</p> : null}
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
  };

  return (
    <>
      <div className="app-shell">
        <Navbar
          darkMode={darkMode}
          toggleTheme={toggleTheme}
          user={user}
          onLogout={handleLogout}
          searchTerm={searchTerm}
          onSearchChange={(value) => { setSearchTerm(value); setSelectedCategory('All'); }}
          onSearchSubmit={() => { setSelectedCategory('All'); navigate('/quizzes'); }}
          onAuthModeChange={(mode) => { setAuthMode(mode); setAuthError(''); setAuthSuccess(''); }}
        />
        <main>
          <Routes>
            <Route path="/" element={renderLandingPage()} />
            <Route path="/auth" element={renderAuth()} />
            <Route path="/dashboard" element={<RequireAuth>{renderDashboard()}</RequireAuth>} />
            <Route path="/categories" element={renderCategories()} />
            <Route path="/quizzes" element={renderQuizSelection()} />
            <Route path="/quiz" element={<RequireAuth>{submitted ? renderResults() : renderQuiz()}</RequireAuth>} />
            <Route path="/analytics" element={<RequireAuth>{renderAnalytics()}</RequireAuth>} />
            <Route path="/leaderboard" element={renderLeaderboard()} />
            <Route path="/profile" element={<RequireAuth>{renderProfile()}</RequireAuth>} />
            <Route path="/patient-intake" element={<PatientIntake />} />
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
                  <span>{chatPending ? 'Thinking...' : 'AI + built-in guide'}</span>
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
                disabled={chatPending}
              />
              <button type="submit" aria-label="Send message" disabled={chatPending || !chatInput.trim()}>
                <Send size={16} />
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}

export default App;
