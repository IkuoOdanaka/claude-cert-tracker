/**
 * シード付き擬似乱数。
 *
 * 出題にシードを使うのは、**同じ問題セットを再現できるようにする**ため。
 * 「もう一度同じ問題で」「間違えた問題だけ再挑戦」は、どちらも
 * 「あのときと同じ並びをもう一度作れる」ことが前提になる。
 * `Math.random()` では作れない。
 */

/** 文字列のシードを 32bit の整数にする(FNV-1a) */
function hashSeed(seed: string): number {
  let hash = 2166136261 >>> 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  return hash >>> 0;
}

/**
 * mulberry32。0 以上 1 未満を返す。
 * 暗号用途ではない(出題順を再現できれば十分)。
 */
export function createRandom(seed: string): () => number {
  let state = hashSeed(seed);

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates。引数は変更せず、新しい配列を返す */
export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}
