// Validate required env vars at build time
if (!process.env.NEXT_PUBLIC_API_URL) {
  console.warn(
    '\x1b[33m⚠  NEXT_PUBLIC_API_URL is not set — API calls will fall back to http://localhost:3001/api\x1b[0m',
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  images: {
    domains: ['localhost'],
  },
};

export default nextConfig;
