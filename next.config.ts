import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The download route + detail page read skills/** at runtime/build via fs.
  // Force Next's file tracer to bundle them into the serverless functions so
  // reads work on Vercel (not just locally).
  outputFileTracingIncludes: {
    "/api/skills/**": ["./skills/**/*"],
    "/skills/**": ["./skills/**/*"],
  },
};

export default nextConfig;
