import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateQuizScore } from '../services/quizScoring.js';

const quiz = {
  negativeMarking: true,
  questions: [
    { _id: 'q1', question: 'Question one?', options: ['A', 'B', 'C', 'D'], correctAnswer: 'A', explanation: 'A is correct.', marks: 2, negativeMarks: 0.5 },
    { _id: 'q2', question: 'Question two?', options: ['A', 'B', 'C', 'D'], correctAnswer: 'B', explanation: 'B is correct.', marks: 1, negativeMarks: 0.25 },
    { _id: 'q3', question: 'Question three?', options: ['A', 'B', 'C', 'D'], correctAnswer: 'C', explanation: 'C is correct.', marks: 2, negativeMarks: 1 },
  ],
};

test('scores correct, incorrect and unanswered questions with optional negative marks', () => {
  const result = calculateQuizScore(quiz, { q1: 'A', q2: 'D' });

  assert.equal(result.correctCount, 1);
  assert.equal(result.incorrectCount, 1);
  assert.equal(result.unansweredCount, 1);
  assert.equal(result.earnedMarks, 1.75);
  assert.equal(result.totalMarks, 5);
  assert.equal(result.percentage, 35);
  assert.equal(result.review[2].selectedAnswer, '');
  assert.equal(result.review[2].isCorrect, false);
});

test('does not subtract marks when negative marking is disabled', () => {
  const result = calculateQuizScore({ ...quiz, negativeMarking: false }, { q2: 'D' });

  assert.equal(result.incorrectCount, 1);
  assert.equal(result.earnedMarks, 0);
  assert.equal(result.percentage, 0);
});

test('clamps a negative percentage at zero while retaining the earned score', () => {
  const result = calculateQuizScore(quiz, { q1: 'D', q2: 'D', q3: 'D' });

  assert.equal(result.earnedMarks, -1.75);
  assert.equal(result.percentage, 0);
});
