import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Category from '../models/Category.js';
import Branch from '../models/Branch.js';
import Quiz from '../models/Quiz.js';
import Semester from '../models/Semester.js';
import Subject from '../models/Subject.js';
import Topic from '../models/Topic.js';
import { categoriesSeed, sampleQuizSeed } from './seedData.js';
import { engineeringCatalogSeed } from './engineeringCatalogSeed.js';
import { engineeringQuizSeed } from './engineeringQuizSeed.js';

dotenv.config();

const seed = async () => {
  await connectDB();

  const generalKnowledgeCategory = categoriesSeed.find((category) => category.name === 'General Knowledge');
  const generalKnowledgeQuiz = sampleQuizSeed.find((quiz) => (
    quiz.title === 'General Knowledge Challenge' && quiz.category === 'General Knowledge'
  ));
  if (!generalKnowledgeCategory || !generalKnowledgeQuiz || generalKnowledgeQuiz.questions.length !== 20) {
    throw new Error('The General Knowledge category and its 20-question quiz must both be present in the seed data.');
  }
  const underfilledEngineeringQuiz = Object.entries(engineeringQuizSeed)
    .find(([, quizData]) => quizData.questions.length < 10);
  if (underfilledEngineeringQuiz) {
    throw new Error(`${underfilledEngineeringQuiz[0]} engineering quizzes must contain at least 10 questions.`);
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

  let semesterCount = 0;
  let subjectCount = 0;
  let topicCount = 0;
  const catalogIds = new Map();

  for (const branchData of engineeringCatalogSeed) {
    const branch = await Branch.findOneAndUpdate(
      { code: branchData.code },
      { $set: { name: branchData.name, description: branchData.description, isActive: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    const semesterIds = new Map();

    for (const semesterData of branchData.semesters) {
      const semester = await Semester.findOneAndUpdate(
        { branchId: branch._id, number: semesterData.number },
        { $set: { name: `Semester ${semesterData.number}` } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      semesterCount += 1;
      semesterIds.set(semesterData.number, semester._id);

      for (const subjectData of semesterData.subjects) {
        const subject = await Subject.findOneAndUpdate(
          { branchId: branch._id, semesterId: semester._id, name: subjectData.name },
          {
            $set: {
              isCommon: subjectData.isCommon,
              isActive: true,
            },
            $setOnInsert: { description: `Sample subject for ${branch.name}, Semester ${semester.number}.` },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
        subjectCount += 1;
        catalogIds.set(
          `${branchData.code}:${semesterData.number}:${subjectData.name}`,
          { branchId: branch._id, semesterId: semester._id, subjectId: subject._id },
        );

        for (const [index, topicName] of subjectData.topics.entries()) {
          await Topic.findOneAndUpdate(
            { subjectId: subject._id, name: topicName },
            { $setOnInsert: { order: index + 1, description: `Starter topic for ${subjectData.name}.` } },
            { upsert: true, setDefaultsOnInsert: true },
          );
          topicCount += 1;
        }
      }
    }
    catalogIds.set(`${branchData.code}:semesters`, semesterIds);
  }

  for (const [branchCode, quizData] of Object.entries(engineeringQuizSeed)) {
    const ids = catalogIds.get(`${branchCode}:${quizData.semester}:${quizData.subject}`);
    const quizQuestions = quizData.questions.map((question) => ({
      ...question,
      difficulty: 'Easy',
      marks: 1,
      negativeMarks: 0.25,
      source: 'original',
      status: 'published',
    }));
    await Quiz.findOneAndUpdate(
      { title: `${branchCode} Foundations - Sample Practice` },
      {
        $set: {
          title: `${branchCode} Foundations - Sample Practice`,
          description: 'Original starter questions for learning and demonstration; not a complete university question bank.',
          category: quizData.subject,
          branchId: ids.branchId,
          semesterId: ids.semesterId,
          subjectId: ids.subjectId,
          difficulty: 'Easy',
          timeLimit: 10,
          quizType: 'practice',
          questionCount: quizQuestions.length,
          negativeMarking: false,
          totalMarks: quizQuestions.length,
          passingPercentage: 60,
          isPublished: true,
          questions: quizQuestions,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  console.log(
    `Seeded ${quiz.questions.length} General Knowledge questions and an engineering catalogue with `
    + `${engineeringCatalogSeed.length} branches, ${semesterCount} semesters, ${subjectCount} sample subjects `
    + `${topicCount} starter topics and ${Object.keys(engineeringQuizSeed).length} sample engineering quizzes.`,
  );
  process.exit(0);
};

seed().catch((error) => {
  console.error('Database seed failed:', error.message);
  process.exit(1);
});