import Link from "next/link";
import { getContentMeta } from "@/lib/content";

const OFFICIAL_URL = "https://anthropic-partners.skilljar.com/";
const REPOSITORY_URL = "https://github.com/IkuoOdanaka/claude-cert-tracker";

/**
 * 非公式であることは、どの画面からも見える位置に常に出しておく。
 * 「このサイトについて」を開いた人にだけ伝わる形にしない。
 */
export function SiteFooter() {
  const { lastVerifiedAt } = getContentMeta();

  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-ink-muted">
        <p className="max-w-prose">
          このサイトは <strong className="font-medium text-ink">Anthropic 非公式</strong>{" "}
          の個人プロジェクトです。資格・コース情報は{" "}
          <a
            href={OFFICIAL_URL}
            target="_blank"
            rel="noreferrer"
            className="text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            Anthropic Partner Academy
          </a>{" "}
          の公開ページを手作業で書き写したもので、最新かつ正確である保証はありません。
          受験の判断は必ず公式サイトで確認してください。
        </p>

        <p className="mt-3">
          データの最終確認日: <time dateTime={lastVerifiedAt}>{lastVerifiedAt}</time>
        </p>

        <p className="mt-3">
          進捗データはお使いのブラウザ内にのみ保存され、サーバーには送信されません。
        </p>

        <p className="mt-4">
          <Link
            href="/about"
            className="text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            このサイトについて
          </Link>
          <span className="mx-2 text-line-strong">/</span>
          <a
            href={REPOSITORY_URL}
            target="_blank"
            rel="noreferrer"
            className="text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            GitHub リポジトリ
          </a>
          <span className="mx-2 text-line-strong">/</span>
          <span>MIT License</span>
        </p>
      </div>
    </footer>
  );
}
