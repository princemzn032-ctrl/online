import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: {
    type: [{ type: String, required: true }],
    validate: [(options) => options.length === 4, 'Each question must have exactly four options.'],
  },
  correctAnswer: { type: String, required: true },
  explanation: { type: String, default: '' },
  category: { type: String, default: '' },
  topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', default: null },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  marks: { type: Number, default: 1, min: 0 },
  negativeMarks: { type: Number, default: 0, min: 0 },
  source: { type: String, default: 'original' },
  status: { type: String, enum: ['draft', 'published'], default: 'published' },
}, { _id: true });

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String, required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
  semesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester', default: null, index: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null, index: true },
  topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', default: null },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  timeLimit: { type: Number, required: true },
  quizType: { type: String, enum: ['practice', 'mock'], default: 'practice' },
  questionCount: { type: Number, min: 1, default: null },
  negativeMarking: { type: Boolean, default: false },
  questions: [questionSchema],
  totalMarks: { type: Number, default: 0 },
  passingPercentage: { type: Number, default: 60 },
  isPublished: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Quiz', quizSchema);
