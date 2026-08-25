/**
 * 進捗レイヤーの公開窓口。
 *
 * 画面側はここから import する。`storage.ts` を直接使ってよいのは
 * このレイヤーの内部と、進捗のインポート/エクスポート(#7)だけ。
 */
export { ProgressProvider, useProgress } from "./ProgressProvider";
export type { ProgressContextValue, ProgressStatus } from "./ProgressProvider";
export type { ProgressSnapshot } from "./store";
export type { LoadIssue, LoadResult } from "./storage";
export { STORAGE_KEY, UNREADABLE_BACKUP_KEY } from "./storage";
export {
  CURRENT_VERSION,
  createInitialProgress,
  getCourseProgress,
  isCertificationSelected,
  listCompletedCourses,
  summarizeCertificationProgress,
} from "./state";
export type { CertificationProgressSummary } from "./state";
