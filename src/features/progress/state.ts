/**
 * 進捗データに対する純粋な操作。
 *
 * localStorage には一切触れない(それは storage.ts の仕事)。
 * すべて新しい `ProgressState` を返し、引数は変更しない。
 */
import type {
  CourseProgress,
  CourseStatus,
  ExamAttempt,
  ProgressState,
} from "@/types/domain";

export const CURRENT_VERSION = 1 as const;

const NOT_STARTED: CourseProgress = {
  status: "not-started",
  completedAt: null,
  note: "",
};

export function createInitialProgress(now: Date = new Date()): ProgressState {
  return {
    version: CURRENT_VERSION,
    selectedCertificationIds: [],
    courses: {},
    examAttempts: [],
    updatedAt: now.toISOString(),
  };
}

function touch(state: ProgressState, now: Date): ProgressState {
  return { ...state, updatedAt: now.toISOString() };
}

// ---------------------------------------------------------------------------
// 目標にする資格
// ---------------------------------------------------------------------------

export function isCertificationSelected(
  state: ProgressState,
  certificationId: string,
): boolean {
  return state.selectedCertificationIds.includes(certificationId);
}

export function toggleSelectedCertification(
  state: ProgressState,
  certificationId: string,
  now: Date = new Date(),
): ProgressState {
  const selected = isCertificationSelected(state, certificationId);

  return touch(
    {
      ...state,
      selectedCertificationIds: selected
        ? state.selectedCertificationIds.filter((id) => id !== certificationId)
        : [...state.selectedCertificationIds, certificationId],
    },
    now,
  );
}

// ---------------------------------------------------------------------------
// コースの進捗
// ---------------------------------------------------------------------------

/** 未記録のコースは "not-started" として扱う。呼び出し側で存在チェックをさせないため。 */
export function getCourseProgress(
  state: ProgressState,
  courseId: string,
): CourseProgress {
  return state.courses[courseId] ?? NOT_STARTED;
}

export function setCourseStatus(
  state: ProgressState,
  courseId: string,
  status: CourseStatus,
  now: Date = new Date(),
): ProgressState {
  const current = getCourseProgress(state, courseId);

  return touch(
    {
      ...state,
      courses: {
        ...state.courses,
        [courseId]: {
          ...current,
          status,
          // 完了に入ったときだけ時刻を記録し、完了から出たら消す。
          // すでに完了なら時刻は動かさない(チェックし直しで日付が変わらないように)
          completedAt:
            status === "completed"
              ? (current.completedAt ?? now.toISOString())
              : null,
        },
      },
    },
    now,
  );
}

export function setCourseNote(
  state: ProgressState,
  courseId: string,
  note: string,
  now: Date = new Date(),
): ProgressState {
  return touch(
    {
      ...state,
      courses: {
        ...state.courses,
        [courseId]: { ...getCourseProgress(state, courseId), note },
      },
    },
    now,
  );
}

// ---------------------------------------------------------------------------
// 模擬試験
// ---------------------------------------------------------------------------

export function recordExamAttempt(
  state: ProgressState,
  attempt: ExamAttempt,
  now: Date = new Date(),
): ProgressState {
  return touch(
    { ...state, examAttempts: [...state.examAttempts, attempt] },
    now,
  );
}

// ---------------------------------------------------------------------------
// 集計
// ---------------------------------------------------------------------------

export interface CertificationProgressSummary {
  completedCount: number;
  inProgressCount: number;
  totalCount: number;
  /** 0-100 の整数。totalCount が 0 のときは 0 */
  percent: number;
}

/**
 * 資格1つぶんの進捗を集計する。
 *
 * `courseIds` は `getCoursesFor()` が返した**実在するコース**の ID を渡すこと。
 * 進捗側に残っている未知の ID は、ここに渡らないので自然に無視される。
 */
export function summarizeCertificationProgress(
  state: ProgressState,
  courseIds: readonly string[],
): CertificationProgressSummary {
  let completedCount = 0;
  let inProgressCount = 0;

  for (const courseId of courseIds) {
    const { status } = getCourseProgress(state, courseId);
    if (status === "completed") completedCount += 1;
    else if (status === "in-progress") inProgressCount += 1;
  }

  const totalCount = courseIds.length;

  return {
    completedCount,
    inProgressCount,
    totalCount,
    percent: totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100),
  };
}

/** 完了したコースを完了時刻の新しい順に返す。ダッシュボードの「直近の学習」に使う。 */
export function listCompletedCourses(
  state: ProgressState,
): { courseId: string; completedAt: string }[] {
  return Object.entries(state.courses)
    .filter(
      (entry): entry is [string, CourseProgress & { completedAt: string }] =>
        entry[1].status === "completed" && entry[1].completedAt !== null,
    )
    .map(([courseId, progress]) => ({
      courseId,
      completedAt: progress.completedAt,
    }))
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}
