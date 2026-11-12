import express from 'express';
import { adminOnly, protect } from '../middleware/authMiddleware.js';
import Quiz from '../models/Quiz.js';

const router = express.Router();
const difficulties = new Set(['Easy', 'Medium', 'Hard']);
const quizTypes = new Set(['practice', 'mock']);

const serializeQuiz = (quiz) => ({
  id: String(quiz._id),
  title: quiz.title,
  description: quiz.description,
  category: quiz.category,
  branchId: quiz.branchId ? String(quiz.branchId) : '',
  semesterId: quiz.semesterId ? String(quiz.semesterId) : '',
  subjectId: quiz.subjectId ? String(quiz.subjectId) : '',
  topicId: quiz.topicId ? String(quiz.topicId) : '',
  difficulty: quiz.difficulty,
  timeLimit: quiz.timeLimit,
  quizType: quiz.quizType || 'practice',
  questionCount: quiz.questionCount || quiz.questions.length,
  negativeMarking: Boolean(quiz.negativeMarking),
  totalMarks: quiz.totalMarks || quiz.questions.reduce((total, question) => total + (question.marks || 1), 0),
  questions: quiz.questions
    .filter((question) => question.status !== 'draft')
    .map((question) => ({
      id: String(question._id),
      question: question.question,
      options: question.options,
      difficulty: question.difficulty,
      marks: question.marks,
    })),
});

function validateQuizInput(input, partial = false) {
  const { title, description, category, difficulty, timeLimit, questions } = input;
  if ((!partial || title !== undefined) && (typeof title !== 'string' || !title.trim())) return 'Quiz title is required.';
  if ((!partial || category !== undefined) && (typeof category !== 'string' || !category.trim())) return 'Quiz subject or category is required.';
  if (difficulty !== undefined && !difficulties.has(difficulty)) return 'Difficulty must be Easy, Medium or Hard.';
  if (timeLimit !== undefined && (!Number.isInteger(timeLimit) || timeLimit < 1 || timeLimit > 600)) return 'Quiz duration must be between 1 and 600 minutes.';
  if (input.quizType !== undefined && !quizTypes.has(input.quizType)) return 'Quiz type must be practice or mock.';
  if (input.questionCount !== undefined && input.questionCount !== null && (!Number.isInteger(input.questionCount) || input.questionCount < 1)) return 'Question count must be a positive number.';
  if (questions !== undefined) {
    if (!Array.isArray(questions) || questions.length === 0) return 'Add at least one question.';
    for (const question of questions) {
      if (typeof question.question !== 'string' || !question.question.trim()) return 'Every question must include question text.';
      if (!Array.isArray(question.options) || question.options.length !== 4 || question.options.some((option) => typeof option !== 'string' || !option.trim())) {
        return 'Each question must have four non-empty answer options.';
      }
      if (!question.options.includes(question.correctAnswer)) return 'The correct answer must match one of the four options.';
      if (question.marks !== undefined && (!Number.isFinite(question.marks) || question.marks < 0)) return 'Question marks cannot be negative.';
      if (question.negativeMarks !== undefined && (!Number.isFinite(question.negativeMarks) || question.negativeMarks < 0)) return 'Negative marks cannot be less than zero.';
      if (question.difficulty !== undefined && !difficulties.has(question.difficulty)) return 'Question difficulty must be Easy, Medium or Hard.';
    }
  } else if (!partial && input.isPublished !== false) {
    return 'Add at least one question.';
  }
  return '';
}

router.get('/', async (req, res) => {
  const filter = { isPublished: true };
  ['branchId', 'semesterId', 'subjectId'].forEach((field) => {
    if (req.query[field]) filter[field] = req.query[field];
  });
  if (req.query.difficulty) filter.difficulty = req.query.difficulty;
  if (req.query.quizType) filter.quizType = req.query.quizType;
  if (req.query.category) filter.category = req.query.category;
  if (typeof req.query.search === 'string' && req.query.search.trim()) {
    const term = req.query.search.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { title: { $regex: term, $options: 'i' } },
      { description: { $regex: term, $options: 'i' } },
      { category: { $regex: term, $options: 'i' } },
    ];
  }

  try {
    const quizzes = await Quiz.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    return res.json(quizzes.map(serializeQuiz));
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid branch, semester or subject identifier.' });
    console.error('Quiz list fetch failed:', error.message);
    return res.status(500).json({ message: 'Failed to fetch quizzes.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, isPublished: true }).lean();
    if (!quiz) return res.status(404).json({ message: 'Quiz not found.' });
    return res.json(serializeQuiz(quiz));
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid quiz identifier.' });
    console.error('Quiz fetch failed:', error.message);
    return res.status(500).json({ message: 'Unable to fetch quiz.' });
  }
});

router.post('/', protect, adminOnly, async (req, res) => {
  const validationError = validateQuizInput(req.body || {});
  if (validationError) return res.status(400).json({ message: validationError });
  try {
    const quiz = await Quiz.create({
      ...req.body,
      title: req.body.title.trim(),
      category: req.body.category.trim(),
      totalMarks: req.body.questions.reduce((total, question) => total + (question.marks ?? 1), 0),
    });
    return res.status(201).json(serializeQuiz(quiz));
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid branch, semester, subject or topic identifier.' });
    console.error('Quiz creation failed:', error.message);
    return res.status(400).json({ message: 'Quiz creation failed. Check the quiz fields and try again.' });
  }
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  const validationError = validateQuizInput(req.body || {}, true);
  if (validationError) return res.status(400).json({ message: validationError });
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found.' });
    if (req.body.isPublished === true && !quiz.questions.some((question) => question.status === 'published')) {
      return res.status(400).json({ message: 'Publish at least one reviewed question before publishing this quiz.' });
    }
    Object.entries(req.body).forEach(([field, value]) => {
      if (['title', 'description', 'category', 'branchId', 'semesterId', 'subjectId', 'topicId', 'difficulty', 'timeLimit', 'quizType', 'questionCount', 'negativeMarking', 'isPublished', 'questions'].includes(field)) {
        quiz[field] = value;
      }
    });
    if (quiz.isModified('questions')) {
      quiz.totalMarks = quiz.questions.reduce((total, question) => total + (question.marks ?? 1), 0);
    }
    await quiz.save();
    return res.json(serializeQuiz(quiz));
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid quiz or catalogue identifier.' });
    console.error('Quiz update failed:', error.message);
    return res.status(400).json({ message: 'Unable to update quiz.' });
  }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndUpdate(req.params.id, { isPublished: false }, { new: true });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found.' });
    return res.status(204).end();
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid quiz identifier.' });
    console.error('Quiz archive failed:', error.message);
    return res.status(500).json({ message: 'Unable to archive quiz.' });
  }
});

export default router;
