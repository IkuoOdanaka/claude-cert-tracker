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
 *
 * ## 例外: トグルのオン状態
 *
 * 塗りつぶしのアクセント色は「primary の CTA」に加えて、
 * **トグルがオンであること**を示すのにも使う(例: 資格の「目標にしています」)。
 * どちらも「ここが今いちばん効いている」という同じ意味なので、両立する。
 * その場合は `aria-pressed` を必ず付けること。
 *
 * 一覧の中の各項目に primary の CTA を置くのは避ける(4枚のカードに4つの
 * 塗りつぶしボタンが並ぶと、一目でわかる性質が消える)。並列の選択肢は
 * secondary で揃え、選ばれたものだけが塗りつぶされる形にする。
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
