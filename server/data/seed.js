import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Category from '../models/Category.js';
import Quiz from '../models/Quiz.js';
import Result from '../models/Result.js';
import { categoriesSeed, sampleQuizSeed } from './seedData.js';

dotenv.config();

const seed = async () => {
  await connectDB();

  const generalKnowledgeCategory = categoriesSeed.find((category) => category.name === 'General Knowledge');
  const generalKnowledgeQuiz = sampleQuizSeed.find((quiz) => (
    quiz.title === 'General Knowledge Challenge' && quiz.category === 'General Knowledge'
  ));
  if (!generalKnowledgeCategory || !generalKnowledgeQuiz) {
    throw new Error('The General Knowledge category and quiz must both be present in the seed data.');
  }

  await Category.findOneAndUpdate(
    { name: generalKnowledgeCategory.name },
    { $set: generalKnowledgeCategory },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const quiz = await Quiz.findOneAndUpdate(
    { title: generalKnowledgeQuiz.title },
    { $set: generalKnowledgeQuiz },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const otherQuizCount = await Quiz.countDocuments({ _id: { $ne: quiz._id } });
  const deletedAttempts = await Result.deleteMany({ quizId: { $ne: quiz._id } });
  await Quiz.deleteMany({ _id: { $ne: quiz._id } });
  await Category.deleteMany({ name: { $ne: generalKnowledgeCategory.name } });

  console.log(
    `Database seeded with 1 General Knowledge quiz (${quiz.questions.length} questions); `
    + `removed ${otherQuizCount} other quizzes and ${deletedAttempts.deletedCount} non-General Knowledge attempts.`,
  );
  process.exit(0);
};

seed().catch((error) => {
  console.error('Database seed failed:', error.message);
  process.exit(1);
});