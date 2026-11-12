import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  score: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  correctAnswers: { type: Number, default: 0 },
  wrongAnswers: { type: Number, default: 0 },
  unansweredAnswers: { type: Number, default: 0 },
  earnedMarks: { type: Number, default: 0 },
  totalMarks: { type: Number, default: 0 },
  answerReview: [{
    questionId: { type: String, required: true },
    topicId: { type: String, default: '' },
    question: { type: String, required: true },
    selectedAnswer: { type: String, default: '' },
    correctAnswer: { type: String, required: true },
    explanation: { type: String, default: '' },
    isCorrect: { type: Boolean, default: false },
    marks: { type: Number, default: 0 },
  }],
  timeTaken: { type: Number, default: 0 },
  completedAt: { type: Date, default: Date.now }
});

export default mongoose.model('Result', resultSchema);
