import express from 'express';
import Quiz from '../models/Quiz.js';

const router = express.Router();

const serializeQuiz = (quiz) => ({
  id: String(quiz._id),
  title: quiz.title,
  description: quiz.description,
  category: quiz.category,
  difficulty: quiz.difficulty,
  timeLimit: quiz.timeLimit,
  totalMarks: quiz.totalMarks,
  questions: quiz.questions.map((question) => ({
    id: String(question._id),
    question: question.question,
    options: question.options,
  })),
});

router.get('/', async (req, res) => {
  try {
    const quizzes = await Quiz.find({ isPublished: true }).sort({ createdAt: -1 }).lean();
    return res.json(quizzes.map(serializeQuiz));
  } catch (error) {
    console.error('Quiz list fetch failed:', error.message);
    return res.status(500).json({ message: 'Failed to fetch quizzes' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, isPublished: true }).lean();
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    return res.json(serializeQuiz(quiz));
  } catch (error) {
    console.error('Quiz fetch failed:', error.message);
    return res.status(500).json({ message: 'Quiz fetch failed' });
  }
});

router.post('/', async (req, res) => {
  try {
    const quiz = await Quiz.create(req.body);
    res.status(201).json(quiz);
  } catch (error) {
    res.status(400).json({ message: 'Quiz creation failed', error: error.message });
  }
});

export default router;
