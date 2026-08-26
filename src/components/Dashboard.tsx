"use client";

import { useMemo } from "react";
import { ButtonLink } from "@/components/Button";
import { Card, CardBody } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ProgressBar } from "@/components/ProgressBar";
import { Skeleton } from "@/components/Skeleton";
import {
  getCourseProgress,
  listCompletedCourses,
  summarizeCertificationProgress,
  useProgress,
} from "@/features/progress";
import { summarizeStudyTime } from "@/lib/content";
import { formatCompletedAt, formatRemainingStudyTime } from "@/lib/format";
import type { Certification, Course } from "@/types/domain";

export interface DashboardEntry {
  certification: Certification;
  /** 推奨学習順で解決済みのコース */
  courses: Course[];
}

const RECENT_LIMIT = 10;

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-lg font-semibold tracking-tight text-ink">{children}</h2>
  );
}

export function Dashboard({ entries }: { entries: DashboardEntry[] }) {
  const { status, progress } = useProgress();
  const loading = status === "loading";

  /** courseId から表示に必要な情報を引く。完了履歴の表示に使う */
  const courseIndex = useMemo(() => {
    const index = new Map<string, { title: string; certificationNames: string[] }>();

    for (const { certification, courses } of entries) {
      for (const course of courses) {
        const existing = index.get(course.id);
        if (existing) {
          existing.certificationNames.push(certification.shortName);
        } else {
          index.set(course.id, {
            title: course.title,
            certificationNames: [certification.shortName],
          });
        }
      }
    }

    return index;
  }, [entries]);

  const selected = entries.filter(({ certification }) =>
    progress.selectedCertificationIds.includes(certification.id),
  );

  const recent = listCompletedCourses(progress)
    // data から消えたコースの進捗は残っているが、表示はできないので飛ばす
    .filter(({ courseId }) => courseIndex.has(courseId))
    .slice(0, RECENT_LIMIT);

  if (loading) {
    return (
      <div className="space-y-8">
        <section>
          <SectionHeading>目標の資格</SectionHeading>
          <Skeleton className="h-40 w-full" />
        </section>
        <section>
          <SectionHeading>直近の学習</SectionHeading>
          <Skeleton className="h-24 w-full" />
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section>
        <SectionHeading>目標の資格</SectionHeading>

        {selected.length === 0 ? (
          <EmptyState
            title="まだ目標の資格を選んでいません"
            description="目指す資格を選ぶと、ここに進捗がまとまって表示されます。"
            action={
              <ButtonLink href="/" variant="primary">
                資格を選ぶ
              </ButtonLink>
            }
          />
        ) : (
          <>
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {selected.map(({ certification, courses }) => {
                const courseIds = courses.map((course) => course.id);
                const summary = summarizeCertificationProgress(progress, courseIds);
                const remaining = summarizeStudyTime(
                  courses.filter(
                    (course) =>
                      getCourseProgress(progress, course.id).status !== "completed",
                  ),
                );

                return (
                  <li key={certification.id}>
                    <Card className="h-full">
                      <CardBody className="flex h-full flex-col gap-3">
                        <h3 className="font-medium text-ink">{certification.name}</h3>

                        <ProgressBar
                          percent={summary.percent}
                          label={`${certification.shortName} の進捗`}
                          detail={`${summary.completedCount} / ${summary.totalCount} コース完了`}
                        />

                        <p className="text-sm text-ink-muted">
                          残りの学習時間の目安:{" "}
                          <strong className="font-medium text-ink">
                            {formatRemainingStudyTime(remaining)}
                          </strong>
                        </p>

                        <div className="mt-auto pt-1">
                          <ButtonLink
                            variant="secondary"
                            size="sm"
                            href={`/certifications/${certification.id}`}
                          >
                            コースを見る
                          </ButtonLink>
                        </div>
                      </CardBody>
                    </Card>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4">
              <ButtonLink variant="ghost" size="sm" href="/">
                目標を追加・変更する
              </ButtonLink>
            </div>
          </>
        )}
      </section>

      <section>
        <SectionHeading>直近の学習</SectionHeading>

        {recent.length === 0 ? (
          <EmptyState
            title="まだ完了したコースがありません"
            description="コースを完了にすると、ここに新しい順で並びます。"
          />
        ) : (
          <Card>
            <ul className="divide-y divide-line">
              {recent.map(({ courseId, completedAt }) => {
                const course = courseIndex.get(courseId)!;

                return (
                  <li
                    key={courseId}
                    className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{course.title}</p>
                      <p className="text-xs text-ink-muted">
                        {course.certificationNames.join(" / ")}
                      </p>
                    </div>
                    <time
                      dateTime={completedAt}
                      className="shrink-0 text-xs text-ink-muted"
                    >
                      {formatCompletedAt(completedAt)}
                    </time>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>

      <section>
        <SectionHeading>模擬試験</SectionHeading>
        <EmptyState
          title="模擬試験はまだありません"
          description="出題エンジンと問題を用意したら、ここにスコアの推移が並びます。"
        />
      </section>
    </div>
  );
}
