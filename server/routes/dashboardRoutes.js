import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import Result from '../models/Result.js';
import Topic from '../models/Topic.js';
import User from '../models/User.js';

const router = express.Router();
router.use(protect);

router.get('/summary', async (req, res) => {
  try {
    const [user, results] = await Promise.all([
      User.findById(req.user.id).select('branchId semester').lean(),
      Result.find({ userId: req.user.id })
        .populate('quizId', 'title category')
        .sort({ completedAt: -1 })
        .limit(50)
        .lean(),
    ]);
    const attempted = results.length;
    const averageScore = attempted
      ? Math.round(results.reduce((total, result) => total + result.percentage, 0) / attempted)
      : 0;
    const bestScore = attempted ? Math.max(...results.map((result) => result.percentage)) : 0;
    const totalLearningTime = results.reduce((total, result) => total + result.timeTaken, 0);

    return res.json({
      quizzesAttempted: attempted,
      averageScore,
      bestScore,
      totalLearningTime,
      branchId: user?.branchId ? String(user.branchId) : '',
      semester: user?.semester || null,
      recent: results.slice(0, 8).map((result) => ({
        id: String(result._id),
        title: result.quizId?.title || 'Archived quiz',
        subject: result.quizId?.category || 'Uncategorized',
        score: result.score,
        earnedMarks: result.earnedMarks ?? result.score,
        totalMarks: result.totalMarks || result.correctAnswers + result.wrongAnswers,
        percentage: result.percentage,
        completedAt: result.completedAt,
      })),
    });
  } catch (error) {
    console.error('Student dashboard summary failed:', error.message);
    return res.status(500).json({ message: 'Unable to load your dashboard.' });
  }
});

router.get('/performance', async (req, res) => {
  try {
    const results = await Result.find({ userId: req.user.id })
      .populate({ path: 'quizId', select: 'title category subjectId', populate: { path: 'subjectId', select: 'name' } })
      .sort({ completedAt: 1 })
      .lean();
    const subjectScores = new Map();
    const weakTopicCounts = new Map();
    const topicIds = new Set();

    for (const result of results) {
      const subject = result.quizId?.subjectId?.name || result.quizId?.category || 'Other';
      const score = subjectScores.get(subject) || { subject, quizzes: 0, percentageTotal: 0, correct: 0, questions: 0 };
      score.quizzes += 1;
      score.percentageTotal += result.percentage;
      score.correct += result.correctAnswers;
      score.questions += result.correctAnswers + result.wrongAnswers + (result.unansweredAnswers || 0);
      subjectScores.set(subject, score);

      for (const answer of result.answerReview || []) {
        if (answer.isCorrect || !answer.topicId) continue;
        topicIds.add(answer.topicId);
        weakTopicCounts.set(answer.topicId, (weakTopicCounts.get(answer.topicId) || 0) + 1);
      }
    }

    const topics = await Topic.find({ _id: { $in: [...topicIds] } }).select('name subjectId').lean();
    const topicById = new Map(topics.map((topic) => [String(topic._id), topic]));
    const weakTopics = [...weakTopicCounts.entries()]
      .map(([topicId, misses]) => ({ topicId, topic: topicById.get(topicId)?.name || 'Topic', misses }))
      .sort((left, right) => right.misses - left.misses)
      .slice(0, 8);

    return res.json({
      subjectPerformance: [...subjectScores.values()].map((item) => ({
        subject: item.subject,
        quizzes: item.quizzes,
        averagePercentage: Math.round(item.percentageTotal / item.quizzes),
        accuracy: item.questions ? Math.round((item.correct / item.questions) * 100) : 0,
      })),
      weakTopics,
      history: results.map((result) => ({
        id: String(result._id),
        title: result.quizId?.title || 'Archived quiz',
        percentage: result.percentage,
        completedAt: result.completedAt,
      })),
    });
  } catch (error) {
    console.error('Student performance fetch failed:', error.message);
    return res.status(500).json({ message: 'Unable to load performance data.' });
  }
});

export default router;
