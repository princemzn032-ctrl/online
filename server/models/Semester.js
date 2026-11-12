import mongoose from 'mongoose';

const semesterSchema = new mongoose.Schema({
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
  number: { type: Number, required: true, min: 1, max: 8 },
  name: { type: String, required: true, trim: true },
}, { timestamps: true });

semesterSchema.index({ branchId: 1, number: 1 }, { unique: true });

export default mongoose.model('Semester', semesterSchema);
