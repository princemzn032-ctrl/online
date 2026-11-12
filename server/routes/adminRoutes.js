import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import Quiz from '../models/Quiz.js';
import Category from '../models/Category.js';
import Branch from '../models/Branch.js';
import Result from '../models/Result.js';
import { parse } from 'csv-parse/sync';

const questionFields = [
  'question', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer',
];

function validateQuestion(question) {
  if (typeof question.question !== 'string' || !question.question.trim()) return 'Question text is required.';
  if (!Array.isArray(question.options) || question.options.length !== 4 || question.options.some((option) => typeof option !== 'string' || !option.trim())) {
    return 'Each question must have four non-empty options.';
  }
  if (!question.options.includes(question.correctAnswer)) return 'Correct answer must match one of the options.';
  if (question.marks !== undefined && (!Number.isFinite(question.marks) || question.marks < 0)) return 'Marks cannot be negative.';
  if (question.negativeMarks !== undefined && (!Number.isFinite(question.negativeMarks) || question.negativeMarks < 0)) return 'Negative marks cannot be less than zero.';
  if (question.difficulty && !['Easy', 'Medium', 'Hard'].includes(question.difficulty)) return 'Difficulty must be Easy, Medium or Hard.';
  return '';
}

function serializeAdminQuiz(quiz) {
  return {
    id: String(quiz._id),
    title: quiz.title,
    category: quiz.category,
    isPublished: quiz.isPublished,
    questions: quiz.questions.map((question) => ({
      id: String(question._id),
      question: question.question,
      options: question.options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      difficulty: question.difficulty,
      marks: question.marks,
      negativeMarks: question.negativeMarks,
      source: question.source,
      status: question.status,
    })),
  };
}

const router = express.Router();

router.use(protect, adminOnly);

router.get('/dashboard', async (req, res) => {
  try {
    const [users, quizzes, categories, branches, results] = await Promise.all([
      User.countDocuments(),
      Quiz.countDocuments({ isPublished: true }),
      Category.countDocuments(),
      Branch.countDocuments({ isActive: true }),
      Result.find().select('percentage').lean(),
    ]);
    const averageScore = results.length
      ? Math.round(results.reduce((total, result) => total + result.percentage, 0) / results.length)
      : 0;
    return res.json({ users, quizzes, categories, branches, attempts: results.length, averageScore });
  } catch (error) {
    console.error('Admin dashboard failed:', error.message);
    return res.status(500).json({ message: 'Unable to load admin analytics.' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const users = await User.find()
      .select('name email role createdAt lastLoginAt')
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();
    return res.json(users);
  } catch (error) {
    console.error('Admin user list failed:', error.message);
    return res.status(500).json({ message: 'Unable to fetch registered users.' });
  }
});

router.post('/categories', async (req, res) => {
  if (typeof req.body?.name !== 'string' || !req.body.name.trim()) {
    return res.status(400).json({ message: 'Category name is required.' });
  }
  try {
    const category = await Category.create({
      name: req.body.name.trim(),
      description: typeof req.body.description === 'string' ? req.body.description.trim() : '',
      icon: typeof req.body.icon === 'string' ? req.body.icon : '📚',
    });
    return res.status(201).json(category);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'That category already exists.' });
    console.error('Category creation failed:', error.message);
    return res.status(400).json({ message: 'Unable to create category.' });
  }
});

router.get('/quizzes', async (_req, res) => {
  try {
    const quizzes = await Quiz.find().sort({ createdAt: -1 }).limit(200).lean();
    return res.json(quizzes.map(serializeAdminQuiz));
  } catch (error) {
    console.error('Admin quiz list failed:', error.message);
    return res.status(500).json({ message: 'Unable to load quiz bank.' });
  }
});

router.get('/attempts', async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
  try {
    const attempts = await Result.find()
      .populate('userId', 'name email')
      .populate('quizId', 'title category')
      .sort({ completedAt: -1 })
      .limit(limit)
      .lean();
    return res.json(attempts.map((attempt) => ({
      id: String(attempt._id),
      student: attempt.userId ? { name: attempt.userId.name, email: attempt.userId.email } : null,
      quiz: attempt.quizId ? { title: attempt.quizId.title, subject: attempt.quizId.category } : null,
      score: attempt.earnedMarks ?? attempt.score,
      totalMarks: attempt.totalMarks || attempt.correctAnswers + attempt.wrongAnswers,
      percentage: attempt.percentage,
      completedAt: attempt.completedAt,
    })));
  } catch (error) {
    console.error('Admin attempt list failed:', error.message);
    return res.status(500).json({ message: 'Unable to load quiz attempts.' });
  }
});

