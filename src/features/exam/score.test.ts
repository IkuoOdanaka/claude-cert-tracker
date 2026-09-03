import { describe, expect, it } from "vitest";
import { gradeExam, isCorrect, listIncorrectQuestionIds } from "./score";
import type { ExamQuestion } from "./select";
import type { Question, QuestionType } from "@/types/domain";

function question(
  id: string,
  correctChoiceIds: string[],
  type: QuestionType = "single",
  domainId = "a",
  courseIds = ["course-a"],
): Question {
  return {
    id,
    certificationId: "cert",
    domainId,
    courseIds,
    type,
    difficulty: 2,
    stem: `${id} の設問`,
    choices: ["c0", "c1", "c2", "c3"].map((choiceId) => ({
      id: choiceId,
      text: choiceId,
    })),
    correctChoiceIds,
    explanation: "解説",
    sourceRefs: ["https://example.com/"],
  };
}

const asExam = (questions: Question[]): ExamQuestion[] =>
  questions.map((q) => ({ question: q, choices: q.choices }));

describe("isCorrect", () => {
  it("単一選択は完全一致で正解", () => {
    const q = question("q", ["c1"]);

    expect(isCorrect(q, ["c1"])).toBe(true);
    expect(isCorrect(q, ["c0"])).toBe(false);
    expect(isCorrect(q, [])).toBe(false);
    expect(isCorrect(q, ["c1", "c2"])).toBe(false);
  });

  it("複数選択は部分点なし", () => {
    const q = question("q", ["c0", "c2"], "multiple");

    expect(isCorrect(q, ["c0", "c2"])).toBe(true);
    // 片方だけ合っていても不正解
    expect(isCorrect(q, ["c0"])).toBe(false);
    // 余分に選んでも不正解
    expect(isCorrect(q, ["c0", "c2", "c3"])).toBe(false);
  });

  it("選んだ順序は結果に影響しない", () => {
    const q = question("q", ["c0", "c2"], "multiple");

    expect(isCorrect(q, ["c2", "c0"])).toBe(true);
  });

  it("同じ選択肢を重複して渡しても結果は変わらない", () => {
    const q = question("q", ["c0", "c2"], "multiple");

    expect(isCorrect(q, ["c0", "c0", "c2"])).toBe(true);
  });
});

describe("gradeExam", () => {
  it("正答数・総数・割合を返す", () => {
    const exam = asExam([
      question("q1", ["c0"]),
      question("q2", ["c1"]),
      question("q3", ["c2"]),
      question("q4", ["c3"]),
    ]);

    const score = gradeExam(exam, [
      { questionId: "q1", selectedChoiceIds: ["c0"] },
      { questionId: "q2", selectedChoiceIds: ["c1"] },
      { questionId: "q3", selectedChoiceIds: ["c0"] },
      { questionId: "q4", selectedChoiceIds: ["c0"] },
    ]);

    expect(score.correctCount).toBe(2);
    expect(score.totalCount).toBe(4);
    expect(score.percent).toBe(50);
  });

  it("未回答の問題は不正解として数える", () => {
    const exam = asExam([question("q1", ["c0"]), question("q2", ["c0"])]);

    const score = gradeExam(exam, [{ questionId: "q1", selectedChoiceIds: ["c0"] }]);

    expect(score.correctCount).toBe(1);
    expect(score.totalCount).toBe(2);
    expect(score.answers[1]).toMatchObject({ correct: false, selectedChoiceIds: [] });
  });

  it("出題されていない問題への解答は無視する", () => {
    const exam = asExam([question("q1", ["c0"])]);

    const score = gradeExam(exam, [
      { questionId: "q1", selectedChoiceIds: ["c0"] },
      { questionId: "not-asked", selectedChoiceIds: ["c0"] },
    ]);

    expect(score.totalCount).toBe(1);
    expect(score.correctCount).toBe(1);
  });

  it("ドメイン別の正答率を返す", () => {
    const exam = asExam([
      question("a1", ["c0"], "single", "a"),
      question("a2", ["c0"], "single", "a"),
      question("b1", ["c0"], "single", "b"),
    ]);

    const score = gradeExam(exam, [
      { questionId: "a1", selectedChoiceIds: ["c0"] },
      { questionId: "a2", selectedChoiceIds: ["c1"] },
      { questionId: "b1", selectedChoiceIds: ["c0"] },
    ]);

    expect(score.byDomain).toEqual({
      a: { correct: 1, total: 2, percent: 50 },
      b: { correct: 1, total: 1, percent: 100 },
    });
  });

  it("コース別の正答率を返し、複数コースの問題は両方に数える", () => {
    const exam = asExam([
      question("q1", ["c0"], "single", "a", ["course-a", "course-b"]),
      question("q2", ["c0"], "single", "a", ["course-b"]),
    ]);

    const score = gradeExam(exam, [
      { questionId: "q1", selectedChoiceIds: ["c0"] },
      { questionId: "q2", selectedChoiceIds: ["c1"] },
    ]);

    expect(score.byCourse).toEqual({
      "course-a": { correct: 1, total: 1, percent: 100 },
      "course-b": { correct: 1, total: 2, percent: 50 },
    });
  });

  it("出題が空でも壊れない", () => {
    expect(gradeExam([], [])).toMatchObject({
      correctCount: 0,
      totalCount: 0,
      percent: 0,
      byDomain: {},
      byCourse: {},
    });
  });

  it("割合は整数に丸める", () => {
    const exam = asExam([
      question("q1", ["c0"]),
      question("q2", ["c0"]),
      question("q3", ["c0"]),
    ]);

    const score = gradeExam(exam, [{ questionId: "q1", selectedChoiceIds: ["c0"] }]);

    expect(score.percent).toBe(33);
  });
});

describe("listIncorrectQuestionIds", () => {
  it("間違えた問題だけを出題順で返す", () => {
    const exam = asExam([
      question("q1", ["c0"]),
      question("q2", ["c0"]),
      question("q3", ["c0"]),
    ]);

    const score = gradeExam(exam, [
      { questionId: "q1", selectedChoiceIds: ["c1"] },
      { questionId: "q2", selectedChoiceIds: ["c0"] },
    ]);

    expect(listIncorrectQuestionIds(score)).toEqual(["q1", "q3"]);
  });

  it("全問正解なら空", () => {
    const exam = asExam([question("q1", ["c0"])]);
    const score = gradeExam(exam, [{ questionId: "q1", selectedChoiceIds: ["c0"] }]);

    expect(listIncorrectQuestionIds(score)).toEqual([]);
  });
});
