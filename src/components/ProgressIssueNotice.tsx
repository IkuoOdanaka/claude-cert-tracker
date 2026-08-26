"use client";

import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { useProgress } from "@/features/progress";

/**
 * 進捗の読み込みで問題が起きたことを、全画面で必ず伝える。
 *
 * ADR 0002 の「壊れていても黙って消さない」は、検出して返すだけでは
 * 果たされない。設定画面を開いた人にしか伝わらない形にもしない。
 */
export function ProgressIssueNotice() {
  const { issue, persistenceFailed, dismissIssue } = useProgress();

  if (!issue && !persistenceFailed) return null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-4">
      {issue ? (
        <Alert
          tone={issue.kind === "partial" ? "warning" : "danger"}
          action={
            <Button size="sm" variant="secondary" onClick={dismissIssue}>
              閉じる
            </Button>
          }
        >
          {issue.kind === "unreadable" ? (
            <p>
              保存されていた進捗を読み取れませんでした。初期状態から始めています。
              読み取れなかったデータは復旧用にブラウザ内へ退避してあります
              （キー: <code className="font-mono text-xs">cct:progress.unreadable</code>）。
            </p>
          ) : null}

          {issue.kind === "newer-version" ? (
            <p>
              保存されていた進捗は、このアプリより新しい形式（version{" "}
              {issue.storedVersion}）です。上書きを避けるため読み込んでいません。
              アプリを最新の状態にしてから開き直してください。
            </p>
          ) : null}

          {issue.kind === "partial" ? (
            <p>
              保存されていた進捗のうち {issue.droppedCount} 件を読み取れず、除外しました。
              残りの進捗はそのまま使えます。
            </p>
          ) : null}
        </Alert>
      ) : null}

      {persistenceFailed ? (
        <Alert tone="danger">
          <p>
            進捗をブラウザに保存できませんでした。プライベートブラウズや保存容量の
            上限が原因のことがあります。この画面を閉じると変更が失われます。
          </p>
        </Alert>
      ) : null}
    </div>
  );
}
