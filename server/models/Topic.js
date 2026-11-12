import mongoose from 'mongoose';

const topicSchema = new mongoose.Schema({
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  order: { type: Number, default: 0 },
}, { timestamps: true });

topicSchema.index({ subjectId: 1, name: 1 }, { unique: true });

export default mongoose.model('Topic', topicSchema);
