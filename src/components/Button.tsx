import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * ボタンの見た目は「押すべきものが一目でわかる」ための階層そのもの。
 *
 * - `primary`  … その画面で最もやってほしいこと。**1画面(セクション)に1つだけ**。
 *                 塗りつぶし + アクセント色は、ここ以外で使わない
 * - `secondary`… 併記される選択肢。輪郭だけ
 * - `ghost`    … 補助的な操作。ナビゲーションや取り消しなど
 * - `danger`   … 取り返しのつかない操作。既定は輪郭のみで、
 *                 確認ダイアログの最終確定だけ塗りつぶす(`emphasis`)
 *
 * primary を増やすと「どれを押せばいいか」が消えるので、増やしたくなったら
 * 画面の設計を疑う。
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "sm";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-control font-medium " +
  "transition-colors select-none " +
  "disabled:opacity-50 disabled:pointer-events-none";

// タップ領域を 44px 以上に保つ(モバイルで押し外さないため)
const SIZES: Record<ButtonSize, string> = {
  md: "min-h-11 px-4 text-sm",
  sm: "min-h-9 px-3 text-sm",
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover shadow-sm",
  secondary:
    "bg-surface text-ink border border-line-strong hover:bg-accent-soft",
  ghost: "text-ink-muted hover:bg-accent-soft hover:text-ink",
  danger:
    "bg-surface text-danger border border-danger hover:bg-danger hover:text-surface",
};

const DANGER_EMPHASIS = "bg-danger text-surface border border-danger hover:opacity-90";

interface StyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** danger のみ: 確認ダイアログの最終確定など、塗りつぶして強調する */
  emphasis?: boolean;
  className?: string;
}

function styles({ variant = "secondary", size = "md", emphasis, className = "" }: StyleProps) {
  const variantClass =
    variant === "danger" && emphasis ? DANGER_EMPHASIS : VARIANTS[variant];
  return `${BASE} ${SIZES[size]} ${variantClass} ${className}`.trim();
}

export function Button({
  variant,
  size,
  emphasis,
  className,
  children,
  ...props
}: StyleProps & ComponentProps<"button">) {
  return (
    <button className={styles({ variant, size, emphasis, className })} {...props}>
      {children}
    </button>
  );
}

/** 見た目はボタン、実体はリンク。遷移する操作に使う(button にしない) */
export function ButtonLink({
  variant,
  size,
  emphasis,
  className,
  children,
  ...props
}: StyleProps & ComponentProps<typeof Link> & { children: ReactNode }) {
  return (
    <Link className={styles({ variant, size, emphasis, className })} {...props}>
      {children}
    </Link>
  );
}
