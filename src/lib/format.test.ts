import { describe, expect, it } from "vitest";
import { formatDuration, formatPriceUsd } from "./format";

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
