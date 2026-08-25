"use client";

import { Badge } from "@/components/Badge";
import { Button, ButtonLink } from "@/components/Button";
import { Card, CardBody } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { Skeleton } from "@/components/Skeleton";
import { summarizeCertificationProgress, useProgress } from "@/features/progress";
import type { StudyTimeSummary } from "@/lib/content";
import { formatDuration, formatLevel, formatPriceUsd, formatRole } from "@/lib/format";
import type { Certification } from "@/types/domain";

export interface CertificationCardProps {
  certification: Certification;
  /** data 側で解決済みのコース ID(推奨学習順) */
  courseIds: string[];
  studyTime: StudyTimeSummary;
}

export function CertificationCard({
  certification,
  courseIds,
  studyTime,
}: CertificationCardProps) {
  const { status, progress, toggleCertification } = useProgress();

  const loading = status === "loading";
  const selected = !loading && progress.selectedCertificationIds.includes(certification.id);
  const summary = summarizeCertificationProgress(progress, courseIds);

  return (
    <Card
      className={`h-full transition-shadow ${
        selected ? "ring-2 ring-accent" : "hover:shadow-sm"
      }`}
    >
      <CardBody className="flex h-full flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">{formatRole(certification.role)}</Badge>
          <Badge>{formatLevel(certification.level)}</Badge>
          {selected ? <Badge tone="success">目標</Badge> : null}
        </div>

        <h2 className="text-lg font-semibold leading-snug tracking-tight text-ink">
          {certification.name}
        </h2>

        {/* 資格どうしを見比べる画面なので、項目の並びは全カードで揃える */}
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-ink-muted">価格</dt>
          <dd className="font-medium text-ink">{formatPriceUsd(certification.priceUsd)}</dd>

          <dt className="text-ink-muted">コース</dt>
          <dd className="text-ink">{courseIds.length} コース</dd>

          <dt className="text-ink-muted">学習時間</dt>
          <dd className="text-ink">
            {studyTime.measuredCourseCount === 0
              ? "未掲載"
              : formatDuration(studyTime.totalMinutes)}
            {studyTime.unmeasuredCourseCount > 0 ? (
              <span className="block text-xs text-ink-muted">
                うち {studyTime.unmeasuredCourseCount} コースは公式に所要時間の掲載なし
              </span>
            ) : null}
          </dd>

          <dt className="text-ink-muted">対象</dt>
          <dd className="text-ink">{certification.targetAudience}</dd>
        </dl>

        {certification.notes.length > 0 ? (
          <ul className="space-y-1 text-xs text-warning">
            {certification.notes.map((note) => (
              <li key={note}>※ {note}</li>
            ))}
          </ul>
        ) : null}

        {/*
          進捗はマウント後に読むので、それまでは高さの同じスケルトンを出す。
          未読込を「0%」として描くと、実際に0%の人と区別がつかない
        */}
        <div className="mt-auto pt-2">
          {loading ? (
            <div>
              <Skeleton className="mb-1.5 h-5 w-28" />
              <Skeleton className="h-2 w-full" />
            </div>
          ) : (
            <ProgressBar
              percent={summary.percent}
              label={`${certification.shortName} の進捗`}
              detail={`${summary.completedCount} / ${summary.totalCount} コース`}
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={selected ? "primary" : "secondary"}
            aria-pressed={selected}
            disabled={loading}
            onClick={() => toggleCertification(certification.id)}
            /* ラベルが変わっても幅が動かないように下限を決めておく */
            className="min-w-[9.5rem]"
          >
            {selected ? "目標にしています" : "目標にする"}
          </Button>

          <ButtonLink variant="ghost" href={`/certifications/${certification.id}`}>
            コースを見る
          </ButtonLink>
        </div>
      </CardBody>
    </Card>
  );
}
