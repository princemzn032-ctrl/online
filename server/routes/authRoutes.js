import express from 'express';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import User from '../models/User.js';
import Branch from '../models/Branch.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

const createToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `quiz_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${secure}`,
  );
}

router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').lean();
    if (!user) return res.status(404).json({ message: 'User not found.' });
    return res.json({
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      branchId: user.branchId ? String(user.branchId) : '',
      semester: user.semester,
    });
  } catch (error) {
    console.error('Authenticated user lookup failed:', error.message);
    return res.status(500).json({ message: 'Unable to load account.' });
  }
});

router.post('/logout', (_req, res) => {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `quiz_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`);
  return res.json({ message: 'Logged out successfully.' });
});

router.post('/forgot-password', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Enter a valid email address.' });
  }
  const { SMTP_HOST, SMTP_USER, SMTP_PASSWORD, MAIL_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD || !MAIL_FROM) {
    return res.status(503).json({ message: 'Password recovery email is not configured. Contact the platform administrator.' });
  }

  try {
    const user = await User.findOne({ email });
    if (user) {
      const token = randomBytes(32).toString('hex');
      user.passwordResetTokenHash = createHash('sha256').update(token).digest('hex');
      user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const resetUrl = new URL(`/reset-password?token=${token}`, frontendUrl);
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
      });
      await transporter.sendMail({
        from: MAIL_FROM,
        to: user.email,
        subject: 'Reset your QuizMaster password',
        text: `Use this one-time link within one hour to reset your password: ${resetUrl.toString()}`,
      });
    }
    return res.json({ message: 'If an account exists for that email, a password reset link will be sent.' });
  } catch (error) {
    console.error('Password recovery request failed:', error.message);
    return res.status(500).json({ message: 'Unable to send a password reset email right now.' });
  }
});

router.post('/reset-password', async (req, res) => {
  const token = typeof req.body?.token === 'string' ? req.body.token : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!/^[a-f\d]{64}$/i.test(token) || password.length < 8) {
    return res.status(400).json({ message: 'Use a valid reset link and a password with at least 8 characters.' });
  }
  try {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    }).select('+passwordResetTokenHash +passwordResetExpiresAt');
    if (!user) return res.status(400).json({ message: 'This password reset link is invalid or has expired.' });
    user.password = await bcrypt.hash(password, 12);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();
    return res.json({ message: 'Password updated. You can now sign in with your new password.' });
  } catch (error) {
    console.error('Password reset failed:', error.message);
    return res.status(500).json({ message: 'Unable to reset password right now.' });
  }
});

router.post('/register', async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const branchId = req.body?.branchId || null;
  const semester = req.body?.semester ?? null;

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 6) {
    return res.status(400).json({ message: 'Enter a valid name and email, and a password with at least 6 characters.' });
  }
  if ((branchId && !/^[a-f\d]{24}$/i.test(branchId))
    || (semester !== null && (!Number.isInteger(semester) || semester < 1 || semester > 8))
    || (branchId && semester === null)) {
    return res.status(400).json({ message: 'Choose a valid engineering branch and semester.' });
  }

  try {
    if (branchId && !await Branch.exists({ _id: branchId, isActive: true })) {
      return res.status(400).json({ message: 'The selected engineering branch is unavailable.' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword, branchId, semester, lastLoginAt: new Date() });
    const token = createToken(user);
    setSessionCookie(res, token);

    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        points: user.points,
        streak: user.streak,
        branchId: user.branchId ? String(user.branchId) : '',
        semester: user.semester,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    console.error('Registration failed:', error.message);
    return res.status(500).json({ message: 'Unable to create your account right now.' });
  }
});

router.post('/login', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = createToken(user);
    setSessionCookie(res, token);
    return res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        points: user.points,
        streak: user.streak,
        branchId: user.branchId ? String(user.branchId) : '',
        semester: user.semester,
      },
    });
  } catch (error) {
    console.error('Login failed:', error.message);
    return res.status(500).json({ message: 'Unable to log in right now.' });
  }

});

export default router;
