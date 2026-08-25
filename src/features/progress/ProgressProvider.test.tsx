// @vitest-environment jsdom
/**
 * ProgressProvider が静的書き出し(SSG)と噛み合うことを確かめる。
 *
 * ビルド時の HTML に window は無い。クライアントの初回レンダリングもそれに
 * 揃っていないと、ハイドレーション不整合になる。
 *
 * ## どこが歯止めになっているか
 *
 * 整合そのものは `useSyncExternalStore` の `getServerSnapshot` が構造的に
 * 保証している(常に loading スナップショットを返す)。したがって
 * 「ストアがいつ localStorage を読むか」は、もはやハイドレーションの正しさに
 * 影響しない。規約ではなく仕組みで守られている。
 *
 * 代わりに現実的なリスクは `getSnapshot` の参照が毎回変わることで、
 * これは無限レンダリングになる。そこは store.test.ts が直接見ている
 * (壊すとここの hydrate テストも道連れで落ちることを確認済み)。
 *
 * このファイルは Provider〜フックまでを実際に通して、
 * サーバー描画 → hydrate が警告なしに成立することを端から端まで見る。
 */
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProgressProvider, useProgress } from "./ProgressProvider";
import { STORAGE_KEY } from "./storage";

declare global {
  /** React 19 の act を使うために必要 */
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

function Probe() {
  const { status, progress } = useProgress();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="completed">
        {Object.values(progress.courses).filter((c) => c.status === "completed").length}
      </span>
    </div>
  );
}

const tree = (
  <ProgressProvider>
    <Probe />
  </ProgressProvider>
);

const storedProgress = {
  version: 1,
  selectedCertificationIds: [],
  courses: {
    "dev-mso-foundations": {
      status: "completed",
      completedAt: "2026-08-25T10:00:00.000Z",
      note: "",
    },
  },
  examAttempts: [],
  updatedAt: "2026-08-25T10:00:00.000Z",
};

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  document.body.innerHTML = "";
});

describe("静的書き出しとの整合", () => {
  it("レンダリング中に進捗を読まない(localStorage があっても loading)", () => {
    // 保存済みの進捗があっても、レンダリング中に読んではいけない
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedProgress));

    const html = renderToString(tree);

    expect(html).toContain("loading");
    expect(html).not.toContain("ready");
  });

  it("保存済みの進捗があってもハイドレーション警告を出さない", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedProgress));

    // ビルド時に生成された HTML を再現する。
    // このとき localStorage は読まれていない前提
    const container = document.createElement("div");
    container.innerHTML = renderToString(tree);
    document.body.appendChild(container);

    const errors: unknown[][] = [];
    vi.spyOn(console, "error").mockImplementation((...args) => {
      errors.push(args);
    });

    await act(async () => {
      hydrateRoot(container, tree);
    });

    expect(errors).toEqual([]);
  });

  it("hydrate 後に localStorage の進捗が反映される", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedProgress));

    const container = document.createElement("div");
    container.innerHTML = renderToString(tree);
    document.body.appendChild(container);

    expect(container.querySelector('[data-testid="status"]')?.textContent).toBe(
      "loading",
    );

    await act(async () => {
      hydrateRoot(container, tree);
    });

    expect(container.querySelector('[data-testid="status"]')?.textContent).toBe(
      "ready",
    );
    expect(container.querySelector('[data-testid="completed"]')?.textContent).toBe(
      "1",
    );
  });
});

describe("useProgress", () => {
  it("Provider の外で使うと、原因のわかるエラーになる", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderToString(<Probe />)).toThrow(/ProgressProvider の内側/);
  });
});
