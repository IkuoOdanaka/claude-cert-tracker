/**
 * デザイントークンのコントラスト検証。
 *
 * 「ライト/ダークどちらでもコントラストが AA を満たす」は、目視では判断を外す。
 * globals.css から実際の値を読んで計算し、CI で止められるようにしておく。
 *
 * WCAG 2.1 の基準:
 * - 通常サイズの文字        4.5:1
 * - UI コンポーネントの輪郭 3:1 (1.4.11)
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  path.resolve(__dirname, "../src/app/globals.css"),
  "utf8",
);

function extractTokens(marker: "light" | "dark"): Record<string, string> {
  const pattern =
    marker === "light"
      ? /\/\* --- light --- \*\/\s*:root\s*\{([^}]*)\}/
      : /\/\* --- dark --- \*\/\s*@media[^{]*\{\s*:root\s*\{([^}]*)\}/;

  const block = css.match(pattern);
  if (!block) throw new Error(`globals.css から ${marker} のトークンを取り出せません`);

  const tokens: Record<string, string> = {};
  for (const [, name, value] of block[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6});/g)) {
    tokens[name] = value;
  }
  return tokens;
}

function relativeLuminance(hex: string): number {
  const channels = [0, 2, 4]
    .map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a: string, b: string): number {
  const [high, low] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  );
  return (high + 0.05) / (low + 0.05);
}

/** [説明, 前景トークン, 背景トークン, 必要比] */
const REQUIREMENTS: [string, string, string, number][] = [
  ["本文 / ページ背景", "ink", "canvas", 4.5],
  ["本文 / カード", "ink", "surface", 4.5],
  ["補足文 / ページ背景", "ink-muted", "canvas", 4.5],
  ["補足文 / カード", "ink-muted", "surface", 4.5],
  ["リンク文字 / ページ背景", "accent", "canvas", 4.5],
  ["リンク文字 / カード", "accent", "surface", 4.5],
  ["主ボタンの文字 / 主ボタン", "on-accent", "accent", 4.5],
  ["アクセント文字 / 淡色地", "accent", "accent-soft", 4.5],
  ["成功 / カード", "success", "surface", 4.5],
  ["注意 / カード", "warning", "surface", 4.5],
  ["危険 / カード", "danger", "surface", 4.5],
  // セグメント(コースの状態)の選択中: 中立色の反転
  ["選択中セグメントの文字 / 反転地", "canvas", "ink", 4.5],
  // 操作要素の輪郭。line(装飾用)ではなく line-strong を使うこと
  ["操作要素の輪郭 / カード", "line-strong", "surface", 3],
  ["操作要素の輪郭 / ページ背景", "line-strong", "canvas", 3],
  ["フォーカスリング / ページ背景", "accent", "canvas", 3],
  ["フォーカスリング / カード", "accent", "surface", 3],
];

describe.each(["light", "dark"] as const)("%s テーマ", (theme) => {
  const tokens = extractTokens(theme);

  it("必要なトークンがすべて定義されている", () => {
    const names = new Set(Object.keys(tokens));
    const used = new Set(REQUIREMENTS.flatMap(([, fg, bg]) => [fg, bg]));

    for (const name of used) {
      expect(names.has(name), `--${name} が未定義`).toBe(true);
    }
  });

  it.each(REQUIREMENTS)("%s は %s/%s で %s:1 以上", (label, fg, bg, required) => {
    const ratio = contrast(tokens[fg], tokens[bg]);

    expect(
      ratio,
      `${label}: --${fg} (${tokens[fg]}) on --${bg} (${tokens[bg]}) = ${ratio.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(required);
  });
});

describe("テーマ間の整合", () => {
  it("light と dark で同じトークンが定義されている", () => {
    expect(Object.keys(extractTokens("dark")).sort()).toEqual(
      Object.keys(extractTokens("light")).sort(),
    );
  });
});
