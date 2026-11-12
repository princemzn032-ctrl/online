import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import Branch from '../models/Branch.js';

const router = express.Router();

router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
      points: user.points,
      streak: user.streak,
      branchId: user.branchId ? String(user.branchId) : '',
      semester: user.semester,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Profile fetch failed:', error.message);
    return res.status(500).json({ message: 'Profile fetch failed' });
  }
});

router.patch('/profile', protect, async (req, res) => {
  const { name, branchId, semester } = req.body || {};
  const updates = {};
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
      return res.status(400).json({ message: 'Name must be between 2 and 80 characters.' });
    }
    updates.name = name.trim();
  }
  if (branchId !== undefined || semester !== undefined) {
    if (!branchId || !/^[a-f\d]{24}$/i.test(branchId) || !Number.isInteger(semester) || semester < 1 || semester > 8) {
      return res.status(400).json({ message: 'Choose a valid engineering branch and semester.' });
    }
    try {
      if (!await Branch.exists({ _id: branchId, isActive: true })) {
        return res.status(400).json({ message: 'The selected engineering branch is unavailable.' });
      }
    } catch (error) {
      if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid branch identifier.' });
      throw error;
    }
    updates.branchId = branchId;
    updates.semester = semester;
  }
  if (!Object.keys(updates).length) return res.status(400).json({ message: 'Provide at least one profile field to update.' });
  try {
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true }).select('-password').lean();
    if (!user) return res.status(404).json({ message: 'User not found.' });
    return res.json({
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
      branchId: user.branchId ? String(user.branchId) : '',
      semester: user.semester,
      points: user.points,
      streak: user.streak,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Profile update failed:', error.message);
    return res.status(400).json({ message: 'Unable to update profile.' });
  }
});

export default router;
