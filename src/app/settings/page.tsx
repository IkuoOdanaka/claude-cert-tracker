import type { Metadata } from "next";
import { EmptyState } from "@/components/EmptyState";
import { PageHeading } from "@/components/PageHeading";

export const metadata: Metadata = { title: "設定" };

export default function SettingsPage() {
  return (
    <>
      <PageHeading
        title="設定"
        description="進捗データの書き出し・読み込み・消去を行います。"
      />
      <EmptyState
        title="準備中"
        description="進捗の JSON エクスポート/インポートはこれから実装します。"
      />
    </>
  );
}
