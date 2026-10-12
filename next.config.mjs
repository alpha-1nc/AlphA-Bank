import os from "os";
import path from "path";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import withSerwistInit from "@serwist/next";

/** 오프라인 폴백 페이지 precache 무효화용 (커밋 해시 또는 임시 ID) */
const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["@/components/ui"],
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { dev, isServer }) => {
    /**
     * 외장 볼륨의 `.next` 캐시가 깨지며 청크 500이 나는 경우가 있어,
     * dev에서 webpack 캐시만 OS 임시 폴더로 분리합니다.
     * (`cache: false`는 HMR 전체 리로드 시 `/_next/static` 404를 유발하기 쉬움)
     */
    if (dev) {
      config.cache = {
        type: "filesystem",
        cacheDirectory: path.join(os.tmpdir(), "alpha-bank-next-webpack"),
      };
    }
    if (isServer) {
      config.externals = [...(config.externals ?? []), "@prisma/adapter-libsql", "@libsql/client", "libsql"];
    }
    return config;
  },
};

export default withSerwist(nextConfig);
