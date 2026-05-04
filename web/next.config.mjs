/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Required for SharedArrayBuffer (relayer-sdk WASM crypto in browser).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
  webpack(config) {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, net: false, tls: false };
    return config;
  },
};
export default nextConfig;
