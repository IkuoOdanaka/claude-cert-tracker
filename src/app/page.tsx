import { EmptyState } from "@/components/EmptyState";
import { PageHeading } from "@/components/PageHeading";

export default function Home() {
  return (
    <>
      <PageHeading
        title="資格を選ぶ"
        description="目指す資格を選ぶと、必要なコースが推奨学習順で並びます。"
      />
      <EmptyState
        title="準備中"
        description="資格の比較と選択はこれから実装します。"
      />
    </>
  );
}
