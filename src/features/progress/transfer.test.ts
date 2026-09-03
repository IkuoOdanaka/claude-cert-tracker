import { describe, expect, it } from "vitest";
import {
  buildExportFilename,
  parseImportedProgress,
  serializeProgress,
  summarizeProgress,
} from "./transfer";
import {
  createInitialProgress,
  getCourseChecks,
  mergeProgress,
  recordCourseCheck,
  setCourseNote,
  setCourseStatus,
  toggleSelectedCertification,
} from "./state";
import type { ExamAttempt, ProgressState } from "@/types/domain";

const T1 = new Date("2026-08-20T10:00:00.000Z");
const T2 = new Date("2026-08-25T10:00:00.000Z");

function attempt(id: string, startedAt: string): ExamAttempt {
  return {
    id,
    certificationId: "claude-certified-associate-foundations",
    startedAt,
    finishedAt: null,
    scorePercent: 50,
    answers: [],
  };
}

function sample(): ProgressState {
  let state = createInitialProgress(T1);
  state = toggleSelectedCertification(state, "cert-a", T1);
  state = setCourseStatus(state, "course-a", "completed", T1);
  state = setCourseNote(state, "course-a", "メモ", T1);
  state = setCourseStatus(state, "course-b", "in-progress", T1);
  state = recordCourseCheck(
    state,
    "course-a",
    { correctCount: 4, totalCount: 5, seed: "s1", checkedAt: T1.toISOString() },
    T1,
  );
  return state;
}

describe("buildExportFilename", () => {
  it("日付入りのファイル名を作る", () => {
    expect(buildExportFilename(new Date("2026-08-25T10:00:00.000Z"))).toMatch(
      /^claude-cert-tracker-progress-2026-08-\d{2}\.json$/,
    );
  });

  it("月日は2桁でゼロ埋めする", () => {
    expect(buildExportFilename(new Date(2026, 0, 3))).toBe(
      "claude-cert-tracker-progress-2026-01-03.json",
    );
  });
});

describe("書き出し → 読み込み", () => {
  it("往復して元の状態に戻る", () => {
    const original = sample();
    const result = parseImportedProgress(serializeProgress(original));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.progress).toEqual(original);
    expect(result.warning).toBeNull();
  });

  it("人が読めるよう整形して書き出す", () => {
    expect(serializeProgress(sample())).toContain('\n  "version": 1');
  });
});

