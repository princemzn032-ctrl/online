import app from '../server/server.js';
import connectDB from '../server/config/db.js';

let connectionPromise;

export default async function handler(req, res) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET === 'replace-with-a-long-random-secret') {
    console.error('JWT_SECRET is missing or invalid.');
    return res.status(500).json({ message: 'Server authentication is not configured.' });
  }

  if (!connectionPromise) {
    connectionPromise = connectDB().catch((error) => {
      connectionPromise = undefined;
      throw error;
    });
  }

  try {
    await connectionPromise;
    return app(req, res);
  } catch (error) {
    console.error(`Vercel API initialization failed: ${error.message}`);
    return res.status(503).json({ message: 'The QuizMaster database is unavailable.' });
  }
}
