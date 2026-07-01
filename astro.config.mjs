// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare(),
  integrations: [react()],
  // 'server' so /admin and /api/* are dynamic; content pages opt into
  // `export const prerender = true` individually since they don't need
  // per-request server logic (their data comes from client-side islands).
  output: 'server',
});