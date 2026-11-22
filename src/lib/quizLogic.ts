/**
 * 测验评分与 results/<quiz_id>_<时间>.json 生成逻辑（纯函数）
 */

import type {
  QuizAnswerRecord,
  QuizFile,
  QuizQuestion,
  QuizResultFile,
} from '../types/studyhub.ts';

export interface QuizGradeSummary {
  result: QuizResultFile;
  passed: boolean;
  wrongQuestions: Array<{
    question: QuizQuestion;
    index: number;
    chosenIndex: number;
  }>;
  filename: string;
}

/**
 * 格式化文件名时间戳：YYYYMMDD_HHmmss
 */
export function formatResultTimestamp(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${y}${m}${d}_${hh}${mm}${ss}`;
}

/**
 * 根据答题记录生成严格符合协议的 QuizResultFile 与错题列表
 */
export function gradeQuiz(
  quiz: QuizFile,
  answersByQuestionId: Record<string, { chosen_index: number; used_hint: boolean }>,
  wordsLookedUp: string[],
  now: Date = new Date(),
): QuizGradeSummary {
  const answers: QuizAnswerRecord[] = [];
  const wrongQuestions: QuizGradeSummary['wrongQuestions'] = [];
  let score = 0;

  quiz.questions.forEach((q, idx) => {
    const rec = answersByQuestionId[q.id];
    const chosenIndex = rec ? rec.chosen_index : -1;
    const usedHint = rec ? rec.used_hint : false;
    const isCorrect = chosenIndex === q.correct_index;

    if (isCorrect) {
      score++;
    } else {
      wrongQuestions.push({
        question: q,
        index: idx,
        chosenIndex,
      });
    }

    answers.push({
      id: q.id,
      chosen_index: chosenIndex,
      correct: isCorrect,
      used_hint: usedHint,
    });
  });

  const total = quiz.questions.length;
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;
  const passed = percent >= quiz.pass_rate;

  // 去重保留顺序
  const uniqueLookedUp: string[] = [];
  const seen = new Set<string>();
  for (const w of wordsLookedUp) {
    const norm = w.trim().toLowerCase();
    if (norm && !seen.has(norm)) {
      seen.add(norm);
      uniqueLookedUp.push(w.trim());
    }
  }

  const safeQuizId = quiz.quiz_id.replace(/[^A-Za-z0-9_-]/g, '_');
  const filename = `${safeQuizId}_${formatResultTimestamp(now)}.json`;

  const result: QuizResultFile = {
    quiz_id: quiz.quiz_id,
    title: quiz.title,
    subject: quiz.subject,
    finished_at: now.toISOString(),
    score,
    total,
    percent,
    answers,
    words_looked_up: uniqueLookedUp,
  };

  return {
    result,
    passed,
    wrongQuestions,
    filename,
  };
}
