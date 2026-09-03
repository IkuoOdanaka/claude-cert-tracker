import { describe, expect, it } from "vitest";
import type { ExamAttempt, ProgressState } from "@/types/domain";
import {
  COURSE_CHECK_HISTORY_LIMIT,
  createInitialProgress,
  getCourseChecks,
  getLatestCourseCheck,
  recordCourseCheck,
  getCourseProgress,
  isCertificationSelected,
  listCompletedCourses,
  recordExamAttempt,
  setCourseNote,
  setCourseStatus,
  summarizeCertificationProgress,
  toggleSelectedCertification,
} from "./state";

const T1 = new Date("2026-08-25T10:00:00.000Z");
const T2 = new Date("2026-08-26T10:00:00.000Z");

function attempt(id: string): ExamAttempt {
  return {
    id,
    certificationId: "claude-certified-associate-foundations",
    startedAt: T1.toISOString(),
    finishedAt: T1.toISOString(),
    scorePercent: 80,
    answers: [],
  };
}

describe("createInitialProgress", () => {
  it("空の状態を返す", () => {
    const state = createInitialProgress(T1);

    expect(state).toEqual({
      version: 1,
      selectedCertificationIds: [],
      courses: {},
      courseChecks: {},
      examAttempts: [],
      updatedAt: T1.toISOString(),
    });
  });
});

describe("toggleSelectedCertification", () => {
  it("選択と解除を切り替える", () => {
    const initial = createInitialProgress(T1);

    const selected = toggleSelectedCertification(initial, "cert-a", T2);
    expect(isCertificationSelected(selected, "cert-a")).toBe(true);

    const unselected = toggleSelectedCertification(selected, "cert-a", T2);
    expect(isCertificationSelected(unselected, "cert-a")).toBe(false);
  });

  it("引数の state を変更しない", () => {
    const initial = createInitialProgress(T1);
    toggleSelectedCertification(initial, "cert-a", T2);

    expect(initial.selectedCertificationIds).toEqual([]);
  });

  it("updatedAt を更新する", () => {
    const state = toggleSelectedCertification(createInitialProgress(T1), "cert-a", T2);
    expect(state.updatedAt).toBe(T2.toISOString());
  });
});

describe("setCourseStatus", () => {
  it("completed にしたとき完了時刻を記録する", () => {
    const state = setCourseStatus(createInitialProgress(T1), "course-a", "completed", T2);

    expect(getCourseProgress(state, "course-a")).toEqual({
      status: "completed",
      completedAt: T2.toISOString(),
      note: "",
    });
  });

  it("すでに completed なら完了時刻を動かさない", () => {
    const first = setCourseStatus(createInitialProgress(T1), "course-a", "completed", T1);
    const again = setCourseStatus(first, "course-a", "completed", T2);

    expect(getCourseProgress(again, "course-a").completedAt).toBe(T1.toISOString());
  });

  it("completed から外したら完了時刻を消す", () => {
    const completed = setCourseStatus(createInitialProgress(T1), "course-a", "completed", T1);
    const reopened = setCourseStatus(completed, "course-a", "in-progress", T2);

    expect(getCourseProgress(reopened, "course-a")).toMatchObject({
      status: "in-progress",
      completedAt: null,
    });
  });

  it("メモを保ったままステータスだけ変える", () => {
    const noted = setCourseNote(createInitialProgress(T1), "course-a", "MSO を再確認", T1);
    const completed = setCourseStatus(noted, "course-a", "completed", T2);

    expect(getCourseProgress(completed, "course-a").note).toBe("MSO を再確認");
  });
});

describe("getCourseProgress", () => {
  it("未記録のコースは not-started として返す", () => {
    expect(getCourseProgress(createInitialProgress(T1), "never-touched")).toEqual({
      status: "not-started",
      completedAt: null,
      note: "",
    });
  });
});

