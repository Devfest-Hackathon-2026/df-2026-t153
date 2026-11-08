import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  // Do not generate frontend/AGENTS.md; the project rules live in the repo root
  agentRules: false,
  // Pin the flag to a literal at build time (even when unset) so the mock branch
  // and its lazy chunk are dropped from production bundles
  env: { NEXT_PUBLIC_MOCK_NARRATE: process.env.NEXT_PUBLIC_MOCK_NARRATE ?? "" },
};

export default nextConfig;
