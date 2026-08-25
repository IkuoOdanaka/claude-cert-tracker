# Claude Cert Tracker

Anthropic の Claude 認定資格を取るための学習トラッカー。
取りたい資格を選ぶと必要なコースが並び、消化状況を記録でき、模擬試験で仕上げられる。

> [!NOTE]
> **Anthropic 非公式の個人プロジェクトです。** Anthropic 社とは無関係で、公式の学習コンテンツや
> 試験問題は一切含みません。掲載している資格・コース情報は
> [Anthropic Partner Academy](https://anthropic-partners.skilljar.com/) の公開ページを
> 手作業で書き写したもので、最新かつ正確であることは保証しません。必ず公式サイトで確認してください。
> 模擬試験の問題はすべてオリジナルで、公式試験問題の転載ではありません。

## できること

- **資格を選ぶ** — Associate / Developer / Architect の4資格を、対象者・価格・総学習時間で比較
- **やることが見える** — 資格ごとの Prep Course を推奨学習順で1リストに
- **進捗を記録する** — コース単位でチェック。進捗バーと残り時間を表示
- **実力を測る** — 出題ドメイン別のオリジナル模擬試験と、弱点コースへの導線

進捗データは**あなたのブラウザの中だけ**に保存されます。サーバーには送信されません。
アカウント登録もログインも不要です。

## 対象の資格

| 資格 | 対象者 | 価格 |
| --- | --- | --- |
| Claude Certified Associate – Foundations | コンサルタント・セールス・デリバリーリード | $99 |
| Claude Certified Developer – Foundations | Claude API / Claude Code / MCP で構築するエンジニア | $125 |
| Claude Certified Architect – Foundations | Claude ソリューションを端から端まで設計するパートナー | $125 |
| Claude Certified Architect – Professional | エンタープライズ向けを設計する上級アーキテクト | $175 |

## 開発

```bash
npm install
npm run dev
```

詳しくは [docs/開発ガイド.md](docs/開発ガイド.md) を参照。

## ドキュメント

- [全体設計](docs/設計.md) — アーキテクチャ、画面構成、模擬試験の設計
- [データモデル](docs/データモデル.md)
- [ロードマップ](docs/ロードマップ.md) — 優先順位の考え方とマイルストーン
- [ADR 0001: 技術選定](docs/adr/0001-技術選定.md)
- [ADR 0002: 進捗データの保存先](docs/adr/0002-進捗データの保存先.md)

## 技術スタック

Next.js 16（App Router / 静的書き出し）+ React 19 + TypeScript + Tailwind CSS v4。
GitHub Pages で配信、バックエンドなし。Node 22 前提（`.node-version` で固定）。

## ライセンス

MIT
