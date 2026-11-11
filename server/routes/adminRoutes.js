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
  const category = await Category.create(req.body);
  res.status(201).json(category);
});

router.post('/quizzes', async (req, res) => {
  const quiz = await Quiz.create(req.body);
  res.status(201).json(quiz);
});

export default router;
