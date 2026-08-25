import type { NextConfig } from "next";

/**
 * GitHub Pages への静的ホスティングを前提とした設定。
 *
 * - `output: "export"` で完全な静的サイトとして書き出す(サーバーを持たない)。
 * - Pages のプロジェクトサイトはサブパス配信になるため basePath が必要。
 *   ローカル開発では空文字にしたいので、CI 側から NEXT_PUBLIC_BASE_PATH を渡す。
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  // 静的書き出しでは next/image の最適化サーバーが使えない
  images: { unoptimized: true },
  // Pages は /path/ 形式のほうが 404 を踏みにくい
  trailingSlash: true,
};

export default nextConfig;
