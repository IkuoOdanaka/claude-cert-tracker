import type { Metadata } from "next";
import { Dashboard, type DashboardEntry } from "@/components/Dashboard";
import { PageHeading } from "@/components/PageHeading";
import { getCertifications, getCoursesFor } from "@/lib/content";

export const metadata: Metadata = { title: "ダッシュボード" };

export default function DashboardPage() {
  // どれが目標かはブラウザ側にしかないので、全資格を渡して絞り込みは Dashboard で行う
  const entries: DashboardEntry[] = getCertifications().map((certification) => ({
    certification,
    courses: getCoursesFor(certification),
  }));

  return (
    <>
      <PageHeading
        title="ダッシュボード"
        description="目標にした資格の進捗と、直近の学習をまとめて見られます。"
      />
      <Dashboard entries={entries} />
    </>
  );
}
