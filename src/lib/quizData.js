import { supabase } from './supabaseClient';
import {
  getCategories,
  getLeaderboard,
  getPlatformStats,
  getQuizzes,
  getUserAttempts,
  submitQuizAttempt,
} from '../api';
import { isLocalBackend } from './appMode';

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Copy .env.example to .env and add your project URL and anon key.');
  }
  return supabase;
}

export async function fetchCategories() {
  if (isLocalBackend) {
    const categories = await getCategories();
    return categories.map((category) => ({
      ...category,
      id: category.id || category._id,
    }));
  }
  const client = requireSupabase();
  const { data, error } = await client
    .from('categories')
    .select('id, name, description, icon, quizzes(id, difficulty, questions(id))')
    .order('name');
  if (error) throw error;

  return data.map((category) => {
    const quizzes = category.quizzes || [];
    return {
      ...category,
      questionCount: quizzes.reduce((count, quiz) => count + (quiz.questions?.length || 0), 0),
      quizCount: quizzes.length,
      difficulty: quizzes[0]?.difficulty || 'Mixed',
    };
  });
}

export async function fetchQuizzes() {
  if (isLocalBackend) {
    const quizzes = await getQuizzes();
    return quizzes.map((quiz) => ({
      ...quiz,
      id: quiz.id || quiz._id,
      _id: quiz._id || quiz.id,
      questions: (quiz.questions || []).map((question) => ({
        ...question,
        id: question.id || question._id,
      })),
    }));
  }
  const client = requireSupabase();
  const { data, error } = await client
    .from('quizzes')
    .select('id, title, description, category_id, difficulty, time_limit, created_at, categories(name), questions(id, question_text, options)')
    .order('created_at', { ascending: false });
  if (error) throw error;

  return data.map((quiz) => {
    const questions = (quiz.questions || []).map((question) => ({
      id: question.id,
      question: question.question_text,
      options: question.options,
    }));
    return {
      id: quiz.id,
      _id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      categoryId: quiz.category_id,
      category: quiz.categories?.name || 'Uncategorized',
      difficulty: quiz.difficulty,
      timeLimit: quiz.time_limit,
      totalMarks: questions.length,
      questions,
    };
  });
}

export async function fetchLeaderboard(filters = {}) {
  if (isLocalBackend) return getLeaderboard(filters);
  if (filters.branchId || filters.period === 'weekly') {
    throw new Error('Branch and weekly leaderboard filters require the local engineering backend.');
  }
  const client = requireSupabase();
  const { data, error } = await client
    .from('leaderboard')
    .select('user_id, username, avatar_url, total_score, rank, quizzes, accuracy')
    .order('rank');
  if (error) throw error;
  return data;
}

export async function fetchPlatformStats() {
  if (isLocalBackend) return getPlatformStats();
  const client = requireSupabase();
  const { data, error } = await client
    .from('platform_stats')
    .select('question_count, student_count, category_count, attempt_count')
    .single();
  if (error) throw error;
  return data;
}

export async function fetchUserAttempts(userId) {
  if (isLocalBackend) return getUserAttempts(userId);
  const client = requireSupabase();
  const { data, error } = await client
    .from('attempts')
    .select('id, score, total_questions, time_taken, created_at, quizzes(title, categories(name))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function saveAttempt({ quizId, answers, timeTaken }) {
  if (isLocalBackend) {
    return submitQuizAttempt({ quizId, answers, timeTaken });
  }
  const client = requireSupabase();
  const { data, error } = await client.rpc('submit_quiz_attempt', {
    p_quiz_id: quizId,
    p_answers: answers,
    p_time_taken: timeTaken,
  });
  if (error) throw error;
  if (!data?.length) throw new Error('The database did not return a quiz result.');
  return data[0];
}
