/** 画面表示用のフォーマット。表示の都合をコンポーネントに散らかさないためにここへ集める。 */

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
