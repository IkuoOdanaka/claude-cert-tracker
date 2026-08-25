/**
 * 進捗バー。
 *
 * 色だけで状態を伝えないよう、必ず数値ラベルを併記する
 * (色覚特性の違いや、モノクロ表示でも読めるように)。
 */
export function ProgressBar({
  percent,
  label,
  detail,
}: {
  /** 0-100 */
  percent: number;
  /** スクリーンリーダー向けの説明。何の進捗かを言う */
  label: string;
  /** バーの右に出す補足(例: 「3 / 8 コース」) */
  detail?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-ink">{clamped}%</span>
        {detail ? <span className="text-ink-muted">{detail}</span> : null}
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-full bg-accent-soft"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
