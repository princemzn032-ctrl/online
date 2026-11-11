import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import User from '../models/User.js';

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
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Profile fetch failed:', error.message);
    return res.status(500).json({ message: 'Profile fetch failed' });
  }
});

export default router;
