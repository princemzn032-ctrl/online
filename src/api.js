const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const request = async (path, options = {}) => {
  const token = localStorage.getItem('quiz-token');
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
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

export const submitResult = (result) => request('/api/results', {
  method: 'POST',
  body: JSON.stringify(result),
});