import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import Result from '../models/Result.js';
import Quiz from '../models/Quiz.js';
import User from '../models/User.js';

const router = express.Router();

const submitQuizAnswers = async (req, res) => {
  const { quizId, answers, timeTaken } = req.body || {};
  if (!quizId || !answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return res.status(400).json({ message: 'A quiz and its submitted answers are required.' });
  }

  try {
    const quiz = await Quiz.findOne({ _id: quizId, isPublished: true }).lean();
    if (!quiz || quiz.questions.length === 0) {
      return res.status(404).json({ message: 'Quiz not found or it has no questions.' });
    }

    const correctAnswers = quiz.questions.reduce((count, question) => (
      count + (answers[String(question._id)] === question.correctAnswer ? 1 : 0)
    ), 0);
    const totalQuestions = quiz.questions.length;
    const duration = Number.isInteger(timeTaken) && timeTaken >= 0 ? timeTaken : 0;
    const result = await Result.create({
      userId: req.user.id,
      quizId: quiz._id,
      score: correctAnswers,
      percentage: Math.round((correctAnswers / totalQuestions) * 100),
      correctAnswers,
      wrongAnswers: totalQuestions - correctAnswers,
      timeTaken: duration,
    });
    await User.updateOne({ _id: req.user.id }, { $inc: { points: correctAnswers } });

    return res.status(201).json({
      id: String(result._id),
      score: correctAnswers,
      total_questions: totalQuestions,
      percentage: result.percentage,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid quiz identifier.' });
    }
    console.error('Quiz result submission failed:', error.message);
    return res.status(500).json({ message: 'Unable to save this quiz result.' });
  }
};

router.post('/', protect, submitQuizAnswers);
router.post('/submit', protect, submitQuizAnswers);

router.get('/me', protect, async (req, res) => {
  try {
    const results = await Result.find({ userId: req.user.id })
      .populate('quizId', 'title category')
      .sort({ completedAt: -1 })
      .lean();
    return res.json(results.map((result) => ({
      id: String(result._id),
      score: result.score,
      total_questions: result.correctAnswers + result.wrongAnswers + (result.unansweredAnswers || 0),
      percentage: result.percentage,
      earned_marks: result.earnedMarks ?? result.score,
      total_marks: result.totalMarks || result.correctAnswers + result.wrongAnswers,
      time_taken: result.timeTaken,
      created_at: result.completedAt,
      quizzes: result.quizId ? {
        title: result.quizId.title,
        categories: { name: result.quizId.category },
      } : null,
    })));
  } catch (error) {
    console.error('Quiz history fetch failed:', error.message);
    return res.status(500).json({ message: 'Unable to load quiz history.' });
  }
});

router.get('/', protect, async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
  try {
    const results = await Result.find({ userId: req.user.id })
      .populate('quizId', 'title category')
      .sort({ completedAt: -1 })
      .limit(limit)
      .lean();
    return res.json(results.map((result) => ({
      id: String(result._id),
      score: result.score,
      percentage: result.percentage,
      correctAnswers: result.correctAnswers,
      wrongAnswers: result.wrongAnswers,
      unansweredAnswers: result.unansweredAnswers || 0,
      earnedMarks: result.earnedMarks ?? result.score,
      totalMarks: result.totalMarks || result.correctAnswers + result.wrongAnswers,
      timeTaken: result.timeTaken,
      completedAt: result.completedAt,
      quiz: result.quizId ? { id: String(result.quizId._id), title: result.quizId.title, subject: result.quizId.category } : null,
    })));
  } catch (error) {
    console.error('Result list fetch failed:', error.message);
    return res.status(500).json({ message: 'Unable to load quiz results.' });
  }
});

router.get('/:resultId', protect, async (req, res) => {
  try {
    const result = await Result.findOne({ _id: req.params.resultId, userId: req.user.id })
      .populate('quizId', 'title category')
      .lean();
    if (!result) return res.status(404).json({ message: 'Quiz result not found.' });
    return res.json({
      id: String(result._id),
      quiz: result.quizId ? { title: result.quizId.title, subject: result.quizId.category } : null,
      score: result.earnedMarks ?? result.score,
      totalMarks: result.totalMarks || result.correctAnswers + result.wrongAnswers,
      percentage: result.percentage,
      correctAnswers: result.correctAnswers,
      wrongAnswers: result.wrongAnswers,
      unansweredAnswers: result.unansweredAnswers || 0,
      timeTaken: result.timeTaken,
      completedAt: result.completedAt,
      review: result.answerReview || [],
    });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid result identifier.' });
    console.error('Result fetch failed:', error.message);
    return res.status(500).json({ message: 'Unable to load quiz result.' });
  }
});

export default router;