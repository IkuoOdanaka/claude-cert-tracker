/** 画面表示用のフォーマット。表示の都合をコンポーネントに散らかさないためにここへ集める。 */
import type { StudyTimeSummary } from "./content";

/**
 * 分を「12時間54分」の形にする。
 *
 * 資格どうしを見比べる画面で使うので、単位を省略せず、
 * 0分のときも「0分」と出す(空欄にすると「未計測」と区別がつかない)。
 */
export function formatDuration(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;

  if (hours === 0) return `${rest}分`;
  if (rest === 0) return `${hours}時間`;
  return `${hours}時間${rest}分`;
}

/** 価格。認定試験の価格は公式サイトが USD 表記なので、通貨を明示する */
export function formatPriceUsd(usd: number): string {
  return `$${usd.toLocaleString("en-US")} USD`;
}

const ROLE_LABELS = {
  associate: "Associate",
  developer: "Developer",
  architect: "Architect",
} as const;

const LEVEL_LABELS = {
  foundations: "Foundations",
  professional: "Professional",
} as const;

export function formatRole(role: keyof typeof ROLE_LABELS): string {
  return ROLE_LABELS[role];
}

export function formatLevel(level: keyof typeof LEVEL_LABELS): string {
  return LEVEL_LABELS[level];
}

/**
 * コースの提供元。
 *
 * パートナー限定か一般公開かでアクセスできる人が変わるので、画面でも必ず区別する。
 */
const PROVIDER_LABELS = {
  "partner-academy": "パートナー限定",
  "anthropic-academy": "一般公開",
} as const;

const FORMAT_LABELS = {
  video: "動画",
  "hands-on": "ハンズオン",
  reading: "読み物",
} as const;

const COURSE_STATUS_LABELS = {
  "not-started": "未着手",
  "in-progress": "学習中",
  completed: "完了",
} as const;

export function formatProvider(provider: keyof typeof PROVIDER_LABELS): string {
  return PROVIDER_LABELS[provider];
}

export function formatCourseFormat(format: keyof typeof FORMAT_LABELS): string {
  return FORMAT_LABELS[format];
}

export function formatCourseStatus(status: keyof typeof COURSE_STATUS_LABELS): string {
  return COURSE_STATUS_LABELS[status];
}

/** 完了時刻。「いつ終えたか」がわかれば十分なので日付まで */
export function formatCompletedAt(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/**
 * 残りの学習時間の文言。
 *
 * 「所要時間が判明しているコースの合計」と「未掲載のコース数」を1文にまとめる。
 * 分岐を各画面に書くと必ずズレるのでここに閉じ込める。
 *
 * 注意すべきは **すべて完了して残り0件になった場合**。measuredCourseCount が 0 に
 * なるので「未掲載」と同じ条件に見えてしまうが、意味は正反対(残りが無い)。
 * 先に総数で判定する。
 */
export function formatRemainingStudyTime(summary: StudyTimeSummary): string {
  const remainingCourses =
    summary.measuredCourseCount + summary.unmeasuredCourseCount;

  if (remainingCourses === 0) return "0分（すべて完了）";

  if (summary.measuredCourseCount === 0) {
    return `未掲載（残り ${summary.unmeasuredCourseCount} コース）`;
  }

  const total = formatDuration(summary.totalMinutes);

  return summary.unmeasuredCourseCount > 0
    ? `${total}（別に ${summary.unmeasuredCourseCount} コースは所要時間の掲載なし）`
    : total;
}
