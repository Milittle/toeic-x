/** @type {import('next').NextConfig} */
const nextConfig = {
  redirects: async () => [
    {
      source: "/notebook",
      destination: "/favorites/collocations",
      permanent: true,
    },
  ],
  // better-sqlite3 is a native module; opt out of webpack bundling.
  // (Next 14: this option lives under `experimental`; Next 15 renames to top-level
  // `serverExternalPackages`.)
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3"],
    // Next 14 caches dynamically-rendered routes in the client Router Cache
    // (30s) by default, so soft navigation to a page after a mutation (e.g.
    // adding to the collocation/word library) shows stale data.
    // 0 forces a refetch on every navigation. Changed to 0-by-default in v15.
    staleTimes: { dynamic: 0 },
  },
};

export default nextConfig;
