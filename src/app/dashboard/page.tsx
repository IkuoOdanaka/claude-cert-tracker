import type { Metadata } from "next";
import { ButtonLink } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { PageHeading } from "@/components/PageHeading";

export const metadata: Metadata = { title: "ダッシュボード" };

export default function DashboardPage() {
  return (
    <>
      <PageHeading
        title="ダッシュボード"
        description="目標にした資格の進捗と、模擬試験のスコア推移をまとめて見られます。"
      />
      <EmptyState
        title="まだ目標の資格を選んでいません"
        description="目指す資格を選ぶと、ここに進捗がまとまって表示されます。"
        action={
          <ButtonLink href="/" variant="primary">
            資格を選ぶ
          </ButtonLink>
        }
      />
    </>
  );
}
