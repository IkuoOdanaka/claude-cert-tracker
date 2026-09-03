import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/Badge";
import { Card, CardBody } from "@/components/Card";
import { CertificationRoadmap } from "@/components/CertificationRoadmap";
import { PageHeading } from "@/components/PageHeading";
import {
  getCertification,
  getCertifications,
  getCoursesFor,
  getQuestionsForCourse,
} from "@/lib/content";
import { formatLevel, formatPriceUsd, formatRole } from "@/lib/format";

/** 静的書き出しのため、生成するパスを列挙する */
export function generateStaticParams() {
  return getCertifications().map((certification) => ({ id: certification.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const certification = getCertification(id);

  if (!certification) return { title: "資格" };

  return {
    title: certification.shortName,
    description: `${certification.name} の学習ロードマップ。Prep Course ${certification.courseIds.length} コースの進捗を記録できます。`,
  };
}

export default async function CertificationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const certification = getCertification(id);

  if (!certification) notFound();

  const courses = getCoursesFor(certification);
  // 問題はビルド時に解決する。画面側は data/*.json を直接読まない
  const questionsByCourseId = Object.fromEntries(
    courses.map((course) => [course.id, getQuestionsForCourse(course.id)]),
  );

  const derivedDomains = certification.domainsSource === "derived-from-prep-courses";

  return (
    <>
      <PageHeading
        title={certification.name}
        description={`公式の Prep Course ${courses.length} コースを推奨学習順に並べています。コースの内容は公式ページで確認してください。`}
      />

      <Card className="mb-6">
        <CardBody className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">{formatRole(certification.role)}</Badge>
            <Badge>{formatLevel(certification.level)}</Badge>
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-ink-muted">価格</dt>
            <dd className="font-medium text-ink">{formatPriceUsd(certification.priceUsd)}</dd>

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

          <div className="flex flex-wrap gap-4 text-sm">
            <a
              href={certification.prepPathUrl}
              target="_blank"
              rel="noreferrer"
              className="text-accent underline underline-offset-2 hover:text-accent-hover"
            >
              公式の Prep Course
            </a>
            <a
              href={certification.officialUrl}
              target="_blank"
              rel="noreferrer"
              className="text-accent underline underline-offset-2 hover:text-accent-hover"
            >
              公式の認定ページ
            </a>
          </div>
        </CardBody>
      </Card>

      <Card className="mb-8">
        <CardBody>
          <h2 className="text-base font-semibold text-ink">出題ドメイン</h2>

          {/*
            公式の出題範囲表は公開されていない。推定であることを画面でも必ず伝える。
            推定を推定と書かないと、読んだ人が公式情報として扱ってしまう
          */}
          {derivedDomains ? (
            <p className="mt-2 rounded-control bg-accent-soft px-3 py-2 text-xs text-ink">
              以下は<strong className="font-medium">公式の出題範囲表ではありません</strong>。
              公式の Prep Course のモジュール構成から、このサイトが独自に整理したものです。
              模擬試験の出題配分と弱点分析の軸として使っています。
            </p>
          ) : null}

          <ul className="mt-3 flex flex-wrap gap-2">
            {certification.examDomains.map((domain) => (
              <li key={domain.id}>
                <Badge>{domain.name}</Badge>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <CertificationRoadmap
        certification={certification}
        courses={courses}
        questionsByCourseId={questionsByCourseId}
      />
    </>
  );
}
