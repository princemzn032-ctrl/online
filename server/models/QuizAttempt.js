import mongoose from 'mongoose';

const quizAttemptSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
  questionIds: [{ type: mongoose.Schema.Types.ObjectId, required: true }],
  answers: [{
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    selectedAnswer: { type: String, default: '' },
    markedForReview: { type: Boolean, default: false },
  }],
  startedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  submittedAt: { type: Date, default: null },
  status: { type: String, enum: ['in_progress', 'submitted'], default: 'in_progress', index: true },
  resultId: { type: mongoose.Schema.Types.ObjectId, ref: 'Result', default: null },
}, { timestamps: true });

quizAttemptSchema.index({ studentId: 1, status: 1, expiresAt: 1 });

export default mongoose.model('QuizAttempt', quizAttemptSchema);
