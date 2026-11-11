import express from 'express';
import Category from '../models/Category.js';
import Quiz from '../models/Quiz.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const [categories, quizzes] = await Promise.all([
      Category.find().sort({ name: 1 }).lean(),
      Quiz.find({ isPublished: true }).select('category difficulty questions').lean(),
    ]);

    return res.json(categories.map((category) => {
      const categoryQuizzes = quizzes.filter((quiz) => quiz.category === category.name);
      return {
        id: String(category._id),
        name: category.name,
        description: category.description,
        icon: category.icon,
        questionCount: categoryQuizzes.reduce((count, quiz) => count + quiz.questions.length, 0),
        quizCount: categoryQuizzes.length,
        difficulty: categoryQuizzes[0]?.difficulty || 'Mixed',
      };
    }));
  } catch (error) {
    console.error('Category list failed:', error.message);
    return res.status(500).json({ message: 'Unable to load quiz categories.' });
  }
});

export default router;