describe("parseImportedProgress: 受け付けない入力", () => {
  it("空ファイル", () => {
    const result = parseImportedProgress("   ");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("空");
  });

  it("JSON として壊れている", () => {
    const result = parseImportedProgress("{ 壊れている");
    expect(result.ok).toBe(false);
  });

  it("進捗ファイルではない JSON", () => {
    const result = parseImportedProgress(JSON.stringify({ hello: "world" }));
    expect(result.ok).toBe(false);
  });

  it("新しい version は読まずに、理由を伝える", () => {
    const result = parseImportedProgress(
      JSON.stringify({ ...sample(), version: 99 }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("version 99");
  });
});

describe("parseImportedProgress: 一部が壊れている", () => {
  it("読み込めるが、捨てた件数を警告として返す", () => {
    const broken = {
      ...sample(),
      courses: {
        good: { status: "completed", completedAt: null, note: "" },
        bad: { status: "知らない状態", completedAt: null, note: "" },
      },
    };

    const result = parseImportedProgress(JSON.stringify(broken));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warning).toEqual({ kind: "partial", droppedCount: 1 });
    expect(Object.keys(result.progress.courses)).toEqual(["good"]);
  });
});

describe("summarizeProgress", () => {
  it("インポート前に中身を見せるための件数を返す", () => {
    expect(summarizeProgress(sample())).toEqual({
      certificationCount: 1,
      recordedCourseCount: 2,
      completedCourseCount: 1,
      courseCheckCount: 1,
      examAttemptCount: 0,
      updatedAt: T1.toISOString(),
    });
  });
});

describe("mergeProgress", () => {
  it("目標の資格は和集合になる", () => {
    const a = toggleSelectedCertification(createInitialProgress(T1), "cert-a", T1);
    const b = toggleSelectedCertification(createInitialProgress(T1), "cert-b", T1);

    expect(mergeProgress(a, b, T2).selectedCertificationIds).toEqual([
      "cert-a",
      "cert-b",
    ]);
  });

  it("同じ資格が重複しない", () => {
    const a = toggleSelectedCertification(createInitialProgress(T1), "cert-a", T1);

    expect(mergeProgress(a, a, T2).selectedCertificationIds).toEqual(["cert-a"]);
  });

  it("進んでいるほうの状態を採る(学習の記録を巻き戻さない)", () => {
    const done = setCourseStatus(createInitialProgress(T1), "course-a", "completed", T1);
    const doing = setCourseStatus(createInitialProgress(T1), "course-a", "in-progress", T2);

    expect(mergeProgress(doing, done, T2).courses["course-a"].status).toBe("completed");
    expect(mergeProgress(done, doing, T2).courses["course-a"].status).toBe("completed");
  });

  it("両方が完了なら早いほうの完了時刻を残す", () => {
    const early = setCourseStatus(createInitialProgress(T1), "course-a", "completed", T1);
    const late = setCourseStatus(createInitialProgress(T1), "course-a", "completed", T2);

    expect(mergeProgress(late, early, T2).courses["course-a"].completedAt).toBe(
      T1.toISOString(),
    );
  });

  it("完了でない状態に完了時刻を残さない", () => {
    const doing = setCourseStatus(createInitialProgress(T1), "course-a", "in-progress", T1);
    // 不正な形(未完了なのに完了時刻がある)を無理やり作る
    const broken: ProgressState = {
      ...doing,
      courses: {
        "course-a": { status: "in-progress", completedAt: T1.toISOString(), note: "" },
      },
    };

    expect(mergeProgress(doing, broken, T2).courses["course-a"].completedAt).toBeNull();
  });

  it("片方にしかないコースはそのまま残る", () => {
    const a = setCourseStatus(createInitialProgress(T1), "only-a", "completed", T1);
    const b = setCourseStatus(createInitialProgress(T1), "only-b", "completed", T1);

    expect(Object.keys(mergeProgress(a, b, T2).courses).sort()).toEqual([
      "only-a",
      "only-b",
    ]);
  });

  it("メモは失わない。片方が空ならもう片方、両方あれば両方残す", () => {
    const withNote = setCourseNote(
      setCourseStatus(createInitialProgress(T1), "course-a", "completed", T1),
      "course-a",
      "こっちのメモ",
      T1,
    );
    const withoutNote = setCourseStatus(createInitialProgress(T1), "course-a", "completed", T1);
    const otherNote = setCourseNote(
      setCourseStatus(createInitialProgress(T1), "course-a", "completed", T1),
      "course-a",
      "あっちのメモ",
      T1,
    );

    expect(mergeProgress(withoutNote, withNote, T2).courses["course-a"].note).toBe(
      "こっちのメモ",
    );
    expect(mergeProgress(withNote, otherNote, T2).courses["course-a"].note).toBe(
      "こっちのメモ\nあっちのメモ",
    );
    expect(mergeProgress(withNote, withNote, T2).courses["course-a"].note).toBe(
      "こっちのメモ",
    );
  });

  it("受験履歴は id で重複を除き、開始時刻の昇順にする", () => {
    const a: ProgressState = {
      ...createInitialProgress(T1),
      examAttempts: [attempt("x", "2026-08-22T00:00:00.000Z")],
    };
    const b: ProgressState = {
      ...createInitialProgress(T1),
      examAttempts: [
        attempt("x", "2026-08-22T00:00:00.000Z"),
        attempt("y", "2026-08-21T00:00:00.000Z"),
      ],
    };

    expect(mergeProgress(a, b, T2).examAttempts.map((at) => at.id)).toEqual(["y", "x"]);
  });

  it("引数の state を変更しない", () => {
    const a = sample();
    const before = JSON.stringify(a);
    mergeProgress(a, sample(), T2);

    expect(JSON.stringify(a)).toBe(before);
  });
});

describe("mergeProgress: 理解度チェック", () => {
  const check = (correctCount: number, seed: string, checkedAt: string) => ({
    correctCount,
    totalCount: 5,
    seed,
    checkedAt,
  });

  it("同じ受験(時刻とシードが同じ)は重複させない", () => {
    const one = check(3, "s1", "2026-08-20T00:00:00.000Z");
    const a = recordCourseCheck(createInitialProgress(T1), "course-a", one, T1);

    expect(getCourseChecks(mergeProgress(a, a, T2), "course-a")).toHaveLength(1);
  });

  it("別々の受験は両方残り、新しい順に並ぶ", () => {
    const a = recordCourseCheck(
      createInitialProgress(T1),
      "course-a",
      check(3, "s1", "2026-08-20T00:00:00.000Z"),
      T1,
    );
    const b = recordCourseCheck(
      createInitialProgress(T1),
      "course-a",
      check(5, "s2", "2026-08-25T00:00:00.000Z"),
      T1,
    );

    expect(
      getCourseChecks(mergeProgress(a, b, T2), "course-a").map((r) => r.seed),
    ).toEqual(["s2", "s1"]);
  });

  it("片方にしかないコースもそのまま残る", () => {
    const a = recordCourseCheck(
      createInitialProgress(T1),
      "course-a",
      check(3, "s1", "2026-08-20T00:00:00.000Z"),
      T1,
    );
    const b = recordCourseCheck(
      createInitialProgress(T1),
      "course-b",
      check(4, "s2", "2026-08-21T00:00:00.000Z"),
      T1,
    );

    const merged = mergeProgress(a, b, T2);
    expect(Object.keys(merged.courseChecks).sort()).toEqual(["course-a", "course-b"]);
  });
});
