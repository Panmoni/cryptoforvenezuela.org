# cryptoforvenezuela

Live at **[cryptoforvenezuela.org](https://cryptoforvenezuela.org)**.

Direct-relief donation site: wallet-to-wallet only, one Ethereum address and
one Solana address, no custody. Funds go straight to a volunteer group on the
ground in Caracas responding to the June 2026 earthquake.

## Project structure

```
src/
  config/addresses.ts   # build-time recipient address constants — the one file where friction is intentional
  pages/                # index (single-page site), admin, api/*
  components/           # React islands (donation widget, admin, impact, received)
  lib/                  # D1 queries, zod schemas, EXIF stripping, social caption templates
migrations/              # D1 schema
workers/                 # standalone Workers: telegram-webhook, vision-extract, inflow-indexer
```

The site itself (Astro + admin API routes) deploys as one Worker via the
Cloudflare adapter. `workers/*` are separate deployables, each with their own
`wrangler.jsonc`, triggered by external webhooks/queues rather than by page
requests.

## Commands

| Command                    | Action                                               |
| :-------------------------- | :---------------------------------------------------- |
| `pnpm install`               | Install dependencies                                 |
| `pnpm run generate-types`     | Regenerate `worker-configuration.d.ts` from bindings |
| `pnpm run dev`                 | Local dev server                                     |
| `pnpm run db:migrate:local`     | Apply D1 migrations to local dev DB                 |
| `pnpm run db:migrate:remote`     | Apply D1 migrations to the real D1 database         |
| `pnpm run build` / `astro check` | Build / typecheck                                  |
| `pnpm run deploy`                | Build + deploy the site Worker                      |

Each `workers/*/` also deploys independently: `cd workers/<name> && wrangler deploy`.

## Two things to never do

1. Never fetch the recipient addresses at runtime — they're build-time
   constants in `src/config/addresses.ts` for a reason.
2. Never auto-publish media. Everything from Telegram lands in
   `needs_review` and stays there until a human approves it on `/admin`.