describe("summarizeCertificationProgress", () => {
  const base = (): ProgressState => {
    let state = createInitialProgress(T1);
    state = setCourseStatus(state, "a", "completed", T1);
    state = setCourseStatus(state, "b", "in-progress", T1);
    return state;
  };

  it("完了数・進行中・全体と割合を返す", () => {
    expect(summarizeCertificationProgress(base(), ["a", "b", "c", "d"])).toEqual({
      completedCount: 1,
      inProgressCount: 1,
      totalCount: 4,
      percent: 25,
    });
  });

  it("コースが0件でも 0% として壊れない", () => {
    expect(summarizeCertificationProgress(base(), [])).toEqual({
      completedCount: 0,
      inProgressCount: 0,
      totalCount: 0,
      percent: 0,
    });
  });

  it("進捗側に残った未知のコースは、渡されない限り集計に影響しない", () => {
    let state = base();
    state = setCourseStatus(state, "removed-from-data", "completed", T1);

    // data 側に実在するコースだけを渡す想定
    expect(summarizeCertificationProgress(state, ["a", "b"]).completedCount).toBe(1);
  });
});

describe("listCompletedCourses", () => {
  it("完了したコースだけを完了時刻の新しい順で返す", () => {
    let state = createInitialProgress(T1);
    state = setCourseStatus(state, "old", "completed", T1);
    state = setCourseStatus(state, "new", "completed", T2);
    state = setCourseStatus(state, "doing", "in-progress", T2);

    expect(listCompletedCourses(state)).toEqual([
      { courseId: "new", completedAt: T2.toISOString() },
      { courseId: "old", completedAt: T1.toISOString() },
    ]);
  });
});

describe("recordExamAttempt", () => {
  it("受験結果を末尾に足す", () => {
    const state = recordExamAttempt(
      recordExamAttempt(createInitialProgress(T1), attempt("first"), T1),
      attempt("second"),
      T2,
    );

    expect(state.examAttempts.map((a) => a.id)).toEqual(["first", "second"]);
  });
});

describe("理解度チェックの記録", () => {
  const result = (correctCount: number, seed: string, checkedAt: Date) => ({
    correctCount,
    totalCount: 5,
    seed,
    checkedAt: checkedAt.toISOString(),
  });

  it("まだ受けていないコースは空", () => {
    const state = createInitialProgress(T1);

    expect(getCourseChecks(state, "course-a")).toEqual([]);
    expect(getLatestCourseCheck(state, "course-a")).toBeUndefined();
  });

  it("新しい結果が先頭に来る", () => {
    let state = createInitialProgress(T1);
    state = recordCourseCheck(state, "course-a", result(3, "s1", T1), T1);
    state = recordCourseCheck(state, "course-a", result(5, "s2", T2), T2);

    expect(getCourseChecks(state, "course-a").map((r) => r.correctCount)).toEqual([5, 3]);
    expect(getLatestCourseCheck(state, "course-a")?.correctCount).toBe(5);
  });

  it("コースごとに分かれて記録される", () => {
    let state = createInitialProgress(T1);
    state = recordCourseCheck(state, "course-a", result(3, "s1", T1), T1);
    state = recordCourseCheck(state, "course-b", result(4, "s2", T1), T1);

    expect(getCourseChecks(state, "course-a")).toHaveLength(1);
    expect(getCourseChecks(state, "course-b")).toHaveLength(1);
  });

  it("上限を超えた古い結果は捨てる", () => {
    let state = createInitialProgress(T1);
    for (let i = 0; i < COURSE_CHECK_HISTORY_LIMIT + 3; i += 1) {
      state = recordCourseCheck(state, "course-a", result(i, `s${i}`, T1), T1);
    }

    const checks = getCourseChecks(state, "course-a");
    expect(checks).toHaveLength(COURSE_CHECK_HISTORY_LIMIT);
    // 直近のものが残っている
    expect(checks[0].seed).toBe(`s${COURSE_CHECK_HISTORY_LIMIT + 2}`);
  });

  it("引数の state を変更しない", () => {
    const state = createInitialProgress(T1);
    recordCourseCheck(state, "course-a", result(3, "s1", T1), T1);

    expect(state.courseChecks).toEqual({});
  });
});
