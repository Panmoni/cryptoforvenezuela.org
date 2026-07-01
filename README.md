# cryptoforvenezuela

Direct-relief donation site: wallet-to-wallet only, one Ethereum address and
one Solana address, no custody. See [`plan.md`](./plan.md) for the design and
[`SETUP.md`](./SETUP.md) for what's left to do with real credentials before
this goes live (Cloudflare account, domain, Telegram bot, the friend's real
addresses).

## Project structure

```
src/
  config/addresses.ts   # build-time recipient address constants — read SETUP.md before touching this
  pages/                # index (donate), about, impact, received, admin, api/*
  components/           # React islands (donation widget, wallet connect, admin, impact, received)
  lib/                  # D1 queries, zod schemas, EXIF stripping, social caption templates
migrations/              # D1 schema
workers/                 # standalone Workers: telegram-webhook, vision-extract, inflow-indexer
```

The site itself (Astro + admin API routes) deploys as one Worker via the
Cloudflare adapter. `workers/*` are separate deployables, each with their own
`wrangler.jsonc`, triggered by external webhooks/queues rather than by page
requests.

## Commands

| Command                   | Action                                              |
| :------------------------ | :--------------------------------------------------- |
| `npm install`              | Install dependencies                                |
| `npm run generate-types`    | Regenerate `worker-configuration.d.ts` from bindings |
| `npm run dev`                | Local dev server                                    |
| `npm run db:migrate:local`    | Apply D1 migrations to local dev DB                |
| `npm run db:migrate:remote`    | Apply D1 migrations to the real D1 database        |
| `npm run build` / `astro check` | Build / typecheck                                |
| `npm run deploy`               | Build + deploy the site Worker                     |

Each `workers/*/` also deploys independently: `cd workers/<name> && wrangler deploy`.

## Two things to never do

1. Never fetch the recipient addresses at runtime — they're build-time
   constants in `src/config/addresses.ts` for a reason. See `plan.md`.
2. Never auto-publish media. Everything from Telegram lands in
   `needs_review` and stays there until a human approves it on `/admin`.
