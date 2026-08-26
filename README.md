# Claude Cert Tracker

Anthropic の Claude 認定資格を取るための学習トラッカー。
取りたい資格を選ぶと必要なコースが並び、消化状況を記録でき、模擬試験で仕上げられる。

**https://ikuoodanaka.github.io/claude-cert-tracker/**

> [!NOTE]
> **Anthropic 非公式の個人プロジェクトです。** Anthropic 社とは無関係で、提携・後援関係もありません。
>
> 掲載しているのは [Anthropic Partner Academy](https://anthropic-partners.skilljar.com/) で
> 公開されている**事実情報のみ**です（資格名・レベル・価格・コース名・提供元・形式・所要時間・
> 公式ページの URL）。**公式の説明文・教材・試験問題は、転載も翻訳もしていません。**
> コースの内容は公式ページで確認してください。
>
> 事実情報は自動同期しておらず、最新かつ正確であることは保証しません。受験の判断は必ず公式サイトで。
> 模擬試験の問題はすべてオリジナルで、公式試験問題の転載ではありません。
>
> 「Claude」「Anthropic」は Anthropic PBC の商標です。掲載内容について権利上の懸念がある場合は
> Issue でお知らせください。

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
| Claude Certified Associate – Foundations | コンサルタント／営業／デリバリー担当 | $99 |
| Claude Certified Developer – Foundations | エンジニア（Claude API・Claude Code・MCP） | $125 |
| Claude Certified Architect – Foundations | ソリューションアーキテクト | $125 |
| Claude Certified Architect – Professional | エンタープライズ向けの上級アーキテクト | $175 |

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
