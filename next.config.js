/** @type {import('next').NextConfig} */
const nextConfig = {
  // Nothing fancy needed for the MVP - defaults are fine.
  // reactStrictMode helps catch bugs early during development.
  reactStrictMode: true,
  experimental: {
    // Next's client-side router cache normally keeps a dynamically-rendered
    // page (Home, Ratings, Watched, Recommendations - all read the session
    // cookie) around for 30s before refetching on navigation. That reads as
    // "my rating didn't show up" when hopping between pages right after
    // saving something. Force an immediate refetch instead.
    staleTimes: { dynamic: 0 },
  },
};

module.exports = nextConfig;
