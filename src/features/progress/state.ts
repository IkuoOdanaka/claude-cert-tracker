/**
 * 進捗データに対する純粋な操作。
 *
 * localStorage には一切触れない(それは storage.ts の仕事)。
 * すべて新しい `ProgressState` を返し、引数は変更しない。
 */
import type {
  CourseCheckResult,
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
    courseChecks: {},
    examAttempts: [],
    updatedAt: now.toISOString(),
  };
}

/**
 * 1コースぶんに残す理解度チェックの件数。
 *
 * 「前回 3/5 → 今回 5/5」を出せれば十分なので、全部は残さない。
 * localStorage を無駄に太らせない。
 */
export const COURSE_CHECK_HISTORY_LIMIT = 5;

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
// 理解度チェック
// ---------------------------------------------------------------------------

/** 新しい順。まだ受けていなければ空 */
export function getCourseChecks(
  state: ProgressState,
  courseId: string,
): CourseCheckResult[] {
  return state.courseChecks[courseId] ?? [];
}

/** 直近の結果。コース行に出すのに使う */
export function getLatestCourseCheck(
  state: ProgressState,
  courseId: string,
): CourseCheckResult | undefined {
  return getCourseChecks(state, courseId)[0];
}

export function recordCourseCheck(
  state: ProgressState,
  courseId: string,
  result: CourseCheckResult,
  now: Date = new Date(),
): ProgressState {
  const history = [result, ...getCourseChecks(state, courseId)].slice(
    0,
    COURSE_CHECK_HISTORY_LIMIT,
  );

  return touch(
    { ...state, courseChecks: { ...state.courseChecks, [courseId]: history } },
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
// マージ(インポート時)
// ---------------------------------------------------------------------------

const STATUS_RANK: Record<CourseStatus, number> = {
  "not-started": 0,
  "in-progress": 1,
  completed: 2,
};

/**
 * 2つの進捗を統合する。読み込んだファイルを既存の進捗に足すときに使う。
 *
 * 「どちらかを捨てる」判断が必要になるので、規則を明示しておく:
 *
 * - 目標の資格 … 和集合(既存の並び順を保ち、無いものを後ろに足す)
 * - コースの状態 … **進んでいるほうを採る**(完了 > 学習中 > 未着手)。
 *   マージで学習の記録が巻き戻るのは、ユーザーにとって最も損害が大きいため
 * - 完了時刻 … 両方完了なら**早いほう**(実際に終えたのはその時点)
 * - メモ … 採用したほうが空なら、もう片方を使う。両方にあれば両方残す
 * - 受験履歴 … id で重複を除いた和集合。開始時刻の昇順
 */
export function mergeProgress(
  current: ProgressState,
  incoming: ProgressState,
  now: Date = new Date(),
): ProgressState {
  const selectedCertificationIds = [
    ...current.selectedCertificationIds,
    ...incoming.selectedCertificationIds.filter(
      (id) => !current.selectedCertificationIds.includes(id),
    ),
  ];

  const courses: Record<string, CourseProgress> = { ...current.courses };

  for (const [courseId, incomingCourse] of Object.entries(incoming.courses)) {
    const existing = courses[courseId];

    if (!existing) {
      courses[courseId] = incomingCourse;
      continue;
    }

    const winner =
      STATUS_RANK[incomingCourse.status] > STATUS_RANK[existing.status]
        ? incomingCourse
        : existing;
    const loser = winner === existing ? incomingCourse : existing;

    courses[courseId] = {
      status: winner.status,
      // 完了でない状態に完了時刻を残さない(storage の検証と同じ不変条件)
      completedAt:
        winner.status === "completed"
          ? earlierCompletedAt(existing, incomingCourse)
          : null,
      note: mergeNotes(winner.note, loser.note),
    };
  }

  const attemptsById = new Map(
    [...current.examAttempts, ...incoming.examAttempts].map((attempt) => [
      attempt.id,
      attempt,
    ]),
  );

  return {
    version: CURRENT_VERSION,
    selectedCertificationIds,
    courses,
    courseChecks: mergeCourseChecks(current.courseChecks, incoming.courseChecks),
    examAttempts: [...attemptsById.values()].sort((a, b) =>
      a.startedAt.localeCompare(b.startedAt),
    ),
    updatedAt: now.toISOString(),
  };
}

/**
 * 理解度チェックの履歴を統合する。
 *
 * 同じ受験(時刻とシードが一致)は1つにまとめ、新しい順に並べて上限で切る。
 * どちらかを捨てる判断が要らないので、状態のマージより素直。
 */
function mergeCourseChecks(
  current: Record<string, CourseCheckResult[]>,
  incoming: Record<string, CourseCheckResult[]>,
): Record<string, CourseCheckResult[]> {
  const merged: Record<string, CourseCheckResult[]> = {};

  for (const courseId of new Set([...Object.keys(current), ...Object.keys(incoming)])) {
    const byKey = new Map(
      [...(current[courseId] ?? []), ...(incoming[courseId] ?? [])].map((result) => [
        `${result.checkedAt}:${result.seed}`,
        result,
      ]),
    );

    merged[courseId] = [...byKey.values()]
      .sort((a, b) => b.checkedAt.localeCompare(a.checkedAt))
      .slice(0, COURSE_CHECK_HISTORY_LIMIT);
  }

  return merged;
}

function earlierCompletedAt(a: CourseProgress, b: CourseProgress): string | null {
  const times = [a.completedAt, b.completedAt].filter(
    (value): value is string => value !== null,
  );

  if (times.length === 0) return null;
  return times.sort()[0];
}

function mergeNotes(primary: string, secondary: string): string {
  if (!secondary) return primary;
  if (!primary) return secondary;
  if (primary === secondary) return primary;
  return `${primary}\n${secondary}`;
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
