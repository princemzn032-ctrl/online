import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import Quiz from '../models/Quiz.js';
import Category from '../models/Category.js';

const router = express.Router();

router.use(protect, adminOnly);

router.get('/dashboard', async (req, res) => {
  const [users, quizzes, categories] = await Promise.all([
    User.countDocuments(),
    Quiz.countDocuments(),
    Category.countDocuments(),
  ]);

  res.json({ users, quizzes, categories, averageScore: 78 });
});

router.get('/users', async (req, res) => {
  const users = await User.find().select('-password');
  res.json(users);
});

router.post('/categories', async (req, res) => {
  const category = await Category.create(req.body);
  res.status(201).json(category);
});

router.post('/quizzes', async (req, res) => {
  const quiz = await Quiz.create(req.body);
  res.status(201).json(quiz);
});

export default router;
