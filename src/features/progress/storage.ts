/**
 * localStorage への唯一の窓口。
 *
 * 進捗は単一の JSON として読み書きする(キーを分けると、一部だけ更新に成功して
 * 不整合が残る状態が起きうるため)。
 *
 * 読み込みは必ず検証を通す。localStorage の中身はユーザーが編集できるし、
 * 古いスキーマのまま残ることもある。**壊れていても黙って消さない**のがこのモジュールの約束。
 * 読めなかった生データは復旧用に UNREADABLE_BACKUP_KEY へ退避し、
 * 呼び出し側には `issue` として何が起きたかを返す。
 */
import type {
  CourseCheckResult,
  CourseProgress,
  CourseStatus,
  ExamAnswer,
  ExamAttempt,
  ProgressState,
} from "@/types/domain";
import { CURRENT_VERSION, createInitialProgress } from "./state";

export const STORAGE_KEY = "cct:progress";
/** 読めなかった生データの退避先。ユーザーが手で救い出せるように残す */
export const UNREADABLE_BACKUP_KEY = "cct:progress.unreadable";

export type LoadIssue =
  /** JSON として読めない、または形が想定と違う */
  | { kind: "unreadable"; detail: string }
  /** このビルドより新しいスキーマ。無理に読まず、上書きもしない */
  | { kind: "newer-version"; storedVersion: number }
  /** 全体は読めたが、一部のエントリを捨てた */
  | { kind: "partial"; droppedCount: number };

export interface LoadResult {
  progress: ProgressState;
  /** null なら問題なく読めた(保存が空だった場合を含む) */
  issue: LoadIssue | null;
  /** 保存データが存在したか。空だったのか壊れていたのかを区別するため */
  hadStoredData: boolean;
}

const COURSE_STATUSES: readonly CourseStatus[] = [
  "not-started",
  "in-progress",
  "completed",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCourseStatus(value: unknown): value is CourseStatus {
  return (
    typeof value === "string" &&
    (COURSE_STATUSES as readonly string[]).includes(value)
  );
}

/** 壊れたエントリの件数を数えながら検証するための入れ物 */
class DropCounter {
  count = 0;
  drop(): null {
    this.count += 1;
    return null;
  }
}

function parseCourseProgress(
  value: unknown,
  dropped: DropCounter,
): CourseProgress | null {
  if (!isRecord(value) || !isCourseStatus(value.status)) return dropped.drop();

  const completedAt =
    typeof value.completedAt === "string" ? value.completedAt : null;

  return {
    status: value.status,
    // 完了していないのに時刻が入っている状態は作らない
    completedAt: value.status === "completed" ? completedAt : null,
    note: typeof value.note === "string" ? value.note : "",
  };
}

function parseExamAnswer(value: unknown): ExamAnswer | null {
  if (!isRecord(value) || typeof value.questionId !== "string") return null;

  return {
    questionId: value.questionId,
    selectedChoiceIds: Array.isArray(value.selectedChoiceIds)
      ? value.selectedChoiceIds.filter((id): id is string => typeof id === "string")
      : [],
    correct: value.correct === true,
  };
}

function parseExamAttempt(
  value: unknown,
  dropped: DropCounter,
): ExamAttempt | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.certificationId !== "string" ||
    typeof value.startedAt !== "string"
  ) {
    return dropped.drop();
  }

  return {
    id: value.id,
    certificationId: value.certificationId,
    startedAt: value.startedAt,
    finishedAt: typeof value.finishedAt === "string" ? value.finishedAt : null,
    scorePercent:
      typeof value.scorePercent === "number" && Number.isFinite(value.scorePercent)
        ? value.scorePercent
        : 0,
    answers: Array.isArray(value.answers)
      ? value.answers
          .map(parseExamAnswer)
          .filter((a): a is ExamAnswer => a !== null)
      : [],
  };
}

function parseCourseCheck(
  value: unknown,
  dropped: DropCounter,
): CourseCheckResult | null {
  if (
    !isRecord(value) ||
    typeof value.seed !== "string" ||
    typeof value.checkedAt !== "string" ||
    typeof value.correctCount !== "number" ||
    typeof value.totalCount !== "number" ||
    !Number.isFinite(value.correctCount) ||
    !Number.isFinite(value.totalCount)
  ) {
    return dropped.drop();
  }

  // 正答数が出題数を超える結果は表示すると意味不明になるので受け付けない
  if (value.totalCount < 0 || value.correctCount < 0 || value.correctCount > value.totalCount) {
    return dropped.drop();
  }

  return {
    correctCount: value.correctCount,
    totalCount: value.totalCount,
    seed: value.seed,
    checkedAt: value.checkedAt,
  };
}

function parseCourseChecks(
  value: unknown,
  dropped: DropCounter,
): Record<string, CourseCheckResult[]> {
  // courseChecks は後から足したフィールド。古い保存データには無いので、
  // 無いこと自体は壊れているとみなさない
  if (value === undefined) return {};
  if (!isRecord(value)) {
    dropped.drop();
    return {};
  }

  const checks: Record<string, CourseCheckResult[]> = {};

  for (const [courseId, rawList] of Object.entries(value)) {
    if (!Array.isArray(rawList)) {
      dropped.drop();
      continue;
    }

    const parsed = rawList
      .map((raw) => parseCourseCheck(raw, dropped))
      .filter((result): result is CourseCheckResult => result !== null);

    if (parsed.length > 0) checks[courseId] = parsed;
  }

  return checks;
}

