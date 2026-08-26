import type { Metadata } from "next";
import { PageHeading } from "@/components/PageHeading";
import { ProgressSettings } from "@/components/ProgressSettings";

export const metadata: Metadata = { title: "設定" };

export default function SettingsPage() {
  return (
    <>
      <PageHeading
        title="設定"
        description="進捗データの書き出し・読み込み・消去を行います。"
      />
      <ProgressSettings />
    </>
  );
}
