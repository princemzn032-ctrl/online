import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import resultRoutes from './routes/resultRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import platformRoutes from './routes/platformRoutes.js';
import branchRoutes from './routes/branchRoutes.js';
import semesterRoutes from './routes/semesterRoutes.js';
import subjectRoutes from './routes/subjectRoutes.js';
import topicRoutes from './routes/topicRoutes.js';
import attemptRoutes from './routes/attemptRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

dotenv.config();
const app = express();
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});
const createAuthLimiter = () => rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_req, res) => res.status(429).json({
    message: 'Too many attempts. Please wait 15 minutes before trying again.',
  }),
});
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({
  origin(origin, callback) {
    const isLocalFrontend = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '');
    if (
      !origin
      || origin === process.env.FRONTEND_URL
      || origin === process.env.RENDER_EXTERNAL_URL
      || origin === `https://${process.env.VERCEL_URL}`
      || origin === `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      || isLocalFrontend
    ) {
      return callback(null, true);
    }
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true,
}));
app.use(helmet());
app.use('/api', apiLimiter);
app.post('/api/auth/login', createAuthLimiter());
app.post('/api/auth/register', createAuthLimiter());
app.post('/api/auth/forgot-password', createAuthLimiter());
app.post('/api/auth/reset-password', createAuthLimiter());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  return res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? 'ok' : 'unavailable',
    database: databaseConnected ? 'connected' : 'disconnected',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/platform', platformRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/semesters', semesterRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/attempts', attemptRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../dist', 'index.html'));
  });
} else if (!process.env.VERCEL) {
  app.get('/', (req, res) => {
    res.json({ message: 'QuizMaster API is running' });
  });
}

export default app;

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET === 'replace-with-a-long-random-secret') {
    throw new Error('Set a unique JWT_SECRET of at least 32 characters in server/.env.');
  }

  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

if (!process.env.VERCEL) {
  startServer().catch((error) => {
    console.error(`Server startup failed: ${error.message}`);
    process.exitCode = 1;
  });
}
