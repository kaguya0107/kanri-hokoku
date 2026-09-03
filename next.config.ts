import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 本番ビルドの検証時のみ出力先を変え、開発サーバの .next と衝突させない
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
};

export default nextConfig;
