// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  STORAGE_KEY,
  UNREADABLE_BACKUP_KEY,
  clearProgress,
  parseStoredProgress,
  readProgress,
  writeProgress,
} from "./storage";
import { createInitialProgress, setCourseStatus } from "./state";

beforeEach(() => {
  localStorage.clear();
});

const validStored = {
  version: 1,
  selectedCertificationIds: ["claude-certified-developer-foundations"],
  courses: {
    "dev-mso-foundations": {
      status: "completed",
      completedAt: "2026-08-25T10:00:00.000Z",
      note: "済み",
    },
  },
  examAttempts: [],
  updatedAt: "2026-08-25T10:00:00.000Z",
};

describe("parseStoredProgress: 保存が空", () => {
  it("初期状態を返し、問題なしとして扱う", () => {
    const result = parseStoredProgress(null);

    expect(result.issue).toBeNull();
    expect(result.hadStoredData).toBe(false);
    expect(result.progress.courses).toEqual({});
  });
});

describe("parseStoredProgress: 正常系", () => {
  it("保存された進捗を復元する", () => {
    const result = parseStoredProgress(JSON.stringify(validStored));

    expect(result.issue).toBeNull();
    expect(result.hadStoredData).toBe(true);
    expect(result.progress.selectedCertificationIds).toEqual([
      "claude-certified-developer-foundations",
    ]);
    expect(result.progress.courses["dev-mso-foundations"].status).toBe("completed");
  });

  it("data から消えたコースの進捗もそのまま保持する", () => {
    const stored = {
      ...validStored,
      courses: {
        ...validStored.courses,
        "removed-from-data": { status: "completed", completedAt: null, note: "" },
      },
    };

    const result = parseStoredProgress(JSON.stringify(stored));

    // 表示側が無視するだけで、保存データからは消さない
    expect(result.progress.courses).toHaveProperty("removed-from-data");
    expect(result.issue).toBeNull();
  });
});

describe("parseStoredProgress: 壊れた JSON", () => {
  it("初期状態にフォールバックし、unreadable として報告する", () => {
    const result = parseStoredProgress("{ これは JSON ではない");

    expect(result.issue?.kind).toBe("unreadable");
    expect(result.hadStoredData).toBe(true);
    expect(result.progress.courses).toEqual({});
  });

  it("JSON ではあるが形が違う場合も unreadable", () => {
    expect(parseStoredProgress(JSON.stringify([1, 2, 3])).issue?.kind).toBe("unreadable");
    expect(
      parseStoredProgress(JSON.stringify({ version: 1, courses: "文字列" })).issue?.kind,
    ).toBe("unreadable");
  });

  it("version が無い場合も unreadable", () => {
    const withoutVersion = Object.fromEntries(
      Object.entries(validStored).filter(([key]) => key !== "version"),
    );
    const result = parseStoredProgress(JSON.stringify(withoutVersion));

    expect(result.issue).toEqual({ kind: "unreadable", detail: "version がありません" });
  });
});

describe("parseStoredProgress: 未知の version", () => {
  it("新しいスキーマは読まずに newer-version として報告する", () => {
    const result = parseStoredProgress(JSON.stringify({ ...validStored, version: 99 }));

    expect(result.issue).toEqual({ kind: "newer-version", storedVersion: 99 });
    expect(result.progress.courses).toEqual({});
  });
});

describe("parseStoredProgress: 一部だけ壊れている", () => {
  it("壊れたエントリを捨て、件数を partial として報告する", () => {
    const stored = {
      ...validStored,
      courses: {
        "good-course": { status: "completed", completedAt: null, note: "" },
        "bad-status": { status: "終わった", completedAt: null, note: "" },
        "not-an-object": 42,
      },
      examAttempts: [{ id: "no-certification-id" }],
    };

    const result = parseStoredProgress(JSON.stringify(stored));

    expect(result.issue).toEqual({ kind: "partial", droppedCount: 3 });
    expect(Object.keys(result.progress.courses)).toEqual(["good-course"]);
    expect(result.progress.examAttempts).toEqual([]);
  });

  it("completed でないのに完了時刻が入っている矛盾を正す", () => {
    const stored = {
      ...validStored,
      courses: {
        weird: { status: "in-progress", completedAt: "2026-08-25T10:00:00.000Z", note: "" },
      },
    };

    expect(parseStoredProgress(JSON.stringify(stored)).progress.courses.weird)
      .toEqual({ status: "in-progress", completedAt: null, note: "" });
  });

  it("selectedCertificationIds の文字列でない要素を落とす", () => {
    const stored = { ...validStored, selectedCertificationIds: ["ok", 123, null] };

    expect(parseStoredProgress(JSON.stringify(stored)).progress.selectedCertificationIds)
      .toEqual(["ok"]);
  });
});

describe("readProgress / writeProgress", () => {
  it("書いたものを読み戻せる", () => {
    const state = setCourseStatus(createInitialProgress(), "course-a", "completed");

    expect(writeProgress(state)).toBe(true);
    expect(readProgress().progress).toEqual(state);
  });

  it("保存が空なら初期状態を返す", () => {
    const result = readProgress();

    expect(result.hadStoredData).toBe(false);
    expect(result.issue).toBeNull();
  });

  it("読めなかった生データを退避して失わないようにする", () => {
    const broken = "{ 壊れている";
    localStorage.setItem(STORAGE_KEY, broken);

    const result = readProgress();

    expect(result.issue?.kind).toBe("unreadable");
    expect(localStorage.getItem(UNREADABLE_BACKUP_KEY)).toBe(broken);
  });

  it("新しい version のデータも退避する(上書きされても救い出せるように)", () => {
    const raw = JSON.stringify({ ...validStored, version: 99 });
    localStorage.setItem(STORAGE_KEY, raw);

    readProgress();

    expect(localStorage.getItem(UNREADABLE_BACKUP_KEY)).toBe(raw);
  });

  it("正常に読めたときは退避しない", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validStored));

    readProgress();

    expect(localStorage.getItem(UNREADABLE_BACKUP_KEY)).toBeNull();
  });
});

describe("clearProgress", () => {
  it("進捗を消す", () => {
    writeProgress(createInitialProgress());
    clearProgress();

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
