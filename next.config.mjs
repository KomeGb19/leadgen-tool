/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdfjs-dist"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "maps.googleapis.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  webpack: (config) => {
    // pdfjs-dist optionally requires 'canvas' for rendering to a bitmap —
    // we only use it for text extraction, so stub it out.
    config.resolve.alias = { ...config.resolve.alias, canvas: false };
    return config;
  },
};

export default nextConfig;
