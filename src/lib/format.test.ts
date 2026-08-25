import { describe, expect, it } from "vitest";
import {
  formatCompletedAt,
  formatCourseFormat,
  formatCourseStatus,
  formatDuration,
  formatPriceUsd,
  formatProvider,
} from "./format";

describe("formatDuration", () => {
  it.each([
    [0, "0分"],
    [8, "8分"],
    [59, "59分"],
    [60, "1時間"],
    [90, "1時間30分"],
    [389, "6時間29分"],
    [774, "12時間54分"],
  ])("%i分 → %s", (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected);
  });

  it("負の値でも壊れない", () => {
    expect(formatDuration(-10)).toBe("0分");
  });

  it("端数は分に丸める", () => {
    expect(formatDuration(90.4)).toBe("1時間30分");
  });
});

describe("formatPriceUsd", () => {
  it.each([
    [99, "$99 USD"],
    [125, "$125 USD"],
    [1250, "$1,250 USD"],
  ])("%i → %s", (usd, expected) => {
    expect(formatPriceUsd(usd)).toBe(expected);
  });
});

describe("ラベル", () => {
  it("提供元をパートナー限定/一般公開で区別する", () => {
    expect(formatProvider("partner-academy")).toBe("パートナー限定");
    expect(formatProvider("anthropic-academy")).toBe("一般公開");
  });

  it("コース形式を日本語にする", () => {
    expect(formatCourseFormat("video")).toBe("動画");
    expect(formatCourseFormat("hands-on")).toBe("ハンズオン");
    expect(formatCourseFormat("reading")).toBe("読み物");
  });

  it("コースの状態を日本語にする", () => {
    expect(formatCourseStatus("not-started")).toBe("未着手");
    expect(formatCourseStatus("in-progress")).toBe("学習中");
    expect(formatCourseStatus("completed")).toBe("完了");
  });
});

describe("formatCompletedAt", () => {
  it("日付として表示する", () => {
    expect(formatCompletedAt("2026-08-25T04:00:00.000Z")).toContain("2026");
  });

  it("壊れた値では空文字を返す(画面に Invalid Date を出さない)", () => {
    expect(formatCompletedAt("これは日付ではない")).toBe("");
  });
});
