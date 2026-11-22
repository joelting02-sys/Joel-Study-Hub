import test from 'node:test';
import assert from 'node:assert/strict';
import type { QuizFile } from '../types/studyhub';
import { gradeQuiz } from './quizLogic';

const sampleQuiz: QuizFile = {
  quiz_id: 'ict-partA-mock-01',
  title: 'ICT 4113 – Part A MCQ Mock',
  subject: 'ICT',
  pass_rate: 80,
  glossary: { 'hybrid cloud': '混合云' },
  questions: [
    {
      id: 'q1',
      type: 'multiple_choice',
      stem: 'Question 1',
      options: ['A', 'B', 'C', 'D'],
      correct_index: 2,
      explanation_zh: '解析 1',
    },
    {
      id: 'q2',
      type: 'true_false',
      stem: 'Question 2',
      options: ['True', 'False'],
      correct_index: 0,
      explanation_zh: '解析 2',
    },
  ],
};

test('gradeQuiz computes score, pass status, wrong questions, and deduplicated words_looked_up', () => {
  const now = new Date('2026-11-21T19:30:00+08:00');
  const graded = gradeQuiz(
    sampleQuiz,
    {
      q1: { chosen_index: 1, used_hint: true },
      q2: { chosen_index: 0, used_hint: false },
    },
    ['bargaining', 'substitute', 'Bargaining'],
    now,
  );

  assert.equal(graded.result.score, 1);
  assert.equal(graded.result.total, 2);
  assert.equal(graded.result.percent, 50);
  assert.equal(graded.passed, false);
  assert.equal(graded.wrongQuestions.length, 1);
  assert.equal(graded.wrongQuestions[0].question.id, 'q1');
  assert.deepEqual(graded.result.words_looked_up, ['bargaining', 'substitute']);
  assert.match(graded.filename, /^ict-partA-mock-01_\d{8}_\d{6}\.json$/);
});
