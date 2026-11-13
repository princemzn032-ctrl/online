const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const request = async (path, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (response.headers.get('X-QuizMaster-Offline') === 'true') {
      throw Object.assign(new Error('QuizMaster is temporarily unavailable. Please try again in a moment.'), {
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

  const responseBody = await response.text();
  let data = {};
  if (responseBody) {
    try {
      data = JSON.parse(responseBody);
    } catch {
      data = { message: responseBody };
    }
  }
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

export const logout = () => request('/api/auth/logout', { method: 'POST' });

export const register = (details) => request('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify(details),
});

export const requestPasswordReset = (email) => request('/api/auth/forgot-password', {
  method: 'POST',
  body: JSON.stringify({ email }),
});

export const resetPassword = ({ token, password }) => request('/api/auth/reset-password', {
  method: 'POST',
  body: JSON.stringify({ token, password }),
});

function toQueryString(parameters = {}) {
  const query = new URLSearchParams();
  Object.entries(parameters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  return query.toString();
}

export const getQuizzes = (filters = {}) => {
  const query = toQueryString(filters);
  return request(`/api/quizzes${query ? `?${query}` : ''}`);
};

export const getCategories = () => request('/api/categories');

export const getBranches = () => request('/api/branches');

export const getSemesters = (branchId) => {
  const query = toQueryString({ branchId });
  return request(`/api/semesters${query ? `?${query}` : ''}`);
};

export const getSubjects = (filters = {}) => {
  const query = toQueryString(filters);
  return request(`/api/subjects${query ? `?${query}` : ''}`);
};

export const getTopics = (subjectId) => request(`/api/subjects/${encodeURIComponent(subjectId)}/topics`);

export const getLeaderboard = (filters = {}) => {
  const query = toQueryString(filters);
  return request(`/api/leaderboard${query ? `?${query}` : ''}`);
};

export const getPlatformStats = () => request('/api/platform/stats');

export const getDashboardSummary = () => request('/api/dashboard/summary');

export const getDashboardPerformance = () => request('/api/dashboard/performance');

export const getUserAttempts = () => request('/api/results/me');

export const getProfile = () => request('/api/users/profile');

export const updateProfile = (profile) => request('/api/users/profile', {
  method: 'PATCH',
  body: JSON.stringify(profile),
});

export const submitQuizAttempt = (attempt) => request('/api/results/submit', {
  method: 'POST',
  body: JSON.stringify(attempt),
});

export const startQuizAttempt = ({ quizId, questionCount }) => request('/api/attempts/start', {
  method: 'POST',
  body: JSON.stringify({ quizId, questionCount }),
});

export const saveQuizAnswer = ({ attemptId, questionId, selectedAnswer }) => request(`/api/attempts/${encodeURIComponent(attemptId)}/answer`, {
  method: 'POST',
  body: JSON.stringify({ questionId, selectedAnswer }),
});

export const setQuestionReview = ({ attemptId, questionId, markedForReview }) => request(`/api/attempts/${encodeURIComponent(attemptId)}/review`, {
  method: 'POST',
  body: JSON.stringify({ questionId, markedForReview }),
});

export const submitSavedAttempt = (attemptId, answers) => request(`/api/attempts/${encodeURIComponent(attemptId)}/submit`, {
  method: 'POST',
  body: JSON.stringify({ answers }),
});

export const sendChatMessage = (message) => request('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ message }),
});

export const getAdminUsers = () => request('/api/admin/users');

export const getAdminDashboard = () => request('/api/admin/dashboard');

export const getAdminQuizzes = () => request('/api/admin/quizzes');

export const getAdminAttempts = () => request('/api/admin/attempts');

export const addQuizQuestion = (quizId, question) => request(`/api/admin/quizzes/${encodeURIComponent(quizId)}/questions`, {
  method: 'POST',
  body: JSON.stringify(question),
});

export const importQuestionsCsv = (quizId, csv) => request('/api/admin/questions/import', {
  method: 'POST',
  body: JSON.stringify({ quizId, csv }),
});

export const createQuiz = (details) => request('/api/quizzes', {
  method: 'POST',
  body: JSON.stringify(details),
});

export const updateQuiz = (quizId, details) => request(`/api/quizzes/${encodeURIComponent(quizId)}`, {
  method: 'PUT',
  body: JSON.stringify(details),
});

export const archiveQuiz = (quizId) => request(`/api/quizzes/${encodeURIComponent(quizId)}`, {
  method: 'DELETE',
});

export const updateQuizQuestion = (quizId, questionId, details) => request(`/api/admin/quizzes/${encodeURIComponent(quizId)}/questions/${encodeURIComponent(questionId)}`, {
  method: 'PUT',
  body: JSON.stringify(details),
});

export const deleteQuizQuestion = (quizId, questionId) => request(`/api/admin/quizzes/${encodeURIComponent(quizId)}/questions/${encodeURIComponent(questionId)}`, {
  method: 'DELETE',
});

export const createBranch = (details) => request('/api/branches', {
  method: 'POST',
  body: JSON.stringify(details),
});

export const deactivateBranch = (branchId) => request(`/api/branches/${encodeURIComponent(branchId)}`, {
  method: 'DELETE',
});

export const createSemester = (details) => request('/api/semesters', {
  method: 'POST',
  body: JSON.stringify(details),
});

export const createSubject = (details) => request('/api/subjects', {
  method: 'POST',
  body: JSON.stringify(details),
});

export const deactivateSubject = (subjectId) => request(`/api/subjects/${encodeURIComponent(subjectId)}`, {
  method: 'DELETE',
});

export const createTopic = (details) => request('/api/topics', {
  method: 'POST',
  body: JSON.stringify(details),
});

export const updateTopic = (topicId, details) => request(`/api/topics/${encodeURIComponent(topicId)}`, {
  method: 'PUT',
  body: JSON.stringify(details),
});

export const deleteTopic = (topicId) => request(`/api/topics/${encodeURIComponent(topicId)}`, {
  method: 'DELETE',
});
