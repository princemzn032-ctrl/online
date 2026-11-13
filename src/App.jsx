import './App.css';
import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Bot,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Send,
  Target,
  X,
  Zap,
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
import BranchesPage from './components/BranchesPage';
import PracticePage from './components/PracticePage';
import AdminPanel from './components/AdminPanel';
import PasswordResetPage from './components/PasswordResetPage';
import {
  getBranches,
  getDashboardPerformance,
  getDashboardSummary,
  getSubjects,
  saveQuizAnswer,
  sendChatMessage,
  setQuestionReview,
  startQuizAttempt,
  submitSavedAttempt,
  updateProfile,
} from './api';
import { getAssistantReply } from '../shared/assistant';
import { RequireAuth } from './auth/AuthContext.jsx';
import { useAuth } from './auth/useAuth';
import { isLocalBackend } from './lib/appMode';
import { getTypicalSubjectCount } from './lib/branchMetrics';
import {
  fetchLeaderboard,
  fetchPlatformStats,
  fetchQuizzes,
  fetchUserAttempts,
} from './lib/quizData';

const badgeColors = ['#fbbf24', '#f97316', '#8b5cf6', '#10b981', '#60a5fa'];
const fallbackEngineeringBranches = [
  { code: 'CSE', name: 'Computer Science & Engineering' },
  { code: 'IT', name: 'Information Technology' },
  { code: 'ECE', name: 'Electronics & Communication Engineering' },
  { code: 'EE', name: 'Electrical Engineering' },
  { code: 'ME', name: 'Mechanical Engineering' },
  { code: 'CE', name: 'Civil Engineering' },
];

function formatScaleStat(value, minimum) {
  const count = Number(value);
  return `${Math.max(Number.isFinite(count) ? count : 0, minimum).toLocaleString()}+`;
}

