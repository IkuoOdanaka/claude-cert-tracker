"use client";

/**
 * 進捗の状態を React 側に供給する。
 *
 * ここが localStorage と画面のあいだの唯一の接点。コンポーネントは
 * `useProgress()` だけを使い、`localStorage` を直接触らない。
 *
 * ## SSR / 静的書き出しとの付き合い方
 *
 * `output: "export"` のためビルド時に HTML を生成するが、そこに `window` は無い。
 * したがって**初回レンダリングでは進捗を読まない**。`useSyncExternalStore` の
 * `getServerSnapshot` が常に "loading" を返し、クライアントの初回レンダリングも
 * 同じ "loading" スナップショットから始まるため、ハイドレーション不整合が起きない。
 *
 * 進捗の読み込みはストアの `subscribe`(= コミット後)で行う。
 *
 * 進捗に依存する表示は `status === "loading"` のあいだスケルトンにすること。
 * 読み込み前の初期値を「進捗 0%」として描いてはいけない。
 */
import { createContext, useContext, useMemo, useState, useSyncExternalStore } from "react";
import type { CourseStatus, ExamAttempt, ProgressState } from "@/types/domain";
import {
  createInitialProgress,
  recordExamAttempt as recordExamAttemptOp,
  setCourseNote as setCourseNoteOp,
  setCourseStatus as setCourseStatusOp,
  toggleSelectedCertification as toggleSelectedCertificationOp,
} from "./state";
import { createProgressStore, type ProgressSnapshot, type ProgressStore } from "./store";

export type { ProgressStatus } from "./store";

export interface ProgressContextValue extends ProgressSnapshot {
  dismissIssue: () => void;

  toggleCertification: (certificationId: string) => void;
  setCourseStatus: (courseId: string, status: CourseStatus) => void;
  setCourseNote: (courseId: string, note: string) => void;
  recordExamAttempt: (attempt: ExamAttempt) => void;
  /** 進捗のインポート(#7)で、状態をまるごと置き換える */
  replaceProgress: (next: ProgressState) => void;
  resetProgress: () => void;
}

const StoreContext = createContext<ProgressStore | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  // createProgressStore は副作用を持たないので、レンダリング中に作ってよい
  const [store] = useState(createProgressStore);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

/** 進捗の読み書きはすべてこのフック経由で行う。 */
export function useProgress(): ProgressContextValue {
  const store = useContext(StoreContext);

  if (!store) {
    throw new Error(
      "useProgress は ProgressProvider の内側でのみ使えます。app/layout.tsx の設定を確認してください。",
    );
  }

  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  const actions = useMemo(
    () => ({
      dismissIssue: store.dismissIssue,
      toggleCertification: (certificationId: string) =>
        store.update((current) =>
          toggleSelectedCertificationOp(current, certificationId),
        ),
      setCourseStatus: (courseId: string, status: CourseStatus) =>
        store.update((current) => setCourseStatusOp(current, courseId, status)),
      setCourseNote: (courseId: string, note: string) =>
        store.update((current) => setCourseNoteOp(current, courseId, note)),
      recordExamAttempt: (attempt: ExamAttempt) =>
        store.update((current) => recordExamAttemptOp(current, attempt)),
      replaceProgress: (next: ProgressState) => store.update(() => next),
      resetProgress: () => store.update(() => createInitialProgress()),
    }),
    [store],
  );

  return { ...snapshot, ...actions };
}
