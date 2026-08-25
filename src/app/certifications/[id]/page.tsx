import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { PageHeading } from "@/components/PageHeading";
import { getCertification, getCertifications } from "@/lib/content";

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
  return { title: getCertification(id)?.shortName ?? "資格" };
}

export default async function CertificationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const certification = getCertification(id);

  if (!certification) notFound();

  return (
    <>
      <PageHeading title={certification.name} description={certification.summary} />
      <EmptyState
        title="準備中"
        description="コース一覧と完了記録はこれから実装します。"
      />
    </>
  );
}
