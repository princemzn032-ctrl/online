import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { getAssistantReply } from '../../shared/assistant.js';

const router = express.Router();

const aiContext = `
You are the QuizMaster AI companion. Explain the platform and help users get started.
QuizMaster lets users take timed quizzes, explore categories, track progress, and compete on a leaderboard.
Be helpful, concise, friendly, and focus on explaining the website's features and guiding the user.
`;

router.post('/', async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  if (message.length > 1000) {
    return res.status(400).json({ error: 'Message must be 1000 characters or fewer' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.json({ reply: getAssistantReply(message), mode: 'guide' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${aiContext}\n\nUser: ${message}\nBot:`,
    });
    const reply = response.text?.trim();
    if (reply) return res.json({ reply, mode: 'ai' });

    console.warn('Chatbot returned an empty response; using the built-in guide.');
  } catch (error) {
    console.error('Chatbot request failed; using the built-in guide:', error.message);
  }

  return res.json({ reply: getAssistantReply(message), mode: 'guide' });
});

export default router;
