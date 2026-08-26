import type { ReactNode } from "react";

export type AlertTone = "info" | "warning" | "danger" | "success";

const TONES: Record<AlertTone, string> = {
  info: "border-line-strong bg-canvas text-ink",
  warning: "border-warning bg-canvas text-ink",
  danger: "border-danger bg-canvas text-ink",
  success: "border-success bg-canvas text-ink",
};

const LABELS: Record<AlertTone, string> = {
  info: "お知らせ",
  warning: "注意",
  danger: "エラー",
  success: "完了",
};

/**
 * 画面上の通知。
 *
 * 枠線の色だけで種類を伝えないよう、必ず見出しの語(「注意」「エラー」など)を出す。
 */
export function Alert({
  tone = "info",
  label,
  children,
  action,
}: {
  tone?: AlertTone;
  /** 見出しの語を差し替える(例: 確認を求めるときの「確認」)。既定は tone に対応する語 */
  label?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={`rounded-card border px-4 py-3 text-sm ${TONES[tone]}`}
    >
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {label ?? LABELS[tone]}
      </p>
      <div className="space-y-2">{children}</div>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
