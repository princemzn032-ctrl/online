import express from 'express';
import Category from '../models/Category.js';
import Quiz from '../models/Quiz.js';
import Result from '../models/Result.js';
import User from '../models/User.js';

const router = express.Router();

router.get('/stats', async (_req, res) => {
  try {
    const [categories, quizzes, users, results] = await Promise.all([
      Category.find().select('name').lean(),
      Quiz.find({ isPublished: true }).select('questions').lean(),
      User.countDocuments(),
      Result.countDocuments(),
    ]);
    const questionCount = quizzes.reduce((count, quiz) => count + quiz.questions.length, 0);
    return res.json({
      question_count: questionCount,
      student_count: users,
      category_count: categories.length,
      attempt_count: results,
    });
  } catch (error) {
    console.error('Platform statistics failed:', error.message);
    return res.status(500).json({ message: 'Unable to load platform statistics.' });
  }
});

router.get('/leaderboard', async (_req, res) => {
  try {
    const results = await Result.find()
      .populate('userId', 'name profileImage')
      .lean();
    const scores = new Map();

    results.forEach((result) => {
      if (!result.userId) return;
      const id = String(result.userId._id);
      const entry = scores.get(id) || {
        user_id: id,
        username: result.userId.name,
        avatar_url: result.userId.profileImage || null,
        total_score: 0,
        quizzes: 0,
        correct: 0,
        questions: 0,
      };
      entry.total_score += result.score;
      entry.quizzes += 1;
      entry.correct += result.correctAnswers;
      entry.questions += result.correctAnswers + result.wrongAnswers;
      scores.set(id, entry);
    });

    const leaderboard = [...scores.values()]
      .sort((left, right) => right.total_score - left.total_score)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
        accuracy: entry.questions ? Math.round((entry.correct / entry.questions) * 100) : 0,
      }));
    return res.json(leaderboard);
  } catch (error) {
    console.error('Leaderboard fetch failed:', error.message);
    return res.status(500).json({ message: 'Unable to load the leaderboard.' });
  }
});

export default router;