/**
 * 保存されていた値をドメイン型に変換する。
 * 全体の形が想定と違えば null。個々のエントリの壊れは捨てて `dropped` に数える。
 */
function parseProgressState(
  value: unknown,
  dropped: DropCounter,
): ProgressState | null {
  if (!isRecord(value)) return null;
  if (!isRecord(value.courses)) return null;
  if (!Array.isArray(value.selectedCertificationIds)) return null;
  if (!Array.isArray(value.examAttempts)) return null;

  const courses: Record<string, CourseProgress> = {};
  for (const [courseId, raw] of Object.entries(value.courses)) {
    // 未知のコース ID もそのまま残す。data 側からコースが消えても、
    // 戻ってきたときに進捗が復活するように(表示側が無視するだけにする)
    const parsed = parseCourseProgress(raw, dropped);
    if (parsed) courses[courseId] = parsed;
  }

  return {
    version: CURRENT_VERSION,
    selectedCertificationIds: value.selectedCertificationIds.filter(
      (id): id is string => typeof id === "string",
    ),
    courses,
    courseChecks: parseCourseChecks(value.courseChecks, dropped),
    examAttempts: value.examAttempts
      .map((raw) => parseExamAttempt(raw, dropped))
      .filter((a): a is ExamAttempt => a !== null),
    updatedAt:
      typeof value.updatedAt === "string"
        ? value.updatedAt
        : new Date(0).toISOString(),
  };
}

/**
 * 保存文字列を読む。localStorage には触らないので、テストから直接呼べる。
 *
 * 将来スキーマを変えるときは、ここで `version` を見て段階的に変換する。
 */
export function parseStoredProgress(raw: string | null): LoadResult {
  if (raw === null) {
    return {
      progress: createInitialProgress(),
      issue: null,
      hadStoredData: false,
    };
  }

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    return {
      progress: createInitialProgress(),
      issue: {
        kind: "unreadable",
        detail: error instanceof Error ? error.message : "JSON として読めません",
      },
      hadStoredData: true,
    };
  }

  const storedVersion = isRecord(value) ? value.version : undefined;

  if (typeof storedVersion !== "number" || !Number.isFinite(storedVersion)) {
    return {
      progress: createInitialProgress(),
      issue: { kind: "unreadable", detail: "version がありません" },
      hadStoredData: true,
    };
  }

  // 新しいビルドで保存されたデータ。読めるふりをして上書きするほうが危険
  if (storedVersion > CURRENT_VERSION) {
    return {
      progress: createInitialProgress(),
      issue: { kind: "newer-version", storedVersion },
      hadStoredData: true,
    };
  }

  // ここに version ごとのマイグレーションを足していく。
  // 現在は version 1 のみなので変換は不要。

  const dropped = new DropCounter();
  const progress = parseProgressState(value, dropped);

  if (!progress) {
    return {
      progress: createInitialProgress(),
      issue: { kind: "unreadable", detail: "進捗データの形が想定と違います" },
      hadStoredData: true,
    };
  }

  return {
    progress,
    issue: dropped.count > 0 ? { kind: "partial", droppedCount: dropped.count } : null,
    hadStoredData: true,
  };
}

// ---------------------------------------------------------------------------
// localStorage アクセス
// ---------------------------------------------------------------------------

/**
 * localStorage を取得する。
 *
 * SSR / 静的書き出し時には存在しない。Safari のプライベートモードなど、
 * 参照しただけで例外になる環境もあるため try で包む。
 */
function getStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readProgress(): LoadResult {
  const storage = getStorage();
  if (!storage) {
    return {
      progress: createInitialProgress(),
      issue: null,
      hadStoredData: false,
    };
  }

  const raw = storage.getItem(STORAGE_KEY);
  const result = parseStoredProgress(raw);

  // 読めなかった生データは捨てずに退避する。
  // このあと writeProgress で上書きされても、ユーザーが手で救い出せるように
  if (raw !== null && result.issue && result.issue.kind !== "partial") {
    try {
      storage.setItem(UNREADABLE_BACKUP_KEY, raw);
    } catch {
      // 退避に失敗しても読み込み自体は続行する
    }
  }

  return result;
}

/** 書き込みに失敗した場合は false を返す(容量超過など)。 */
export function writeProgress(progress: ProgressState): boolean {
  const storage = getStorage();
  if (!storage) return false;

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function clearProgress(): void {
  getStorage()?.removeItem(STORAGE_KEY);
}

/**
 * 進捗も、読めなかったデータの退避も、すべて消す。
 * 設定画面の「すべて消す」から呼ぶ。ユーザーが全部消したいと言っている以上、
 * 復旧用の退避だけ残しても意味がない。
 */
export function clearAllProgressData(): void {
  const storage = getStorage();
  storage?.removeItem(STORAGE_KEY);
  storage?.removeItem(UNREADABLE_BACKUP_KEY);
}
