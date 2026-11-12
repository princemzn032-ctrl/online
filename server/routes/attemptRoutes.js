import express from 'express';
import { randomInt } from 'crypto';
import mongoose from 'mongoose';
import { protect } from '../middleware/authMiddleware.js';
import Quiz from '../models/Quiz.js';
import QuizAttempt from '../models/QuizAttempt.js';
import Result from '../models/Result.js';
import User from '../models/User.js';
import { calculateQuizScore } from '../services/quizScoring.js';

const router = express.Router();
router.use(protect);

function serializeAttempt(attempt, quiz) {
  const answerByQuestion = new Map(attempt.answers.map((answer) => [String(answer.questionId), answer]));
  const allowedQuestions = new Set(attempt.questionIds.map(String));
  return {
    id: String(attempt._id),
    quizId: String(quiz._id),
    startedAt: attempt.startedAt,
    expiresAt: attempt.expiresAt,
    status: attempt.status,
    questions: quiz.questions
      .filter((question) => allowedQuestions.has(String(question._id)))
      .map((question) => ({
        id: String(question._id),
        question: question.question,
        options: question.options,
        selectedAnswer: answerByQuestion.get(String(question._id))?.selectedAnswer || '',
        markedForReview: answerByQuestion.get(String(question._id))?.markedForReview || false,
      })),
  };
}

async function findOwnedAttempt(attemptId, userId) {
  if (!mongoose.isValidObjectId(attemptId)) return { error: 'invalid' };
  const attempt = await QuizAttempt.findOne({ _id: attemptId, studentId: userId });
  if (!attempt) return { error: 'missing' };
  const quiz = await Quiz.findById(attempt.quizId).lean();
  if (!quiz) return { error: 'quiz' };
  const allowedQuestions = new Set(attempt.questionIds.map(String));
  return { attempt, quiz: { ...quiz, questions: quiz.questions.filter((question) => allowedQuestions.has(String(question._id))) } };
}

router.post('/start', async (req, res) => {
  const quizId = req.body?.quizId;
  if (!mongoose.isValidObjectId(quizId)) return res.status(400).json({ message: 'A valid quiz identifier is required.' });
  try {
    const quiz = await Quiz.findOne({ _id: quizId, isPublished: true }).lean();
    if (!quiz || !quiz.questions.some((question) => question.status !== 'draft')) {
      return res.status(404).json({ message: 'Published quiz not found or it has no questions.' });
    }
    const availableQuestions = quiz.questions.filter((question) => question.status !== 'draft');
    const requestedCount = req.body?.questionCount ?? quiz.questionCount ?? availableQuestions.length;
    if (!Number.isInteger(requestedCount) || requestedCount < 1) {
      return res.status(400).json({ message: 'Question count must be a positive number.' });
    }
    const selectedCount = Math.min(availableQuestions.length, requestedCount);
    for (let index = availableQuestions.length - 1; index > 0; index -= 1) {
      const swapIndex = randomInt(index + 1);
      [availableQuestions[index], availableQuestions[swapIndex]] = [availableQuestions[swapIndex], availableQuestions[index]];
    }
    const selectedQuestions = availableQuestions.slice(0, selectedCount);
    const durationSeconds = quiz.timeLimit * 60;
    const attempt = await QuizAttempt.create({
      studentId: req.user.id,
      quizId: quiz._id,
      questionIds: selectedQuestions.map((question) => question._id),
      expiresAt: new Date(Date.now() + durationSeconds * 1000),
    });
    return res.status(201).json({
      attempt: serializeAttempt(attempt, { ...quiz, questions: selectedQuestions }),
      quiz: {
        id: String(quiz._id),
        title: quiz.title,
        category: quiz.category,
        timeLimit: quiz.timeLimit,
        quizType: quiz.quizType,
        negativeMarking: quiz.negativeMarking,
      },
    });
  } catch (error) {
    console.error('Quiz attempt start failed:', error.message);
    return res.status(500).json({ message: 'Unable to start quiz attempt.' });
  }
});

router.get('/:attemptId', async (req, res) => {
  try {
    const found = await findOwnedAttempt(req.params.attemptId, req.user.id);
    if (found.error === 'invalid') return res.status(400).json({ message: 'Invalid attempt identifier.' });
    if (found.error) return res.status(404).json({ message: 'Active quiz attempt not found.' });
    return res.json(serializeAttempt(found.attempt, found.quiz));
  } catch (error) {
    console.error('Quiz attempt fetch failed:', error.message);
    return res.status(500).json({ message: 'Unable to load quiz attempt.' });
  }
});

router.post('/:attemptId/answer', async (req, res) => {
  const { questionId, selectedAnswer } = req.body || {};
  if (!mongoose.isValidObjectId(questionId) || (selectedAnswer !== null && typeof selectedAnswer !== 'string')) {
    return res.status(400).json({ message: 'A valid question and answer are required.' });
  }
  try {
    const found = await findOwnedAttempt(req.params.attemptId, req.user.id);
    if (found.error === 'invalid') return res.status(400).json({ message: 'Invalid attempt identifier.' });
    if (found.error) return res.status(404).json({ message: 'Active quiz attempt not found.' });
    const { attempt, quiz } = found;
    if (attempt.status !== 'in_progress') return res.status(409).json({ message: 'This attempt has already been submitted.' });
    if (Date.now() >= attempt.expiresAt.getTime()) return res.status(409).json({ message: 'This attempt has expired.' });
    const question = quiz.questions.find((item) => String(item._id) === String(questionId));
    if (!question || question.status === 'draft') return res.status(404).json({ message: 'Question not found in this quiz.' });
    if (selectedAnswer && !question.options.includes(selectedAnswer)) {
      return res.status(400).json({ message: 'Select one of the available answer options.' });
    }
    let savedAnswer = attempt.answers.find((item) => String(item.questionId) === String(questionId));
    if (!savedAnswer) {
      attempt.answers.push({ questionId, selectedAnswer: selectedAnswer || '' });
      savedAnswer = attempt.answers[attempt.answers.length - 1];
    } else {
      savedAnswer.selectedAnswer = selectedAnswer || '';
    }
    await attempt.save();
    return res.json({ questionId: String(questionId), selectedAnswer: savedAnswer.selectedAnswer });
  } catch (error) {
    console.error('Quiz answer save failed:', error.message);
    return res.status(500).json({ message: 'Unable to save answer.' });
  }
});

