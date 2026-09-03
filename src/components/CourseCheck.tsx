"use client";

import { useMemo, useRef, useState } from "react";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import {
  buildExam,
  gradeExam,
  type ExamQuestion,
  type ExamScore,
} from "@/features/exam";
import { useProgress } from "@/features/progress";
import type { Question } from "@/types/domain";

/** 1回の理解度チェックで出す問題数の上限。短く終わることを優先する */
const MAX_QUESTIONS = 5;

type Phase =
  | { kind: "answering" }
  | { kind: "result"; score: ExamScore };

function newSeed(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * コース1本ぶんの理解度チェック。
 *
 * 動画を見終わった直後に、その場で確かめられることを優先している。
 * ページ遷移させず、コース行の中で開いて完結する。
 */
export function CourseCheck({
  courseId,
  courseTitle,
  questions,
  initialSeed,
  onClose,
}: {
  courseId: string;
  courseTitle: string;
  questions: Question[];
  /** 「もう一度同じ問題で」のときに前回のシードを渡す */
  initialSeed?: string;
  onClose: () => void;
}) {
  const { recordCourseCheck } = useProgress();

  const [seed, setSeed] = useState(() => initialSeed ?? newSeed());
  const [phase, setPhase] = useState<Phase>({ kind: "answering" });
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const resultRef = useRef<HTMLDivElement>(null);

  const exam: ExamQuestion[] = useMemo(
    () => buildExam(questions, { count: MAX_QUESTIONS, seed }),
    [questions, seed],
  );

  function toggleChoice(question: Question, choiceId: string) {
    setSelections((current) => {
      const selected = current[question.id] ?? [];

      if (question.type === "single") {
        return { ...current, [question.id]: [choiceId] };
      }

      return {
        ...current,
        [question.id]: selected.includes(choiceId)
          ? selected.filter((id) => id !== choiceId)
          : [...selected, choiceId],
      };
    });
  }

  function submit() {
    const score = gradeExam(
      exam,
      exam.map(({ question }) => ({
        questionId: question.id,
        selectedChoiceIds: selections[question.id] ?? [],
      })),
    );

    recordCourseCheck(courseId, {
      correctCount: score.correctCount,
      totalCount: score.totalCount,
      seed,
      checkedAt: new Date().toISOString(),
    });

    setPhase({ kind: "result", score });
    // 結果が出たことをスクリーンリーダーにも伝わる形で示す
    requestAnimationFrame(() => resultRef.current?.focus());
  }

  function restart(nextSeed: string) {
    setSeed(nextSeed);
    setSelections({});
    setPhase({ kind: "answering" });
  }

  const answeredCount = exam.filter(
    ({ question }) => (selections[question.id] ?? []).length > 0,
  ).length;

  return (
    <section
      aria-label={`${courseTitle} の理解度チェック`}
      className="mt-3 rounded-card border border-line-strong bg-canvas p-4"
    >
      {phase.kind === "answering" ? (
        <>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h4 className="text-sm font-semibold text-ink">理解度チェック</h4>
            <p className="text-xs text-ink-muted">
              全 {exam.length} 問（回答済み {answeredCount} 問）
            </p>
          </div>

          <ol className="space-y-5">
            {exam.map(({ question, choices }, index) => {
              const selected = selections[question.id] ?? [];
              const multiple = question.type === "multiple";

              return (
                <li key={question.id}>
                  <fieldset>
                    <legend className="mb-2 text-sm text-ink">
                      <span className="mr-1.5 font-medium tabular-nums">{index + 1}.</span>
                      {question.stem}
                      {multiple ? (
                        <span className="ml-1.5 text-xs text-ink-muted">
                          （{question.correctChoiceIds.length} つ選択）
                        </span>
                      ) : null}
                    </legend>

                    <div className="space-y-1.5">
                      {choices.map((choice) => (
                        <label
                          key={choice.id}
                          className="flex cursor-pointer items-start gap-2.5 rounded-control px-2 py-1.5 text-sm text-ink hover:bg-accent-soft"
                        >
                          <input
                            type={multiple ? "checkbox" : "radio"}
                            name={`q-${question.id}`}
                            checked={selected.includes(choice.id)}
                            onChange={() => toggleChoice(question, choice.id)}
                            className="mt-0.5 accent-accent"
                          />
                          <span>{choice.text}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </li>
              );
            })}
          </ol>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="primary" size="sm" onClick={submit}>
              採点する
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              やめる
            </Button>
          </div>
        </>
      ) : (
        <div ref={resultRef} tabIndex={-1} role="status">
          <h4 className="text-sm font-semibold text-ink">
            {phase.score.totalCount} 問中 {phase.score.correctCount} 問正解（
            {phase.score.percent}%）
          </h4>

          <Alert tone="info" label="このテストについて">
            <p>
              このテストは、コースの主題と公開情報をもとにこのサイトが独自に作ったものです。
              <strong className="font-medium text-ink">
                動画の内容そのものを問うものではありません
              </strong>
              。結果は目安として使ってください。コースの完了はご自身で判断してください。
            </p>
          </Alert>

          <ol className="mt-4 space-y-4">
            {phase.score.answers.map(({ question, selectedChoiceIds, correct }, index) => (
              <li key={question.id} className="text-sm">
                <p className="text-ink">
                  <span
                    className={`mr-1.5 font-medium ${correct ? "text-success" : "text-danger"}`}
                  >
                    {correct ? "正解" : "不正解"}
                  </span>
                  <span className="mr-1.5 tabular-nums text-ink-muted">{index + 1}.</span>
                  {question.stem}
                </p>

                <p className="mt-1 text-xs text-ink-muted">
                  正しい選択肢:{" "}
                  {question.choices
                    .filter((choice) => question.correctChoiceIds.includes(choice.id))
                    .map((choice) => choice.text)
                    .join(" / ")}
                  {selectedChoiceIds.length === 0 ? "（未回答）" : null}
                </p>

                <p className="mt-1.5 text-sm text-ink-muted">{question.explanation}</p>

                {question.sourceRefs.length > 0 ? (
                  <p className="mt-1 text-xs">
                    {question.sourceRefs.map((href) => (
                      <a
                        key={href}
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="mr-3 text-accent underline underline-offset-2 hover:text-accent-hover"
                      >
                        根拠にした情報
                      </a>
                    ))}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => restart(newSeed())}>
              別の問題で
            </Button>
            <Button variant="secondary" size="sm" onClick={() => restart(seed)}>
              もう一度（同じ問題）
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              閉じる
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
