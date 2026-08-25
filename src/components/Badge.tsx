import type { ComponentProps } from "react";

export type BadgeTone = "neutral" | "accent" | "success" | "warning";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-canvas text-ink-muted border-line",
  accent: "bg-accent-soft text-accent border-accent-soft",
  success: "bg-canvas text-success border-line",
  warning: "bg-canvas text-warning border-line",
};

/** 状態や属性の小さなラベル。操作できるものには使わない(ボタンと紛らわしいため) */
export function Badge({
  tone = "neutral",
  className = "",
  ...props
}: { tone?: BadgeTone } & ComponentProps<"span">) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONES[tone]} ${className}`.trim()}
      {...props}
    />
  );
}
