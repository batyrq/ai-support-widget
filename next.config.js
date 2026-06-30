/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Эти пакеты тянут нативные/динамические модули (onnxruntime, pdf-parse) —
  // их нельзя бандлить webpack'ом, держим внешними и грузим в рантайме Node.
  experimental: {
    serverComponentsExternalPackages: [
      '@xenova/transformers',
      'onnxruntime-node',
      'pdf-parse',
    ],
  },
};

module.exports = nextConfig;
