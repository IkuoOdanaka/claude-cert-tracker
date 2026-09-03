/**
 * 採点。副作用を持たない純粋関数。
 */
import type { Question } from "@/types/domain";
import type { ExamQuestion } from "./select";

export interface SubmittedAnswer {
  questionId: string;
  selectedChoiceIds: readonly string[];
}

export interface GradedAnswer {
  question: Question;
  selectedChoiceIds: string[];
  correct: boolean;
}

export interface Breakdown {
  correct: number;
  total: number;
  /** 0-100 の整数。total が 0 なら 0 */
  percent: number;
}

export interface ExamScore {
  answers: GradedAnswer[];
  correctCount: number;
  totalCount: number;
  percent: number;
  byDomain: Record<string, Breakdown>;
  /** 1問が複数コースに紐づく場合、そのすべてに加算する */
  byCourse: Record<string, Breakdown>;
}

/**
 * 正誤の判定。
 *
 * - 単一選択: 完全一致
 * - 複数選択: **部分点なし**の完全一致。認定試験の一般的な採点に寄せる
 * - 未回答は不正解
 *
 * 選択の順序と重複は無視する(UI の都合で順番が変わっても結果を変えない)。
 */
export function isCorrect(
  question: Question,
  selectedChoiceIds: readonly string[],
): boolean {
  const selected = new Set(selectedChoiceIds);
  const expected = new Set(question.correctChoiceIds);

  if (selected.size !== expected.size) return false;

  for (const choiceId of expected) {
    if (!selected.has(choiceId)) return false;
  }

  return true;
}

function toPercent(correct: number, total: number): number {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

function tally(
  breakdown: Record<string, Breakdown>,
  key: string,
  correct: boolean,
): void {
  const current = breakdown[key] ?? { correct: 0, total: 0, percent: 0 };

  breakdown[key] = {
    correct: current.correct + (correct ? 1 : 0),
    total: current.total + 1,
    percent: 0,
  };
}

/**
 * 出題と解答から結果を作る。
 *
 * 出題されたすべての問題を対象にする(解答が無い問題は不正解)。
 * 解答側にしか無い questionId は無視する。
 */
export function gradeExam(
  examQuestions: readonly ExamQuestion[],
  submitted: readonly SubmittedAnswer[],
): ExamScore {
  const byQuestionId = new Map(
    submitted.map((answer) => [answer.questionId, answer.selectedChoiceIds]),
  );

  const byDomain: Record<string, Breakdown> = {};
  const byCourse: Record<string, Breakdown> = {};

  const answers = examQuestions.map(({ question }) => {
    const selectedChoiceIds = [...(byQuestionId.get(question.id) ?? [])];
    const correct = isCorrect(question, selectedChoiceIds);

    tally(byDomain, question.domainId, correct);
    for (const courseId of question.courseIds) {
      tally(byCourse, courseId, correct);
    }

    return { question, selectedChoiceIds, correct };
  });

  for (const breakdown of [byDomain, byCourse]) {
    for (const key of Object.keys(breakdown)) {
      breakdown[key].percent = toPercent(breakdown[key].correct, breakdown[key].total);
    }
  }

  const correctCount = answers.filter((answer) => answer.correct).length;

  return {
    answers,
    correctCount,
    totalCount: answers.length,
    percent: toPercent(correctCount, answers.length),
    byDomain,
    byCourse,
  };
}

/** 間違えた問題の id。「間違えた問題だけ再挑戦」に使う */
export function listIncorrectQuestionIds(score: ExamScore): string[] {
  return score.answers
    .filter((answer) => !answer.correct)
    .map((answer) => answer.question.id);
}
