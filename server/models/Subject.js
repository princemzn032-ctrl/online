import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
  semesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester', required: true, index: true },
  name: { type: String, required: true, trim: true },
  code: { type: String, trim: true, default: '' },
  description: { type: String, default: '' },
  isCommon: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

subjectSchema.index({ branchId: 1, semesterId: 1, name: 1 }, { unique: true });

export default mongoose.model('Subject', subjectSchema);
