import express from 'express';
import { GoogleGenAI } from '@google/genai';

const router = express.Router();

const aiContext = `
You are the QuizMaster AI companion. Your goal is to explain this platform and help users get started. 
About the platform: QuizMaster is a modern learning platform where users can take timed quizzes, test their knowledge across multiple categories (like Computer Science, Mathematics, Science), track their progress on a dashboard, and compete on a leaderboard. 
Features include: Timed Quizzes, Instant Results, Performance Analytics, Leaderboards, Multiple Categories, Difficulty Levels, Random Questions, and Progress Tracking.

Be helpful, concise, friendly, and focus strictly on explaining the website's features and guiding the user. Do not answer complex domain-specific questions (like solving a math problem) - instead, encourage them to find a quiz on that topic!
`;

router.post('/', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${aiContext}\n\nUser: ${message}\nBot:`,
    });

    res.json({ reply: response.text });
  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

export default router;
