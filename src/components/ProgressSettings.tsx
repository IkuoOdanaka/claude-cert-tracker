"use client";

import { useRef, useState } from "react";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { Card, CardBody } from "@/components/Card";
import { Skeleton } from "@/components/Skeleton";
import {
  buildExportFilename,
  clearAllProgressData,
  createInitialProgress,
  EXPORT_MIME_TYPE,
  mergeProgress,
  parseImportedProgress,
  serializeProgress,
  summarizeProgress,
  useProgress,
} from "@/features/progress";
import { formatCompletedAt } from "@/lib/format";
import type { ProgressState } from "@/types/domain";

type ImportState =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      fileName: string;
      progress: ProgressState;
      warningText: string | null;
    };

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold text-ink">{children}</h2>;
}

function SummaryList({ progress }: { progress: ProgressState }) {
  const summary = summarizeProgress(progress);

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <dt className="text-ink-muted">目標の資格</dt>
      <dd className="text-ink">{summary.certificationCount} 件</dd>
      <dt className="text-ink-muted">記録のあるコース</dt>
      <dd className="text-ink">
        {summary.recordedCourseCount} 件（うち完了 {summary.completedCourseCount} 件）
      </dd>
      <dt className="text-ink-muted">模擬試験の受験</dt>
      <dd className="text-ink">{summary.examAttemptCount} 件</dd>
      <dt className="text-ink-muted">最終更新</dt>
      <dd className="text-ink">{formatCompletedAt(summary.updatedAt) || "不明"}</dd>
    </dl>
  );
}

export function ProgressSettings() {
  const { status, progress, replaceProgress } = useProgress();
  const [importState, setImportState] = useState<ImportState>({ kind: "idle" });
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loading = status === "loading";

  function resetFileInput() {
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleExport() {
    const blob = new Blob([serializeProgress(progress)], { type: EXPORT_MIME_TYPE });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = buildExportFilename();

    // Firefox はリンクが DOM に無いとダウンロードを開始しない。
    // revoke も click の直後に同期で行うとダウンロードを取りこぼすことがあるため、
    // 次のタスクまで待つ
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 0);

    setDone("進捗を書き出しました。");
  }

  async function handleFileSelected(file: File) {
    setDone(null);

    const result = parseImportedProgress(await file.text());

    // ここでは読み取るだけ。適用はユーザーが選んでから
    if (!result.ok) {
      setImportState({ kind: "error", message: result.message });
      resetFileInput();
      return;
    }

    setImportState({
      kind: "ready",
      fileName: file.name,
      progress: result.progress,
      warningText:
        result.warning?.kind === "partial"
          ? `このファイルの ${result.warning.droppedCount} 件は読み取れなかったため、除外されます。`
          : null,
    });
  }

  function applyImport(mode: "merge" | "replace") {
    if (importState.kind !== "ready") return;

    replaceProgress(
      mode === "merge"
        ? mergeProgress(progress, importState.progress)
        : importState.progress,
    );

    setImportState({ kind: "idle" });
    resetFileInput();
    setDone(
      mode === "merge"
        ? "読み込んだ進捗を、今の進捗にマージしました。"
        : "今の進捗を、読み込んだ進捗で置き換えました。",
    );
  }

  function handleReset() {
    clearAllProgressData();
    replaceProgress(createInitialProgress());
    setConfirmingReset(false);
    setDone("進捗をすべて消しました。");
  }

  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <Alert tone="info">
        <p>
          進捗データは<strong className="font-medium">あなたのブラウザの中だけ</strong>
          に保存されています。サーバーには送信されません。
        </p>
        <p>
          ブラウザのデータを消すと進捗も消えます。別の端末で続けたいときも含め、
          ときどき書き出して保管しておくことをおすすめします。
        </p>
      </Alert>

      {done ? <Alert tone="success">{done}</Alert> : null}

      <Card>
        <CardBody className="space-y-4">
          <SectionTitle>いまの進捗</SectionTitle>
          <SummaryList progress={progress} />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3">
          <SectionTitle>書き出す</SectionTitle>
          <p className="text-sm text-ink-muted">
            いまの進捗を JSON ファイルとして保存します。別の端末やブラウザで読み込めます。
          </p>
          <div>
            <Button variant="primary" onClick={handleExport}>
              進捗を書き出す
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3">
          <SectionTitle>読み込む</SectionTitle>
          <p className="text-sm text-ink-muted">
            書き出した JSON ファイルを選ぶと、中身を確認してから反映できます。
            ファイルを選んだだけでは、いまの進捗は変わりません。
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            aria-label="進捗ファイルを選ぶ"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFileSelected(file);
            }}
            className="block w-full text-sm text-ink file:mr-3 file:min-h-9 file:cursor-pointer file:rounded-control file:border file:border-line-strong file:bg-surface file:px-3 file:text-sm file:font-medium file:text-ink hover:file:bg-accent-soft"
          />

          {importState.kind === "error" ? (
            <Alert tone="danger">
              <p>{importState.message}</p>
              <p>いまの進捗は変更していません。</p>
            </Alert>
          ) : null}

          {importState.kind === "ready" ? (
            <div className="space-y-3 rounded-card border border-line-strong p-4">
              <p className="text-sm text-ink">
                <span className="font-medium">{importState.fileName}</span> の中身
              </p>
              <SummaryList progress={importState.progress} />

              {importState.warningText ? (
                <Alert tone="warning">
                  <p>{importState.warningText}</p>
                </Alert>
              ) : null}

              <p className="text-sm text-ink-muted">
                どちらの方法で反映しますか？ マージは、進んでいるほうの記録を残します。
                置き換えは、いまの進捗を捨ててファイルの内容だけにします。
              </p>

              <div className="flex flex-wrap gap-2">
                <Button variant="primary" onClick={() => applyImport("merge")}>
                  マージする
                </Button>
                <Button variant="danger" onClick={() => applyImport("replace")}>
                  置き換える
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setImportState({ kind: "idle" });
                    resetFileInput();
                  }}
                >
                  キャンセル
                </Button>
              </div>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3">
          <SectionTitle>すべて消す</SectionTitle>
          <p className="text-sm text-ink-muted">
            目標の資格、コースの記録、メモ、受験履歴をすべて消します。元に戻せません。
          </p>

          {confirmingReset ? (
            <Alert tone="danger" label="確認">
              <p>本当にすべて消しますか？ この操作は元に戻せません。</p>
              <p>
                残しておきたい場合は、先に「書き出す」でファイルに保存してください。
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="danger" emphasis onClick={handleReset}>
                  すべて消す
                </Button>
                <Button variant="ghost" onClick={() => setConfirmingReset(false)}>
                  キャンセル
                </Button>
              </div>
            </Alert>
          ) : (
            <div>
              <Button variant="danger" onClick={() => setConfirmingReset(true)}>
                進捗をすべて消す
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
