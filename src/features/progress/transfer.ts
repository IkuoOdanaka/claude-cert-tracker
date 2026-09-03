/**
 * 進捗の書き出し・読み込み。
 *
 * 検証は storage.ts の `parseStoredProgress` をそのまま使う。
 * localStorage から読むときとファイルから読むときで検証がズレると、
 * 「保存はできるのにインポートできない」ような食い違いが起きるため。
 */
import type { ProgressState } from "@/types/domain";
import { parseStoredProgress, type LoadIssue } from "./storage";

export const EXPORT_MIME_TYPE = "application/json";

/** 例: claude-cert-tracker-progress-2026-08-25.json */
export function buildExportFilename(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `claude-cert-tracker-progress-${yyyy}-${mm}-${dd}.json`;
}

/** 人が開いて中身を確認できるよう、整形して書き出す */
export function serializeProgress(progress: ProgressState): string {
  return `${JSON.stringify(progress, null, 2)}\n`;
}

export type ImportResult =
  | {
      ok: true;
      progress: ProgressState;
      /** 一部のエントリを捨てた場合の注意。読み込み自体は成功している */
      warning: LoadIssue | null;
    }
  | { ok: false; message: string };

/**
 * 読み込んだファイルの中身を検証する。
 *
 * **ここでは何も適用しない。** 適用するかどうかは呼び出し側が決める
 * (壊れたファイルで既存の進捗を壊さないため)。
 */
export function parseImportedProgress(text: string): ImportResult {
  const trimmed = text.trim();

  if (trimmed === "") {
    return { ok: false, message: "ファイルが空です。" };
  }

  const result = parseStoredProgress(trimmed);

  if (result.issue?.kind === "unreadable") {
    return {
      ok: false,
      message:
        "進捗ファイルとして読み取れませんでした。このアプリで書き出した JSON か確認してください。",
    };
  }

  if (result.issue?.kind === "newer-version") {
    return {
      ok: false,
      message: `このファイルは新しい形式（version ${result.issue.storedVersion}）です。アプリを最新の状態にしてから読み込んでください。`,
    };
  }

  return {
    ok: true,
    progress: result.progress,
    warning: result.issue,
  };
}

/** インポート前に「何が入っているか」を見せるための要約 */
export interface ProgressSummary {
  certificationCount: number;
  recordedCourseCount: number;
  completedCourseCount: number;
  courseCheckCount: number;
  examAttemptCount: number;
  updatedAt: string;
}

export function summarizeProgress(progress: ProgressState): ProgressSummary {
  const courses = Object.values(progress.courses);

  return {
    certificationCount: progress.selectedCertificationIds.length,
    recordedCourseCount: courses.length,
    completedCourseCount: courses.filter((c) => c.status === "completed").length,
    courseCheckCount: Object.values(progress.courseChecks).reduce(
      (sum, results) => sum + results.length,
      0,
    ),
    examAttemptCount: progress.examAttempts.length,
    updatedAt: progress.updatedAt,
  };
}