router.post('/quizzes/:quizId/questions', async (req, res) => {
  const question = req.body || {};
  const validationError = validateQuestion(question);
  if (validationError) return res.status(400).json({ message: validationError });
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found.' });
    quiz.questions.push({
      ...question,
      question: question.question.trim(),
      options: question.options.map((option) => option.trim()),
      explanation: typeof question.explanation === 'string' ? question.explanation.trim() : '',
      source: typeof question.source === 'string' ? question.source.trim() : 'admin-authored',
      status: question.status === 'published' ? 'published' : 'draft',
      marks: question.marks ?? 1,
      negativeMarks: question.negativeMarks ?? 0,
    });
    quiz.totalMarks = quiz.questions.reduce((total, item) => total + (item.marks || 0), 0);
    await quiz.save();
    return res.status(201).json(serializeAdminQuiz(quiz));
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid quiz identifier.' });
    console.error('Admin question creation failed:', error.message);
    return res.status(400).json({ message: 'Unable to create question.' });
  }
});

router.put('/quizzes/:quizId/questions/:questionId', async (req, res) => {
  const updates = req.body || {};
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found.' });
    const question = quiz.questions.id(req.params.questionId);
    if (!question) return res.status(404).json({ message: 'Question not found.' });
    const candidate = { ...question.toObject(), ...updates };
    const validationError = validateQuestion(candidate);
    if (validationError) return res.status(400).json({ message: validationError });
    ['question', 'options', 'correctAnswer', 'explanation', 'difficulty', 'marks', 'negativeMarks', 'topicId', 'source', 'status'].forEach((field) => {
      if (updates[field] !== undefined) question[field] = updates[field];
    });
    await quiz.save();
    return res.json(serializeAdminQuiz(quiz));
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid quiz or question identifier.' });
    console.error('Admin question update failed:', error.message);
    return res.status(400).json({ message: 'Unable to update question.' });
  }
});

router.delete('/quizzes/:quizId/questions/:questionId', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found.' });
    const question = quiz.questions.id(req.params.questionId);
    if (!question) return res.status(404).json({ message: 'Question not found.' });
    question.deleteOne();
    quiz.totalMarks = quiz.questions.reduce((total, item) => total + (item.marks || 0), 0);
    await quiz.save();
    return res.status(204).end();
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid quiz or question identifier.' });
    console.error('Admin question deletion failed:', error.message);
    return res.status(500).json({ message: 'Unable to delete question.' });
  }
});

router.post('/questions/import', async (req, res) => {
  const { quizId, csv } = req.body || {};
  if (typeof quizId !== 'string' || typeof csv !== 'string' || !csv.trim()) {
    return res.status(400).json({ message: 'A quiz and CSV content are required.' });
  }
  if (Buffer.byteLength(csv, 'utf8') > 900_000) {
    return res.status(413).json({ message: 'CSV import must be smaller than 900 KB.' });
  }
  try {
    const rows = parse(csv, {
      bom: true,
      columns: (headers) => headers.map((header) => header.trim().toLowerCase()),
      skip_empty_lines: true,
      trim: true,
      max_record_size: 10_000,
    });
    if (!rows.length || rows.length > 500) {
      return res.status(400).json({ message: 'Import between 1 and 500 question rows at a time.' });
    }
    const requiredColumns = ['question', 'optiona', 'optionb', 'optionc', 'optiond', 'correctanswer'];
    const missingColumns = requiredColumns.filter((column) => !Object.hasOwn(rows[0], column));
    if (missingColumns.length) {
      return res.status(400).json({ message: `CSV is missing required columns: ${missingColumns.join(', ')}.` });
    }
    const questions = rows.map((row) => ({
      question: row.question,
      options: [row.optiona, row.optionb, row.optionc, row.optiond],
      correctAnswer: row.correctanswer,
      explanation: row.explanation || '',
      difficulty: row.difficulty || 'Medium',
      marks: row.marks ? Number(row.marks) : 1,
      negativeMarks: row.negativemarks ? Number(row.negativemarks) : 0,
      topicId: row.topicid || null,
      source: row.source || 'admin-csv-import',
      status: 'draft',
    }));
    const validationError = questions.map(validateQuestion).find(Boolean);
    if (validationError) return res.status(400).json({ message: validationError });

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found.' });
    const existing = new Set(quiz.questions.map((question) => question.question.trim().toLowerCase()));
    const uniqueQuestions = questions.filter((question) => {
      const normalizedQuestion = question.question.trim().toLowerCase();
      if (existing.has(normalizedQuestion)) return false;
      existing.add(normalizedQuestion);
      return true;
    });
    if (!uniqueQuestions.length) return res.status(200).json({ imported: 0, duplicates: questions.length });
    quiz.questions.push(...uniqueQuestions);
    quiz.totalMarks = quiz.questions.reduce((total, question) => total + (question.marks || 0), 0);
    await quiz.save();
    return res.status(201).json({ imported: uniqueQuestions.length, duplicates: questions.length - uniqueQuestions.length });
  } catch (error) {
    if (error.name === 'CsvError') return res.status(400).json({ message: 'The CSV file could not be parsed. Check quoting and column format.' });
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid quiz or topic identifier.' });
    console.error('CSV question import failed:', error.message);
    return res.status(500).json({ message: 'Unable to import questions.' });
  }
});

export default router;
