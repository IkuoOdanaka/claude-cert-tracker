import type { Metadata } from "next";
import { EmptyState } from "@/components/EmptyState";
import { PageHeading } from "@/components/PageHeading";

export const metadata: Metadata = { title: "このサイトについて" };

export default function AboutPage() {
  return (
    <>
      <PageHeading
        title="このサイトについて"
        description="非公式である旨、データの出所、模擬試験の問題の作成方針をまとめます。"
      />
      <EmptyState
        title="準備中"
        description="当面はページ下部のフッターに、非公式である旨とデータの最終確認日を出しています。"
      />
    </>
  );
}
