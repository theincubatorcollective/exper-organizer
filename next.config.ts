import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const root = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Keep Turbopack rooted on this app. A package-lock.json in C:\Users\pc
  // otherwise makes Next treat the home folder as the workspace root.
  turbopack: {
    root,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    // Disable the interactive "upgrade Next?" menu. On Windows Git Bash it
    // puts stdin in raw mode; choosing Skip often kills the shell / closes
    // the terminal and the dev server never stays up.
    agentUpgrade: false,
  },
};

export default nextConfig;