function getAuthErrorMessage(error, fallback) {
  const message = error?.message || '';
  if (error?.code === 'NETWORK_ERROR') {
    return 'We could not connect to QuizMaster. Please check your connection and try again.';
  }
  if (error?.code === 'REQUEST_TIMEOUT') {
    return 'The request took too long. Please try again.';
  }
  if (/failed to fetch|networkerror|fetch failed|name_not_resolved/i.test(message)) {
    if (isLocalBackend) {
      return 'We could not connect to QuizMaster. Please check your connection and try again.';
    }
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
    branchId: profile?.branch_id || authUser.user_metadata?.branchId || '',
    semester: profile?.semester || authUser.user_metadata?.semester || null,
  } : null;
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('quiz-theme');
    return savedTheme ? savedTheme === 'dark' : true;
  });
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentQuiz, setCurrentQuiz] = useState({ id: '', title: '', category: '', timeLimit: 0, questions: [] });
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [resultScore, setResultScore] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [authMode, setAuthMode] = useState('login');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    branchCode: '',
    semester: '',
  });
  const registerPasswordsMismatch = Boolean(
    registerForm.password
      && registerForm.confirmPassword
      && registerForm.password !== registerForm.confirmPassword,
  );
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [quizLoading, setQuizLoading] = useState(true);
  const [quizzes, setQuizzes] = useState([]);
  const [quizError, setQuizError] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState('');
  const [leaderboardBranchId, setLeaderboardBranchId] = useState('');
  const [leaderboardSubjectId, setLeaderboardSubjectId] = useState('');
  const [leaderboardSubjects, setLeaderboardSubjects] = useState([]);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('all');
  const [platformStats, setPlatformStats] = useState(null);
  const [statsError, setStatsError] = useState('');
  const [attemptsState, setAttemptsState] = useState({ userId: null, items: [] });
  const [attemptsLoadedFor, setAttemptsLoadedFor] = useState(null);
  const [attemptsErrorState, setAttemptsErrorState] = useState({ userId: null, message: '' });
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [dashboardPerformance, setDashboardPerformance] = useState(null);
  const [dashboardError, setDashboardError] = useState('');
  const userAttempts = attemptsState.userId === user?.id ? attemptsState.items : [];
  const attemptsLoading = Boolean(user?.id && attemptsLoadedFor !== user.id);
  const attemptsError = attemptsErrorState.userId === user?.id ? attemptsErrorState.message : '';
  const [attemptSaveError, setAttemptSaveError] = useState('');
  const [attemptSaving, setAttemptSaving] = useState(false);
  const [attemptSaved, setAttemptSaved] = useState(false);
  const attemptSavingRef = useRef(false);
  const [attemptId, setAttemptId] = useState('');
  const [attemptResult, setAttemptResult] = useState(null);
  const [markedForReview, setMarkedForReview] = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);
  const registrationBranchOptions = branchOptions.length ? branchOptions : fallbackEngineeringBranches;
  const [profileForm, setProfileForm] = useState({ name: '', branchId: '', semester: '' });
  const [profileSaveMessage, setProfileSaveMessage] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [branchLoadError, setBranchLoadError] = useState('');
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
    if (location.pathname === '/' && location.hash === '#about') {
      document.getElementById('about')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash, location.pathname]);

  useEffect(() => {
    if (authUser && location.pathname === '/auth') {
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    }
  }, [authUser, location.pathname, location.state, navigate]);

  useEffect(() => {
    let mounted = true;
    fetchQuizzes()
      .then((items) => { if (mounted) setQuizzes(items); })
      .catch((error) => { if (mounted) setQuizError(error.message || 'Unable to load quizzes.'); })
      .finally(() => { if (mounted) setQuizLoading(false); });
    fetchPlatformStats()
      .then((stats) => { if (mounted) setPlatformStats(stats); })
      .catch((error) => { if (mounted) setStatsError(error.message || 'Unable to load platform statistics.'); });
    getBranches()
      .then((items) => { if (mounted) setBranchOptions(items); })
      .catch((error) => { if (mounted) setBranchLoadError(getAuthErrorMessage(error, 'Unable to load engineering branches.')); });

    return () => {
      mounted = false;
    };

  }, []);

  useEffect(() => {
    let mounted = true;
    setLeaderboardLoading(true);
    setLeaderboardError('');
    fetchLeaderboard({
      branchId: leaderboardBranchId,
      subjectId: leaderboardSubjectId,
      period: leaderboardPeriod === 'weekly' ? 'weekly' : '',
    })
      .then((items) => { if (mounted) setLeaderboard(items); })
      .catch((error) => { if (mounted) setLeaderboardError(error.message || 'Unable to load the leaderboard.'); })
      .finally(() => { if (mounted) setLeaderboardLoading(false); });
    return () => { mounted = false; };
  }, [leaderboardBranchId, leaderboardSubjectId, leaderboardPeriod]);

  useEffect(() => {
    let active = true;
    setLeaderboardSubjectId('');
    if (!leaderboardBranchId) {
      setLeaderboardSubjects([]);
      return () => { active = false; };
    }
    getSubjects({ branchId: leaderboardBranchId })
      .then((items) => { if (active) setLeaderboardSubjects(items); })
      .catch((error) => { if (active) setLeaderboardError(error.message || 'Unable to load subjects.'); });
    return () => { active = false; };
  }, [leaderboardBranchId]);

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
    if (!user?.id) return undefined;
    let mounted = true;
    setDashboardError('');
    Promise.all([getDashboardSummary(), getDashboardPerformance()])
      .then(([summary, performance]) => {
        if (!mounted) return;
        setDashboardSummary(summary);
        setDashboardPerformance(performance);
      })
      .catch((error) => {
        if (mounted) setDashboardError(error.message || 'Unable to load dashboard analytics.');
      });
    return () => { mounted = false; };
  }, [user?.id]);

  useEffect(() => {
    if (!profile || profile?.id !== user?.id) return;
    setProfileForm({
      name: user?.name || '',
      branchId: profile.branch_id || '',
      semester: profile.semester ? String(profile.semester) : '',
    });
  }, [profile, user?.id, user?.name]);

  const handleProfileUpdate = async (event) => {
    event.preventDefault();
    setProfileSaveMessage('');
    setProfileSaving(true);
    try {
      const updates = { name: profileForm.name.trim() };
      if (profileForm.branchId && profileForm.semester) {
        updates.branchId = profileForm.branchId;
        updates.semester = Number(profileForm.semester);
      }
      await updateProfile(updates);
      await refreshProfile();
      setProfileSaveMessage('Profile updated.');
    } catch (error) {
      setProfileSaveMessage(error.message || 'Unable to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

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
  const averageAttemptScore = userAttempts.length
    ? Math.round(userAttempts.reduce((total, attempt) => total + (attempt.percentage ?? (
      attempt.total_questions ? (attempt.score / attempt.total_questions) * 100 : 0
    )), 0) / userAttempts.length)
    : 0;
  const bestAttemptScore = userAttempts.reduce((best, attempt) => (
    Math.max(best, attempt.percentage ?? (attempt.total_questions ? Math.round((attempt.score / attempt.total_questions) * 100) : 0))
  ), 0);
  const userRank = leaderboard.find((entry) => entry.user_id === user?.id)?.rank;
  const analyticsLineData = [...userAttempts].reverse().map((attempt, index) => ({
    name: `${index + 1}`,
    score: attempt.percentage ?? (attempt.total_questions ? Math.round((attempt.score / attempt.total_questions) * 100) : 0),
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

  const handleStartQuiz = async (quiz, questionCount) => {
    if (!user?.id) {
      navigate('/auth', { state: { from: { pathname: '/quizzes' } } });
      return;
    }
    setQuizError('');
    setAttemptSaveError('');
    try {
      const quizId = String(quiz.id || quiz._id);
      const { attempt, quiz: attemptQuiz } = await startQuizAttempt({ quizId, questionCount });
      setAttemptId(attempt.id);
      setAttemptResult(null);
      setCurrentQuiz({
        ...quiz,
        ...attemptQuiz,
        id: quizId,
        questions: attempt.questions,
      });
      setTimeLeft(Math.max(0, Math.ceil((new Date(attempt.expiresAt).getTime() - Date.now()) / 1000)));
      setAnswers(Object.fromEntries(attempt.questions.filter((question) => question.selectedAnswer).map((question) => [
        question.id,
        question.selectedAnswer,
      ])));
      setMarkedForReview(attempt.questions.filter((question) => question.markedForReview).map((question) => question.id));
      setSubmitted(false);
      setResultScore(null);
      setAttemptSaved(false);
      attemptSavingRef.current = false;
      setActiveQuestionIndex(0);
      navigate('/quiz');
    } catch (error) {
      setQuizError(error.message || 'Unable to start this quiz. Please try again.');
    }
  };

  const handleSubmitQuiz = (force = false) => {
    if (submitted) return;
    if (!force && !window.confirm('Submit this quiz now? You will not be able to change your answers.')) return;
    setSubmitted(true);
  };

  useEffect(() => {
    if (!submitted || !user?.id || !attemptId || attemptSavingRef.current) return;
    attemptSavingRef.current = true;
    setAttemptSaving(true);
    submitSavedAttempt(attemptId, answers)
      .then(async (result) => {
        setAttemptResult(result);
        setResultScore(result.correctCount);
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
  }, [answers, attemptId, refreshProfile, submitted, user?.id]);

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
      branchCode: registerForm.branchCode,
      semester: registerForm.semester ? Number(registerForm.semester) : undefined,
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
      setAuthLoading(false);
      return;
    }
    if (details.branchCode && !details.semester) {
      setAuthError('Choose a semester for your selected branch, or clear the branch selection.');
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

  const handleOptionSelect = async (questionId, option) => {
    setAnswers((previous) => ({ ...previous, [questionId]: option || '' }));
    if (!attemptId) return;
    try {
      await saveQuizAnswer({ attemptId, questionId, selectedAnswer: option });
    } catch (error) {
      setAttemptSaveError(`Your answer could not be autosaved: ${error.message}`);
    }
  };

  const handleToggleReview = async (questionId) => {
    const marked = !markedForReview.includes(questionId);
    setMarkedForReview((previous) => (
      marked ? [...previous, questionId] : previous.filter((id) => id !== questionId)
    ));
    if (!attemptId) return;
    try {
      await setQuestionReview({ attemptId, questionId, markedForReview: marked });
    } catch (error) {
      setAttemptSaveError(`Review status could not be saved: ${error.message}`);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const toggleTheme = () => setDarkMode((prev) => !prev);

  const stats = [
    { label: 'Questions', value: formatScaleStat(platformStats?.question_count, 1420) },
    { label: 'Students', value: formatScaleStat(platformStats?.student_count, 350) },
    { label: 'Branches', value: platformStats?.category_count },
    { label: 'Quizzes Attempted', value: formatScaleStat(platformStats?.attempt_count, 5800) },
  ];

  const howItWorks = [
    { title: 'Choose your track', description: 'Start with the engineering branch that fits your goals.', icon: Target },
    { title: 'Find your focus', description: 'Move from semester to subject without losing context.', icon: BookOpen },
    { title: 'Practice with intent', description: 'Build confidence with focused quizzes and mock tests.', icon: Clock3 },
    { title: 'Learn from every try', description: 'Review explanations and use your progress to guide what is next.', icon: Sparkles },
  ];

  const features = [
    { title: 'Syllabus-first practice', description: 'Browse engineering content by branch, semester and subject.', icon: BookOpen },
    { title: 'Focused mock tests', description: 'Practice under a timer and see where you can improve.', icon: Clock3 },
    { title: 'Clear explanations', description: 'Review answers with context instead of memorizing a score.', icon: Sparkles },
    { title: 'Progress that guides you', description: 'Track attempts and choose your next learning goal.', icon: Zap },
    { title: 'Branch leaderboards', description: 'Compare performance across your engineering community.', icon: Target },
    { title: 'A calmer study flow', description: 'Search, practice and review from one organized workspace.', icon: CheckCircle2 },
  ];

  const renderLandingPage = () => (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="container landing-hero-grid">
          <div className="landing-hero-copy">
            <span className="landing-kicker"><span className="landing-kicker-dot" /> Engineering learning, reimagined</span>
            <h1>Your syllabus.<br /><span>Your next breakthrough.</span></h1>
            <p>One focused workspace for engineering practice. Find the right subject, sharpen your understanding, and make every attempt count.</p>
            <div className="landing-hero-actions">
              <button
                className="primary-btn landing-primary-btn"
                onClick={() => {
                  setSelectedCategory('All');
                  navigate('/quizzes');
                }}
              >
                Start practicing <ArrowRight size={17} />
              </button>
              <button className="secondary-btn landing-secondary-btn" onClick={() => navigate('/branches')}>
                Explore branches
              </button>
            </div>
            <div className="landing-proof">
              <span><CheckCircle2 size={15} /> Built around your syllabus</span>
              <span><CheckCircle2 size={15} /> Practice at your pace</span>
            </div>
          </div>
          <div className="landing-hero-art">
            <img src="/quiz.jpg" alt="Glossy red 3D Quiz lettering" />
          </div>
        </div>
      </section>

      <section className="container landing-metrics" aria-label="QuizMaster platform metrics">
        {stats.map((stat) => (
          <div key={stat.label} className="landing-metric-card">
            <strong>{stat.value == null ? '—' : typeof stat.value === 'string' ? stat.value : Number(stat.value).toLocaleString()}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
        {statsError ? <div className="form-message error" role="alert">{statsError}</div> : null}
      </section>

      <section className="container landing-section" id="branches">
        <div className="landing-section-heading">
          <div>
            <span className="landing-kicker">Find your starting point</span>
            <h2>Built for the way <span>engineers learn.</span></h2>
          </div>
          <p>Explore a discipline, then follow your curriculum from semester foundations to specialized topics.</p>
        </div>
        {branchLoadError ? <div className="form-message error" role="alert">{branchLoadError}</div> : null}
        {!branchOptions.length && !branchLoadError ? <div className="landing-empty">Engineering branches are loading or have not been seeded yet.</div> : null}
        <div className="landing-branch-grid">
          {branchOptions.map((branch) => (
            <article key={branch.id} className="landing-branch-card">
              <div className="landing-branch-top">
                <span className="landing-branch-code">{branch.code}</span>
                <ArrowUpRight size={17} />
              </div>
              <h3>{branch.name}</h3>
              <p>{branch.description}</p>
              <div className="landing-branch-metric">
                <strong>{getTypicalSubjectCount(branch)}</strong>
                <span>typical syllabus subjects</span>
              </div>
              <button type="button" className="landing-card-link" onClick={() => navigate('/branches')}>
                Explore curriculum <ArrowRight size={15} />
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-process" id="about">
        <div className="container">
          <div className="landing-section-heading landing-section-heading-centered">
            <div>
              <span className="landing-kicker">A clearer path forward</span>
              <h2>Learn in a loop that <span>works.</span></h2>
            </div>
            <p>Turn a big syllabus into a steady rhythm of practice, feedback and progress.</p>
          </div>
          <div className="landing-step-grid">
            {howItWorks.map((step, index) => {
              const StepIcon = step.icon;
              return (
                <article key={step.title} className="landing-step-card">
                  <div className="landing-step-top"><span>0{index + 1}</span><StepIcon size={18} /></div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container landing-section landing-features-section" id="features">
        <div className="landing-section-heading">
          <div>
            <span className="landing-kicker">Everything in one place</span>
            <h2>Less friction.<br /><span>More understanding.</span></h2>
          </div>
          <p>Useful tools for focused study, without getting in the way of the work.</p>
        </div>
        <div className="landing-feature-grid">
          {features.map((feature) => {
            const FeatureIcon = feature.icon;
            return (
              <article key={feature.title} className="landing-feature-card">
                <span className="landing-feature-icon"><FeatureIcon size={19} /></span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="container landing-cta">
        <div>
          <span className="landing-kicker">Your next session starts here</span>
          <h2>Make progress, one question at a time.</h2>
        </div>
        <button className="primary-btn landing-primary-btn" onClick={() => navigate('/quizzes')}>
          Browse practice <ArrowRight size={17} />
        </button>
      </section>
    </div>
  );

  const renderAuth = () => (
    <section className="auth-shell auth-page container">
      <div className="auth-page-header">
        <Link to="/" className="auth-home-link"><ArrowLeft size={16} /> Back to home</Link>
        <span className="auth-secure-note"><ShieldCheck size={15} /> Secure account access</span>
      </div>

      <div className="auth-card auth-card-modern">
        <div className="auth-side auth-main">
          <div className="auth-brand-line">
            <span className="auth-brand-mark"><Sparkles size={18} /></span>
            <span>QUIZMASTER <i>LEARNING</i></span>
          </div>
          <span className="eyebrow">{authMode === 'login' ? 'Welcome back' : 'Get started'}</span>
          <h1>{authMode === 'login' ? 'Your next breakthrough starts here.' : 'Build your learning streak.'}</h1>
          <p className="auth-intro">
            {authMode === 'login'
              ? 'Sign in to continue practicing, track your progress, and pick up right where you left off.'
              : 'Create your account to explore engineering subjects and make every practice session count.'}
          </p>

          {authError ? <div id="auth-error" className="form-message error" role="alert">{authError}</div> : null}
          {configurationError ? <div className="form-message error" role="alert">{configurationError}</div> : null}
          {authSuccess ? <div className="form-message success" role="status">{authSuccess}</div> : null}

          {authMode === 'login' ? (
            <form className="auth-form auth-form-modern" onSubmit={handleLoginSubmit}>
              <label htmlFor="login-email">Email address</label>
              <div className="auth-input-wrap">
                <Mail size={17} aria-hidden="true" />
                <input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={loginForm.email}
                  autoComplete="email"
                  required
                  aria-describedby={authError ? 'auth-error' : undefined}
                  onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })}
                />
              </div>

              <div className="auth-password-label">
                <label htmlFor="login-password">Password</label>
                <Link className="auth-forgot-link" to="/forgot-password">Forgot password?</Link>
              </div>
              <div className="auth-input-wrap">
                <LockKeyhole size={17} aria-hidden="true" />
                <input
                  id="login-password"
                  type={showLoginPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={loginForm.password}
                  autoComplete="current-password"
                  required
                  aria-describedby={authError ? 'auth-error' : undefined}
                  onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowLoginPassword((previous) => !previous)}
                >
                  {showLoginPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>

              <button type="submit" className="primary-btn full-btn auth-submit-btn" disabled={authLoading}>
                {authLoading ? 'Signing in...' : 'Sign In'}
                {!authLoading ? <ArrowRight size={17} /> : null}
              </button>
            </form>
          ) : (
            <form className="auth-form auth-form-modern auth-register-form" onSubmit={handleRegisterSubmit}>
              <label htmlFor="register-name">Full name</label>
              <input
                id="register-name"
                type="text"
                placeholder="Enter your full name"
                value={registerForm.name}
                autoComplete="name"
                required
                onChange={(event) => setRegisterForm({ ...registerForm, name: event.target.value })}
              />
              <label htmlFor="register-email">Email address</label>
              <input
                id="register-email"
                type="email"
                placeholder="you@example.com"
                value={registerForm.email}
                autoComplete="email"
                required
                onChange={(event) => setRegisterForm({ ...registerForm, email: event.target.value })}
              />
              <label htmlFor="register-branch">Engineering branch (optional)</label>
              <select
                id="register-branch"
                value={registerForm.branchCode}
                onChange={(event) => {
                  const branchCode = event.target.value;
                  setRegisterForm((current) => ({ ...current, branchCode, semester: '' }));
                }}
              >
                <option value="">Choose later</option>
                {registrationBranchOptions.map((branch) => (
                  <option key={branch.code} value={branch.code}>{branch.name}</option>
                ))}
              </select>
              <label htmlFor="register-semester">Semester</label>
              <select
                id="register-semester"
                value={registerForm.semester}
                disabled={!registerForm.branchCode}
                onChange={(event) => setRegisterForm((current) => ({ ...current, semester: event.target.value }))}
              >
                <option value="">{registerForm.branchCode ? 'Select semester' : 'Choose a branch first'}</option>
                {Array.from({ length: 8 }, (_value, index) => index + 1).map((semester) => (
                  <option key={semester} value={semester}>Semester {semester}</option>
                ))}
              </select>
              {branchLoadError ? <div className="form-message error" role="alert">{branchLoadError}</div> : null}
              <label htmlFor="register-password">Password</label>
              <div className="auth-input-wrap">
                <LockKeyhole size={17} aria-hidden="true" />
                <input
                  id="register-password"
                  type={showRegisterPassword ? 'text' : 'password'}
                  placeholder="Create a password"
                  value={registerForm.password}
                  autoComplete="new-password"
                  minLength={6}
                  required
                  onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  aria-label={showRegisterPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowRegisterPassword((previous) => !previous)}
                >
                  {showRegisterPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              <label htmlFor="register-confirm-password">Confirm password</label>
              <input
                id="register-confirm-password"
                type="password"
                placeholder="Confirm your password"
                value={registerForm.confirmPassword}
                autoComplete="new-password"
                required
                aria-invalid={registerPasswordsMismatch}
                aria-describedby={registerPasswordsMismatch ? 'password-match-error' : undefined}
                onChange={(event) => setRegisterForm({ ...registerForm, confirmPassword: event.target.value })}
              />
              {registerPasswordsMismatch ? (
                <p id="password-match-error" className="auth-password-match-error" role="alert">
                  Passwords do not match. Please enter the same password in both fields.
                </p>
              ) : null}
              <button type="submit" className="primary-btn full-btn auth-submit-btn" disabled={authLoading}>
                {authLoading ? 'Creating account...' : 'Create Account'}
                {!authLoading ? <ArrowRight size={17} /> : null}
              </button>
            </form>
          )}

          {!isLocalBackend ? (
            <>
              <div className="divider"><span>or continue with</span></div>
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
            </>
          ) : null}
        </div>

        <aside className="auth-side alt auth-switch-panel auth-promo-panel">
          <div className="auth-promo-orbit"><Sparkles size={23} /></div>
          <div className="switch-box">
            <span className="eyebrow">{authMode === 'login' ? 'New to QuizMaster?' : 'Already have an account?'}</span>
            <h2>{authMode === 'login' ? 'Make every session count.' : 'Welcome back.'}</h2>
            <p>
              {authMode === 'login'
                ? 'Explore focused practice, understand your progress, and build confidence one question at a time.'
                : 'Sign in to return to your courses, saved progress, and next challenge.'}
            </p>
            <div className="auth-promo-benefit"><CheckCircle2 size={16} /> Practice by branch and subject</div>
            <div className="auth-promo-benefit"><CheckCircle2 size={16} /> Keep your progress in one place</div>
            <button
              type="button"
              className="secondary-btn full-btn auth-switch-btn"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setAuthError('');
                setAuthSuccess('');
              }}
            >
              {authMode === 'login' ? 'Create an account' : 'Back to sign in'}
            </button>
          </div>
        </aside>
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
          <span className="mini-badge">
            {branchOptions.find((branch) => branch.id === user?.branchId)?.name || 'Choose an engineering branch'}
          </span>
          <span className="mini-badge">{user?.semester ? `Semester ${user.semester}` : 'Set your semester'}</span>
        </div>
      </div>

      <div className="stats-grid dashboard-stats">
        <div className="stat-card"><label>Quizzes attempted</label><strong>{dashboardSummary?.quizzesAttempted ?? userAttempts.length}</strong></div>
        <div className="stat-card"><label>Average score</label><strong>{dashboardSummary?.averageScore ?? averageAttemptScore}%</strong></div>
        <div className="stat-card"><label>Best score</label><strong>{dashboardSummary?.bestScore ?? bestAttemptScore}%</strong></div>
        <div className="stat-card"><label>Leaderboard Rank</label><strong>{userRank ? `#${userRank}` : '—'}</strong></div>
        <div className="stat-card"><label>Learning time</label><strong>{formatTime(dashboardSummary?.totalLearningTime || 0)}</strong></div>
      </div>
      {dashboardError ? <div className="form-message error" role="alert">{dashboardError}</div> : null}
      {attemptsError ? <div className="form-message error">{attemptsError}</div> : null}
      {quizError ? <div className="form-message error">{quizError}</div> : null}

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
                  <span>{item.percentage ?? (item.total_questions ? Math.round((item.score / item.total_questions) * 100) : 0)}%</span>
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
          <h3>Subject performance</h3>
        </div>
        <div className="subject-performance-grid">
          {(dashboardPerformance?.subjectPerformance || []).map((item) => (
            <div className="subject-performance-card" key={item.subject}>
              <strong>{item.subject}</strong>
              <span>{item.averagePercentage}% average</span>
              <small>{item.quizzes} attempts · {item.accuracy}% accuracy</small>
            </div>
          ))}
          {!dashboardPerformance?.subjectPerformance?.length ? (
            <p className="muted">Complete a subject quiz to see your progress here.</p>
          ) : null}
        </div>
        {dashboardPerformance?.weakTopics?.length ? (
          <div className="weak-topics">
            <h4>Topics to review</h4>
            {dashboardPerformance.weakTopics.map((topic) => (
              <span className="topic-chip" key={topic.topicId}>{topic.topic} · {topic.misses} missed</span>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );

  const renderQuizSelection = () => (
    <PracticePage
      onStartQuiz={handleStartQuiz}
      searchTerm={searchTerm}
      category={selectedCategory === 'All' ? '' : selectedCategory}
    />
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
            <div className="score-box">
              Answered: {Object.values(answers).filter(Boolean).length}/{totalQuestions}
              {markedForReview.length ? ` · Review: ${markedForReview.length}` : ''}
            </div>
          </div>
        </div>
        {attemptSaveError ? <div className="form-message error" role="alert">{attemptSaveError}</div> : null}

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
            <button
              className={`secondary-btn full-btn ${markedForReview.includes(question.id) ? 'selected' : ''}`}
              onClick={() => handleToggleReview(question.id)}
            >
              {markedForReview.includes(question.id) ? 'Remove review mark' : 'Mark for review'}
            </button>
            <button className="primary-btn full-btn" onClick={() => handleSubmitQuiz()}>
              Submit Quiz
            </button>
          </aside>
        </div>
      </section>
    );
  };

  const renderResults = () => {
    const safeTotal = Math.max(totalQuestions, 1);
    const percentage = attemptResult?.percentage ?? Math.round((score / safeTotal) * 100);
    const correct = attemptResult?.correctCount ?? score;
    const wrong = attemptResult?.incorrectCount ?? Math.max(0, totalQuestions - score - (attemptResult?.unansweredCount || 0));
    const unanswered = attemptResult?.unansweredCount ?? Math.max(0, totalQuestions - correct - wrong);
    const totalMarks = attemptResult?.totalMarks ?? currentQuiz.totalMarks ?? totalQuestions;

    return (
      <section className="container result-page">
        <div className="result-card panel-box">
          <span className="eyebrow">Quiz Completed!</span>
          <h2>Score: {attemptResult ? attemptResult.score : score} / {totalMarks}</h2>
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
            <div><label>Unanswered</label><strong>{unanswered}</strong></div>
            <div><label>Percentage</label><strong>{percentage}%</strong></div>
            <div><label>Time Taken</label><strong>{formatTime((currentQuiz.timeLimit * 60) - timeLeft)}</strong></div>
          </div>
          <p className="result-status">Performance: <span>{percentage >= 80 ? 'Excellent!' : percentage >= 60 ? 'Good work!' : 'Keep practicing!'}</span></p>
          {attemptSaving ? <p className="form-message">Saving your result...</p> : null}
          {attemptSaved ? <p className="form-message success">Your result has been saved.</p> : null}
          {attemptSaveError ? <div className="form-message error">{attemptSaveError}</div> : null}
          {attemptResult?.review?.length ? (
            <div className="answer-review-list">
              <h3>Answer review</h3>
              {attemptResult.review.map((item, index) => (
                <article className={`answer-review-item ${item.isCorrect ? 'correct' : 'incorrect'}`} key={item.questionId}>
                  <strong>{index + 1}. {item.question}</strong>
                  <span>Your answer: {item.selectedAnswer || 'Not answered'}</span>
                  {!item.isCorrect ? <span>Correct answer: {item.correctAnswer}</span> : null}
                  {item.explanation ? <p>{item.explanation}</p> : null}
                </article>
              ))}
            </div>
          ) : null}
          <div className="result-actions">
            <button className="primary-btn" onClick={() => handleStartQuiz(currentQuiz)}>Try Again</button>
            <button className="secondary-btn" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
            <button className="secondary-btn" onClick={() => navigate('/quizzes')}>More practice</button>
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
        <h2>Engineering learning rankings</h2>
      </div>

      <div className="leaderboard-filters panel-box">
        <label>
          Branch
          <select value={leaderboardBranchId} onChange={(event) => {
            setLeaderboardBranchId(event.target.value);
            setLeaderboardSubjectId('');
          }}>
            <option value="">All branches</option>
            {branchOptions.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        </label>
        <label>
          Subject
          <select value={leaderboardSubjectId} disabled={!leaderboardBranchId} onChange={(event) => setLeaderboardSubjectId(event.target.value)}>
            <option value="">All subjects</option>
            {leaderboardSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
        </label>
        <label>
          Period
          <select value={leaderboardPeriod} onChange={(event) => setLeaderboardPeriod(event.target.value)}>
            <option value="all">All time</option>
            <option value="weekly">Last 7 days</option>
          </select>
        </label>
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

        <form className="profile-preferences-form" onSubmit={handleProfileUpdate}>
          <div className="section-heading">
            <span className="eyebrow">Learning profile</span>
            <h3>Personalize your study path</h3>
          </div>
          <div className="profile-preferences-grid">
            <label>
              Name
              <input
                value={profileForm.name}
                onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })}
                minLength={2}
                maxLength={80}
                required
              />
            </label>
            <label>
              Branch
              <select
                value={profileForm.branchId}
                onChange={(event) => setProfileForm({ ...profileForm, branchId: event.target.value, semester: '' })}
              >
                <option value="">Keep current branch</option>
                {branchOptions.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </label>
            <label>
              Semester
              <select
                value={profileForm.semester}
                disabled={!profileForm.branchId}
                onChange={(event) => setProfileForm({ ...profileForm, semester: event.target.value })}
              >
                <option value="">Choose semester</option>
                {Array.from({ length: 8 }, (_value, index) => index + 1).map((semester) => (
                  <option key={semester} value={semester}>Semester {semester}</option>
                ))}
              </select>
            </label>
          </div>
          {profileSaveMessage ? <div className={`form-message ${profileSaveMessage === 'Profile updated.' ? 'success' : 'error'}`} role="status">{profileSaveMessage}</div> : null}
          <button type="submit" className="primary-btn" disabled={profileSaving}>
            {profileSaving ? 'Saving...' : 'Save profile'}
          </button>
        </form>

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
            <Route path="/forgot-password" element={<PasswordResetPage />} />
            <Route path="/reset-password" element={<PasswordResetPage reset />} />
            <Route path="/dashboard" element={<RequireAuth>{renderDashboard()}</RequireAuth>} />
            <Route path="/branches" element={<BranchesPage />} />
            <Route path="/mock-tests" element={<PracticePage onStartQuiz={handleStartQuiz} mode="mock" searchTerm={searchTerm} />} />
            <Route path="/categories" element={<BranchesPage />} />
            <Route path="/quizzes" element={renderQuizSelection()} />
            <Route path="/quiz" element={<RequireAuth>{submitted ? renderResults() : renderQuiz()}</RequireAuth>} />
            <Route path="/analytics" element={<RequireAuth>{renderAnalytics()}</RequireAuth>} />
            <Route path="/leaderboard" element={renderLeaderboard()} />
            <Route path="/profile" element={<RequireAuth>{renderProfile()}</RequireAuth>} />
            <Route path="/admin" element={<RequireAuth><AdminPanel /></RequireAuth>} />
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
