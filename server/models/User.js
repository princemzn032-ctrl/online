import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  profileImage: { type: String, default: '' },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
  semester: { type: Number, min: 1, max: 8, default: null },
  points: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  passwordResetTokenHash: { type: String, default: undefined, select: false },
  passwordResetExpiresAt: { type: Date, default: undefined, select: false },
  createdAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date, default: null },
});

export default mongoose.model('User', userSchema);
