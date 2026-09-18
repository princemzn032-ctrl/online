import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Category from '../models/Category.js';
import Quiz from '../models/Quiz.js';
import { categoriesSeed, sampleQuizSeed } from './seedData.js';

dotenv.config();

const seed = async () => {
  await connectDB();
  await Category.deleteMany({});
  await Quiz.deleteMany({});
  await Category.insertMany(categoriesSeed);
  await Quiz.insertMany(sampleQuizSeed);
  console.log('Database seeded successfully');
  process.exit(0);
};

seed().catch((error) => {
  console.error('Database seed failed:', error.message);
  process.exit(1);
});