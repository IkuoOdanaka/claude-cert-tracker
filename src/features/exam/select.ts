/**
 * 出題の組み立て。副作用を持たない純粋関数。
 *
 * 理解度チェック(コース単位)と模擬試験(資格単位)の両方をここでまかなう。
 * 違いは「絞り込みの軸」と「ドメイン配分をするかどうか」だけ。
 */
import type { ExamDomain, Question, QuestionChoice } from "@/types/domain";
import { createRandom, shuffle } from "./random";

export interface ExamQuestion {
  question: Question;
  /** 並びをシャッフルした選択肢。正解の位置を覚えてしまうのを防ぐ */
  choices: QuestionChoice[];
}

export interface BuildExamOptions {
  /** 出題数。問題が足りなければ、あるだけ出す */
  count: number;
  /** 同じシードなら、同じ問題・同じ並び・同じ選択肢順になる */
  seed: string;
  /** コース絞り込み(理解度チェック)。空配列は「絞り込まない」と同じ */
  courseIds?: readonly string[];
  /** ドメイン絞り込み(模擬試験の一部範囲) */
  domainIds?: readonly string[];
  /**
   * 渡すとドメインごとに配分する(模擬試験)。渡さなければ単純にシャッフルして取る。
   * 3〜5問の理解度チェックで配分しても意味がないので、呼び出し側が選ぶ。
   */
  domains?: readonly ExamDomain[];
}

/**
 * 選択肢の並びは **問題ごとに独立したシード** で決める。
 *
 * 出題全体のシードから順に引くと、同じ問題でも「何問目に出たか」で並びが変わる。
 * 「間違えた問題だけ再挑戦」で選択肢の並びが変わると、覚え直しになって邪魔になる。
 */
function shuffleChoices(question: Question, seed: string): QuestionChoice[] {
  return shuffle(question.choices, createRandom(`${seed}:${question.id}`));
}

function applyFilters(
  questions: readonly Question[],
  options: BuildExamOptions,
): Question[] {
  let pool = [...questions];

  if (options.courseIds && options.courseIds.length > 0) {
    const wanted = new Set(options.courseIds);
    pool = pool.filter((question) =>
      question.courseIds.some((courseId) => wanted.has(courseId)),
    );
  }

  if (options.domainIds && options.domainIds.length > 0) {
    const wanted = new Set(options.domainIds);
    pool = pool.filter((question) => wanted.has(question.domainId));
  }

  return pool;
}

/**
 * ドメインごとの取り分を決める。
 *
 * `weight` があればその比率、なければ均等。端数は比率の大きい順に配る
 * (毎回同じ結果になるように、同率のときは並び順で決める)。
 */
function allocateQuotas(
  domainIds: readonly string[],
  weights: readonly number[],
  count: number,
): number[] {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) return domainIds.map(() => 0);

  const exact = weights.map((weight) => (count * weight) / totalWeight);
  const quotas = exact.map((value) => Math.floor(value));
  let remainder = count - quotas.reduce((sum, value) => sum + value, 0);

  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  for (const { index } of order) {
    if (remainder <= 0) break;
    quotas[index] += 1;
    remainder -= 1;
  }

  return quotas;
}

/**
 * ドメイン配分で取り出す。
 *
 * 取り分に足りないドメインがあっても**総数は減らさない**。余ったぶんは
 * まだ問題が残っているドメインから順に埋める。そうしないと
 * 「問題は足りているのに 20 問頼んで 14 問しか出ない」ことになる。
 */
function takeByDomain(
  pool: readonly Question[],
  domains: readonly ExamDomain[],
  count: number,
  random: () => number,
): Question[] {
  // 渡されたドメインの順を基準にし、そこに無いドメインは末尾へ(並びを一定に保つ)
  const known = domains.map((domain) => domain.id);
  const extra = [...new Set(pool.map((question) => question.domainId))]
    .filter((domainId) => !known.includes(domainId))
    .sort();
  const domainIds = [...known, ...extra];

  const buckets = new Map<string, Question[]>(
    domainIds.map((domainId) => [
      domainId,
      shuffle(
        pool.filter((question) => question.domainId === domainId),
        random,
      ),
    ]),
  );

  const weightById = new Map(domains.map((domain) => [domain.id, domain.weight ?? 1]));
  const quotas = allocateQuotas(
    domainIds,
    domainIds.map((domainId) => weightById.get(domainId) ?? 1),
    count,
  );

  const taken: Question[] = [];
  domainIds.forEach((domainId, index) => {
    taken.push(...(buckets.get(domainId) ?? []).splice(0, quotas[index]));
  });

  // 取り分に届かなかったぶんを、残っているドメインから順に埋める
  let cursor = 0;
  while (taken.length < count) {
    const remaining = domainIds.filter(
      (domainId) => (buckets.get(domainId)?.length ?? 0) > 0,
    );
    if (remaining.length === 0) break;

    const domainId = remaining[cursor % remaining.length];
    const next = buckets.get(domainId)?.shift();
    if (next) taken.push(next);
    cursor += 1;
  }

  return taken;
}

/**
 * 出題を組み立てる。
 *
 * - 問題が足りなければ、あるだけ返す(足りないことは呼び出し側が件数で判断する)
 * - `count` が 0 以下なら空
 */
export function buildExam(
  questions: readonly Question[],
  options: BuildExamOptions,
): ExamQuestion[] {
  if (options.count <= 0) return [];

  const pool = applyFilters(questions, options);
  if (pool.length === 0) return [];

  const random = createRandom(options.seed);
  const useDomains = options.domains && options.domains.length > 0;

  const selected = useDomains
    ? takeByDomain(pool, options.domains!, options.count, random)
    : shuffle(pool, random).slice(0, options.count);

  // ドメイン配分だと同じドメインが固まるので、最後にもう一度混ぜる
  const ordered = useDomains ? shuffle(selected, random) : selected;

  return ordered.map((question) => ({
    question,
    choices: shuffleChoices(question, options.seed),
  }));
}
