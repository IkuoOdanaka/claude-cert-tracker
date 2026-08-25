/**
 * 進捗の外部ストア。
 *
 * React の外側に状態を持ち、`useSyncExternalStore` から購読する。
 * 「マウント後に localStorage を読んで setState する」形にしないのは、
 *
 * - effect 内の setState は連鎖レンダリングを生む(react-hooks/set-state-in-effect)
 * - `getServerSnapshot` があるので、SSR / 静的書き出しとの整合を**仕組みで**保証できる
 * - 別タブでの変更(storage イベント)を同じ経路で拾える
 *
 * ため。localStorage の読み書きそのものは storage.ts に委ねる。
 */
import type { ProgressState } from "@/types/domain";
import { createInitialProgress } from "./state";
import {
  STORAGE_KEY,
  readProgress,
  writeProgress,
  type LoadIssue,
} from "./storage";

export type ProgressStatus = "loading" | "ready";

export interface ProgressSnapshot {
  status: ProgressStatus;
  progress: ProgressState;
  /** 読み込み時に起きた問題。null なら正常 */
  issue: LoadIssue | null;
  /** 保存に失敗している(容量超過やプライベートモードなど) */
  persistenceFailed: boolean;
}

export interface ProgressStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => ProgressSnapshot;
  /** ビルド時(サーバー)のスナップショット。常に loading */
  getServerSnapshot: () => ProgressSnapshot;
  update: (operation: (current: ProgressState) => ProgressState) => void;
  dismissIssue: () => void;
}

/**
 * 進捗ストアを1つ作る。
 *
 * 副作用は `subscribe` が呼ばれるまで起こさない(= レンダリング中に window に触らない)。
 * 生成を関数にしているのはテストごとに状態を分離するため。
 */
export function createProgressStore(): ProgressStore {
  // サーバーとクライアントの初回レンダリングで同じ参照を返す必要があるため、
  // このオブジェクトは使い回す
  const loadingSnapshot: ProgressSnapshot = {
    status: "loading",
    progress: createInitialProgress(new Date(0)),
    issue: null,
    persistenceFailed: false,
  };

  let snapshot: ProgressSnapshot = loadingSnapshot;
  let loaded = false;
  const listeners = new Set<() => void>();

  function emit() {
    for (const listener of listeners) listener();
  }

  function setSnapshot(next: ProgressSnapshot) {
    snapshot = next;
    emit();
  }

  function load() {
    const result = readProgress();
    setSnapshot({
      status: "ready",
      progress: result.progress,
      issue: result.issue,
      persistenceFailed: false,
    });
  }

  /** 別タブで進捗が変わったら取り込む */
  function handleStorageEvent(event: StorageEvent) {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    load();
  }

  return {
    subscribe(listener) {
      // 最初の購読者が付いたときだけ、読み込みと storage 監視を始める。
      // subscribe はコミット後に呼ばれるので、ここで window に触ってよい
      if (listeners.size === 0) {
        window.addEventListener("storage", handleStorageEvent);
      }
      listeners.add(listener);

      if (!loaded) {
        loaded = true;
        load();
      }

      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          window.removeEventListener("storage", handleStorageEvent);
        }
      };
    },

    getSnapshot: () => snapshot,
    getServerSnapshot: () => loadingSnapshot,

    update(operation) {
      const progress = operation(snapshot.progress);
      const persisted = writeProgress(progress);

      setSnapshot({
        status: "ready",
        progress,
        issue: snapshot.issue,
        persistenceFailed: !persisted,
      });
    },

    dismissIssue() {
      if (snapshot.issue === null) return;
      setSnapshot({ ...snapshot, issue: null });
    },
  };
}
