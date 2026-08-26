import type { Metadata } from "next";
import { Alert } from "@/components/Alert";
import { Card, CardBody } from "@/components/Card";
import { PageHeading } from "@/components/PageHeading";
import {
  STALE_AFTER_DAYS,
  getContentFreshness,
  getContentMeta,
  getContentStats,
} from "@/lib/content";

export const metadata: Metadata = {
  title: "このサイトについて",
  description:
    "Claude 資格トラッカーは Anthropic 非公式の個人プロジェクトです。掲載情報の出所、模擬試験の問題の作成方針、進捗データの扱いについて説明します。",
};

const OFFICIAL_URL = "https://anthropic-partners.skilljar.com/";
const REPOSITORY_URL = "https://github.com/IkuoOdanaka/claude-cert-tracker";

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-accent underline underline-offset-2 hover:text-accent-hover"
    >
      {children}
    </a>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardBody className="space-y-3">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <div className="space-y-3 text-sm leading-relaxed text-ink-muted">{children}</div>
      </CardBody>
    </Card>
  );
}

export default function AboutPage() {
  const { source } = getContentMeta();
  const { lastVerifiedAt, daysSinceVerified, stale } = getContentFreshness();
  const { certificationCount, courseCount } = getContentStats();

  return (
    <>
      <PageHeading
        title="このサイトについて"
        description="何のためのサイトで、載っている情報がどこから来ていて、あなたのデータをどう扱うか。"
      />

      <div className="space-y-4">
        <Alert tone="warning" label="はじめに">
          <p className="text-ink">
            このサイトは <strong className="font-medium">Anthropic 非公式</strong> の
            個人プロジェクトです。Anthropic 社とは無関係で、同社が運営・監修・保証している
            ものではありません。
          </p>
          <p className="text-ink">
            受験するかどうかの判断、費用、申し込み方法などは、
            <strong className="font-medium">必ず公式サイトで確認してください</strong>。
          </p>
          <p>
            <ExternalLink href={OFFICIAL_URL}>
              Anthropic Partner Academy（公式）
            </ExternalLink>
          </p>
        </Alert>

        <Section title="このサイトでできること">
          <p>
            Claude 認定資格を取るまでの道のりを1か所にまとめるための学習トラッカーです。
            取りたい資格を選ぶと、公式の Prep Course が推奨学習順で並び、
            どこまで進んだかを記録できます。
          </p>
          <p>
            学習コンテンツそのもの（動画や教材）は提供していません。
            公式ページへの導線と、あなた自身の進捗の記録に徹しています。
          </p>
        </Section>

        <Section title="載っている情報の範囲と出所">
          <p>
            このサイトが掲載しているのは、
            <strong className="font-medium text-ink">
              公式サイトで公開されている事実情報だけ
            </strong>
            です。具体的には、資格 {certificationCount} 件の名称・レベル・価格と、
            それぞれの Prep Course に含まれるコース {courseCount} 件の名称・提供元・形式・
            所要時間・公式ページの URL です。
          </p>
          <p>
            出所: <ExternalLink href={source}>{source}</ExternalLink>
          </p>
          <p>
            <strong className="font-medium text-ink">
              公式の説明文・教材・試験問題は、転載も翻訳もしていません。
            </strong>
            コースの内容がどのようなものかは、各コースの「公式ページで開く」から
            公式サイトでご確認ください。このサイトはその判断材料を置き換えるものではありません。
          </p>
          <p>
            事実情報は自動で同期しているわけではないため、
            <strong className="font-medium text-ink">
              最新かつ正確であることは保証できません
            </strong>
            。公式サイトが更新されても、このサイトの反映は遅れます。
          </p>
          <p>
            公式サイトとの突き合わせを最後に行った日:{" "}
            <strong className="font-medium text-ink">
              <time dateTime={lastVerifiedAt}>{lastVerifiedAt}</time>
            </strong>
            （{daysSinceVerified} 日前）
          </p>
          {stale ? (
            <Alert tone="warning">
              <p className="text-ink">
                最後の確認から {STALE_AFTER_DAYS} 日以上が経っています。
                掲載内容が公式サイトと食い違っている可能性があります。
                必ず公式サイトで確認してください。
              </p>
            </Alert>
          ) : null}
          <p>
            出題ドメインの区分は、公式の出題範囲表ではありません。
            公式の Prep Course のモジュール構成をもとに、このサイトが独自に整理したものです。
            該当箇所には画面上でもその旨を表示しています。
          </p>
        </Section>

        <Section title="著作権と商標について">
          <p>
            資格名・コース名・価格・所要時間・コース構成といった事実情報は、
            公式サイトの内容を指し示すために掲載しています。
            公式サイトの文章、スライド、動画、試験問題などの著作物は、
            <strong className="font-medium text-ink">一切掲載していません</strong>。
          </p>
          <p>
            「Claude」「Anthropic」は Anthropic PBC の商標です。
            このサイトでは、どの製品・どの資格の話をしているかを示すためにのみ使用しており、
            <strong className="font-medium text-ink">
              Anthropic 社との提携・後援・推奨の関係はありません
            </strong>
            。
          </p>
          <p>
            掲載内容について権利上の懸念がある場合は、
            <ExternalLink href={`${REPOSITORY_URL}/issues`}>
              リポジトリの Issue
            </ExternalLink>
            からお知らせください。確認のうえ速やかに対応します。
          </p>
        </Section>

        <Section title="模擬試験の問題について">
          <p>
            模擬試験の問題は
            <strong className="font-medium text-ink">すべてオリジナル</strong>で、
            公式試験問題の転載ではありません。実際の試験問題を入手して掲載することはしません。
          </p>
          <p>作問の方針は次のとおりです。</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              各問に<strong className="font-medium text-ink">根拠にした公開情報の出典</strong>
              （URL）を必ず持たせています
            </li>
            <li>解説には「なぜその答えなのか」を書き、正解の再掲にしません</li>
            <li>出典が無い問題は、自動チェックで登録できないようにしています</li>
          </ul>
          <p>
            そのため、実際の試験の出題傾向や難易度と一致するとは限りません。
            力試しの材料として使ってください。
          </p>
        </Section>

        <Section title="あなたのデータの扱い">
          <p>
            学習の進捗は
            <strong className="font-medium text-ink">
              あなたのブラウザの中だけ
            </strong>
            に保存されます。サーバーには送信されません。このサイトはアカウント登録も
            ログインも不要で、そもそも進捗を受け取るサーバーを持っていません。
          </p>
          <p>
            そのため、ブラウザのデータを消すと進捗も消えます。端末をまたいで続けたいときは、
            設定画面から進捗を JSON ファイルとして書き出して、別の端末で読み込んでください。
          </p>
        </Section>

        <Section title="ソースコード">
          <p>
            このサイトのソースコードは公開しています。掲載内容の誤りに気づいたら、
            リポジトリの Issue で知らせてもらえると助かります。
          </p>
          <p>
            <ExternalLink href={REPOSITORY_URL}>
              IkuoOdanaka/claude-cert-tracker
            </ExternalLink>
            （MIT License）
          </p>
        </Section>
      </div>
    </>
  );
}
