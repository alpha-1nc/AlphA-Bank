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
    /** 외장 볼륨 등에서 증분 캐시가 깨지며 ./948.js 같은 청크 누락 500이 나는 경우 완화 */
    if (dev) {
      config.cache = false;
    }
    if (isServer) {
      config.externals = [...(config.externals ?? []), "@prisma/adapter-libsql", "@libsql/client", "libsql"];
    }
    return config;
  },
};

export default nextConfig;
