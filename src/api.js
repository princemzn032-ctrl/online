const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const request = async (path, options = {}) => {
  const token = localStorage.getItem('quiz-token');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    if (response.headers.get('X-QuizMaster-Offline') === 'true') {
      throw Object.assign(new Error('The QuizMaster backend is offline. Connect MongoDB and start the server to sign in.'), {
        code: 'NETWORK_ERROR',
      });
    }
  } catch (error) {
    if (error.code === 'NETWORK_ERROR') throw error;
    if (error.name === 'AbortError') {
      throw Object.assign(new Error('The server request timed out.'), { code: 'REQUEST_TIMEOUT' });
    }
    throw Object.assign(new Error('Unable to connect to the QuizMaster server.'), { code: 'NETWORK_ERROR' });
  } finally {
    clearTimeout(timeout);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(data.message || data.error || 'Request failed'), {
      code: response.status >= 500 ? 'SERVER_ERROR' : 'HTTP_ERROR',
      status: response.status,
    });
  }

  return data;
};

export const login = (credentials) => request('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify(credentials),
});

export const register = (details) => request('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify(details),
});

export const getQuizzes = () => request('/api/quizzes');

export const getCategories = () => request('/api/categories');

export const getLeaderboard = () => request('/api/platform/leaderboard');

export const getPlatformStats = () => request('/api/platform/stats');

export const getUserAttempts = () => request('/api/results/me');

export const getProfile = () => request('/api/users/profile');

export const submitQuizAttempt = (attempt) => request('/api/results/submit', {
  method: 'POST',
  body: JSON.stringify(attempt),
});

export const sendChatMessage = (message) => request('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ message }),
});

export const getAdminUsers = () => request('/api/admin/users');
