// @ts-check
import { execSync } from 'node:child_process';
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';

const buildHash = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'dev';
  }
})();

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare(),
  integrations: [react()],
  // 'server' so /admin and /api/* are dynamic; content pages opt into
  // `export const prerender = true` individually since they don't need
  // per-request server logic (their data comes from client-side islands).
  output: 'server',
  vite: {
    define: {
      __BUILD_HASH__: JSON.stringify(buildHash),
    },
  },
});