import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import Result from '../models/Result.js';

const router = express.Router();

router.post('/', protect, async (req, res) => {
  try {
    const result = await Result.create({ ...req.body, userId: req.user.id });
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ message: 'Result could not be saved', error: error.message });
  }
});

router.get('/me', protect, async (req, res) => {
  const results = await Result.find({ userId: req.user.id }).populate('quizId', 'title category');
  res.json(results);
});

export default router;