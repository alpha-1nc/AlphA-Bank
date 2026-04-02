import os from "os";
import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
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

export default nextConfig;
