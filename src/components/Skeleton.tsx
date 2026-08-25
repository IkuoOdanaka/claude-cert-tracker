/**
 * 読み込み中のプレースホルダ。
 *
 * 進捗は localStorage からマウント後に読むため、それまでの表示に使う。
 * **読み込み前の初期値を「進捗 0%」として描いてはいけない**(実際の進捗と
 * 区別がつかず、ユーザーに嘘をつくことになる)。
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-control bg-line ${className}`.trim()}
    />
  );
}
