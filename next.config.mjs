/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export so the app is a folder of plain files.
  // Deploys to Vercel and to any static host, and runs fully in the browser.
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
