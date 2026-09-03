/**
 * 出題エンジンの公開窓口。
 *
 * 理解度チェック(コース単位)と模擬試験(資格単位)は、どちらもここを使う。
 * 違いは buildExam に渡す絞り込みだけ。
 */
export { buildExam } from "./select";
export type { BuildExamOptions, ExamQuestion } from "./select";
export { gradeExam, isCorrect, listIncorrectQuestionIds } from "./score";
export type { Breakdown, ExamScore, GradedAnswer, SubmittedAnswer } from "./score";
export { createRandom, shuffle } from "./random";
