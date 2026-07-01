/// <reference path="../worker-configuration.d.ts" />

// Secrets set via `wrangler secret put` (never in wrangler.jsonc, never in
// repo) aren't picked up by `wrangler types`. Declared here by hand so
// `import { env } from "cloudflare:workers"` is fully typed in API routes.
// (Astro v6 removed `Astro.locals.runtime.env` — see @astrojs/cloudflare's
// own deprecation error if you're tempted to reach for it.)
interface Env {
  ANTHROPIC_API_KEY: string;
  TELEGRAM_BOT_TOKEN: string;
}

// Injected at build time via vite.define in astro.config.mjs (git short hash).
declare const __BUILD_HASH__: string;
