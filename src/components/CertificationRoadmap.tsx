"use client";

import { useState } from "react";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { CourseCheck } from "@/components/CourseCheck";
import { Card, CardBody } from "@/components/Card";
import { CourseNote } from "@/components/CourseNote";
import { CourseStatusControl } from "@/components/CourseStatusControl";
import { ProgressBar } from "@/components/ProgressBar";
import { Skeleton } from "@/components/Skeleton";
import {
  getCourseProgress,
  getLatestCourseCheck,
  summarizeCertificationProgress,
  useProgress,
} from "@/features/progress";
import { summarizeStudyTime } from "@/lib/content";
import {
  formatCompletedAt,
  formatCourseFormat,
  formatDuration,
  formatProvider,
  formatRemainingStudyTime,
} from "@/lib/format";
import type { Certification, Course, Question } from "@/types/domain";

export function CertificationRoadmap({
  certification,
  courses,
  questionsByCourseId,
}: {
  certification: Certification;
  courses: Course[];
  /** コース ID → そのコースの理解度チェック用の問題 */
  questionsByCourseId: Record<string, Question[]>;
}) {
  const { status, progress, setCourseStatus, setCourseNote } = useProgress();
  /** 開いているチェックのコース ID。1つずつしか開かない(画面が散らからないように) */
  const [openCheckCourseId, setOpenCheckCourseId] = useState<string | null>(null);

  const loading = status === "loading";
  const courseIds = courses.map((course) => course.id);
  const summary = summarizeCertificationProgress(progress, courseIds);

  // 残り時間は「まだ完了していないコース」だけを集計する。
  // 所要時間が未掲載のコースは合計に含められないので、件数を添えて示す
  const remaining = summarizeStudyTime(
    courses.filter((course) => getCourseProgress(progress, course.id).status !== "completed"),
  );

  return (
    <>
      <Card className="mb-6">
        <CardBody>
          {loading ? (
            <div>
              <Skeleton className="mb-1.5 h-5 w-32" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="mt-3 h-4 w-48" />
            </div>
          ) : (
            <>
              <ProgressBar
                percent={summary.percent}
                label={`${certification.shortName} の進捗`}
                detail={`${summary.completedCount} / ${summary.totalCount} コース完了`}
              />
              <p className="mt-3 text-sm text-ink-muted">
                残りの学習時間の目安:{" "}
                <strong className="font-medium text-ink">
                  {formatRemainingStudyTime(remaining)}
                </strong>
              </p>
            </>
          )}
        </CardBody>
      </Card>

      <h2 className="mb-1 text-lg font-semibold tracking-tight text-ink">コース</h2>
      <p className="mb-4 text-sm text-ink-muted">
        公式の Prep Course の並び順です。上から順に進めるのが推奨される学習順です。
      </p>

      <ol className="space-y-3">
        {courses.map((course, index) => {
          const courseProgress = getCourseProgress(progress, course.id);
          const completed = !loading && courseProgress.status === "completed";
          const questions = questionsByCourseId[course.id] ?? [];
          const latestCheck = loading ? undefined : getLatestCourseCheck(progress, course.id);
          const checkOpen = openCheckCourseId === course.id;

          return (
            <li key={course.id}>
              <Card className={completed ? "border-success/50" : ""}>
                <CardBody className="flex flex-col gap-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span
                          aria-hidden
                          className="text-sm font-medium tabular-nums text-ink-muted"
                        >
                          {index + 1}.
                        </span>
                        <h3 className="text-base font-medium text-ink">
                          {completed ? (
                            <span aria-hidden className="mr-1 text-success">
                              ✓
                            </span>
                          ) : null}
                          {course.title}
                        </h3>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 pl-6">
                        <Badge tone={course.provider === "partner-academy" ? "accent" : "neutral"}>
                          {formatProvider(course.provider)}
                        </Badge>
                        <Badge>{formatCourseFormat(course.format)}</Badge>
                        <span className="text-xs text-ink-muted">
                          {course.estimatedMinutes === null
                            ? "所要時間の掲載なし"
                            : formatDuration(course.estimatedMinutes)}
                        </span>
                      </div>

                    </div>

                    {loading ? (
                      <Skeleton className="h-9 w-56 shrink-0" />
                    ) : (
                      <CourseStatusControl
                        courseId={course.id}
                        courseTitle={course.title}
                        status={courseProgress.status}
                        onChange={(next) => setCourseStatus(course.id, next)}
                      />
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 pl-0 sm:pl-6">
                    {loading ? (
                      <Skeleton className="h-4 w-24" />
                    ) : (
                      <CourseNote
                        note={courseProgress.note}
                        courseTitle={course.title}
                        onSave={(next) => setCourseNote(course.id, next)}
                      />
                    )}

                    <div className="flex items-center gap-3 text-xs">
                      {completed && courseProgress.completedAt ? (
                        <span className="text-ink-muted">
                          {`${formatCompletedAt(courseProgress.completedAt)}に完了`}
                        </span>
                      ) : null}
                      <a
                        href={course.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent underline underline-offset-2 hover:text-accent-hover"
                      >
                        公式ページで開く
                      </a>
                    </div>
                  </div>

                  {loading ? null : (
                    <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
                      {questions.length === 0 ? (
                        <p className="text-xs text-ink-muted">
                          このコースの理解度チェックは準備中です。
                        </p>
                      ) : (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            aria-expanded={checkOpen}
                            onClick={() =>
                              setOpenCheckCourseId(checkOpen ? null : course.id)
                            }
                          >
                            {checkOpen ? "チェックを閉じる" : "理解度チェック"}
                          </Button>

                          {latestCheck ? (
                            <span className="text-xs text-ink-muted">
                              前回 {latestCheck.correctCount} / {latestCheck.totalCount} 問正解
                              （{formatCompletedAt(latestCheck.checkedAt)}）
                            </span>
                          ) : (
                            <span className="text-xs text-ink-muted">
                              {questions.length} 問
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {checkOpen ? (
                    <CourseCheck
                      courseId={course.id}
                      courseTitle={course.title}
                      questions={questions}
                      onClose={() => setOpenCheckCourseId(null)}
                    />
                  ) : null}
                </CardBody>
              </Card>
            </li>
          );
        })}
      </ol>
    </>
  );
}
