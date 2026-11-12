import assert from 'node:assert/strict';
import test from 'node:test';
import { engineeringQuizSeed } from '../data/engineeringQuizSeed.js';

test('every engineering sample quiz has at least ten answerable questions', () => {
  for (const [branch, quiz] of Object.entries(engineeringQuizSeed)) {
    assert.ok(quiz.questions.length >= 10, `${branch} needs at least ten questions`);
    for (const question of quiz.questions) {
      assert.equal(question.options.length, 4, `${branch} questions must have four options`);
      assert.ok(question.options.includes(question.correctAnswer), `${branch} answer must match an option`);
    }
  }
});