router.post('/:attemptId/review', async (req, res) => {
  const { questionId, markedForReview } = req.body || {};
  if (!mongoose.isValidObjectId(questionId) || typeof markedForReview !== 'boolean') {
    return res.status(400).json({ message: 'A valid question and review status are required.' });
  }
  try {
    const found = await findOwnedAttempt(req.params.attemptId, req.user.id);
    if (found.error === 'invalid') return res.status(400).json({ message: 'Invalid attempt identifier.' });
    if (found.error) return res.status(404).json({ message: 'Active quiz attempt not found.' });
    if (found.attempt.status !== 'in_progress') return res.status(409).json({ message: 'This attempt has already been submitted.' });
    if (!found.quiz.questions.some((item) => String(item._id) === String(questionId))) {
      return res.status(404).json({ message: 'Question not found in this quiz.' });
    }
    let savedAnswer = found.attempt.answers.find((item) => String(item.questionId) === String(questionId));
    if (!savedAnswer) {
      found.attempt.answers.push({ questionId, markedForReview });
    } else {
      savedAnswer.markedForReview = markedForReview;
    }
    await found.attempt.save();
    return res.json({ questionId: String(questionId), markedForReview });
  } catch (error) {
    console.error('Question review state save failed:', error.message);
    return res.status(500).json({ message: 'Unable to save review state.' });
  }
});

router.post('/:attemptId/submit', async (req, res) => {
  try {
    const found = await findOwnedAttempt(req.params.attemptId, req.user.id);
    if (found.error === 'invalid') return res.status(400).json({ message: 'Invalid attempt identifier.' });
    if (found.error) return res.status(404).json({ message: 'Active quiz attempt not found.' });
    const { attempt, quiz } = found;
    if (attempt.status === 'submitted' && attempt.resultId) {
      const saved = await Result.findById(attempt.resultId).lean();
      if (saved) return res.json({
        id: String(saved._id),
        correctCount: saved.correctAnswers,
        incorrectCount: saved.wrongAnswers,
        unansweredCount: saved.unansweredAnswers || 0,
        score: saved.earnedMarks ?? saved.score,
        totalMarks: saved.totalMarks ?? quiz.totalMarks,
        percentage: saved.percentage,
        review: saved.answerReview || [],
      });
    }
    if (req.body?.answers !== undefined) {
      if (!req.body.answers || typeof req.body.answers !== 'object' || Array.isArray(req.body.answers)) {
        return res.status(400).json({ message: 'Submitted answers must be an object keyed by question identifier.' });
      }
      const questionById = new Map(quiz.questions.map((question) => [String(question._id), question]));
      for (const [questionId, selectedAnswer] of Object.entries(req.body.answers)) {
        const question = questionById.get(questionId);
        if (!question || (selectedAnswer !== null && typeof selectedAnswer !== 'string')) {
          return res.status(400).json({ message: 'Submitted answers contain an invalid question or answer.' });
        }
        if (selectedAnswer && !question.options.includes(selectedAnswer)) {
          return res.status(400).json({ message: 'Submitted answer does not match an available option.' });
        }
      }
      for (const question of quiz.questions) {
        const selectedAnswer = req.body.answers[String(question._id)] || '';
        let savedAnswer = attempt.answers.find((item) => String(item.questionId) === String(question._id));
        if (!savedAnswer) {
          attempt.answers.push({ questionId: question._id, selectedAnswer });
        } else {
          savedAnswer.selectedAnswer = selectedAnswer;
        }
      }
      await attempt.save();
    }
    const answers = Object.fromEntries(attempt.answers.map((answer) => [
      String(answer.questionId),
      answer.selectedAnswer,
    ]));
    const result = calculateQuizScore({ ...quiz, questions: quiz.questions }, answers);
    const savedResult = await Result.create({
      userId: req.user.id,
      quizId: quiz._id,
      score: result.correctCount,
      percentage: result.percentage,
      correctAnswers: result.correctCount,
      wrongAnswers: result.incorrectCount,
      unansweredAnswers: result.unansweredCount,
      earnedMarks: result.earnedMarks,
      totalMarks: result.totalMarks,
      answerReview: result.review,
      timeTaken: Math.max(0, Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000)),
    });
    attempt.status = 'submitted';
    attempt.submittedAt = new Date();
    attempt.resultId = savedResult._id;
    await attempt.save();
    await User.updateOne({ _id: req.user.id }, { $inc: { points: Math.max(0, result.earnedMarks) } });
    return res.status(201).json({
      id: String(savedResult._id),
      correctCount: result.correctCount,
      incorrectCount: result.incorrectCount,
      unansweredCount: result.unansweredCount,
      score: result.earnedMarks,
      totalMarks: result.totalMarks,
      percentage: result.percentage,
      review: result.review,
    });
  } catch (error) {
    console.error('Quiz attempt submission failed:', error.message);
    return res.status(500).json({ message: 'Unable to submit quiz attempt.' });
  }
});

export default router;
