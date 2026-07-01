# Setup — everything that needs real credentials

Everything in this repo is built. This file is the remaining checklist to go
from code to a live, receiving site — all steps that need your actual
Cloudflare account, domain registrar, Telegram account, and the friend's real
wallet addresses, which nobody but you can do.

## 1. The addresses (do this first, carefully)

- Get the two addresses from your friend over an out-of-band channel you
  trust (voice/video call — not Telegram text, which this whole system
  treats as untrusted for everything else).
- Edit `src/config/addresses.ts`: replace `SOLANA_ADDRESS` and
  `ETHEREUM_ADDRESS`, and paste in a real `sha256(address).slice(0, 8)` for
  each `shortHash` (compute once, hardcode the literal — don't compute it
  at runtime from a value that might be wrong).
- Set `CANONICAL_ANCHOR_URL` to the real post (see step 7).
- This file is protected by `.github/CODEOWNERS` — fill in your real GitHub
  username there, and turn on branch protection requiring review on `main`
  for this path specifically.

## 2. Cloudflare account setup

**Done**, using the tokens in `.env`:

- D1 database `relief` created (`database_id dd6bf929-b5bb-4cd5-a239-d327c236bbc9`,
  already filled into all four `wrangler.jsonc` files) and
  `migrations/0001_init.sql` applied — `allowlist`, `media`, `extraction`,
  `impact`, `inflows`, `social_drafts` all exist on the real remote database.
- R2 buckets `media-pending` and `media-public` created (R2 had to be
  enabled on the account first — one-time dashboard step, done).
- Queues `vision-extract-queue` and `vision-extract-dlq` created.

**Still needed** — the current `CLOUDFLARE_API_TOKEN` doesn't include
`Workers Scripts:Edit`, so I can't run `wrangler deploy` or `wrangler secret
put` yet, and the real secret *values* (Telegram bot token, Anthropic key,
Helius/Alchemy credentials) don't exist yet either — see steps 4–6, 9, 10
below. Once those exist, either widen the token to include Workers Scripts
edit access, or run `wrangler deploy` / `wrangler secret put` yourself per
step 6.

## 3. Domain

- Register `cryptoforvenezuela.org` on Cloudflare Registrar.
- Enable DNSSEC, registrar lock, auto-renew (all in the Cloudflare
  dashboard, Registrar section).
- After the Pages/Workers deploy (step 6), attach the domain as a custom
  domain on the `cryptoforvenezuela-site` Worker.

## 4. Telegram bot

- Talk to [@BotFather](https://t.me/BotFather), create a bot, save the
  token.
- Pick a random secret string for `TELEGRAM_WEBHOOK_SECRET` (this repo
  never generates one for you — it's a shared secret only you and Telegram
  should know).
- After deploying `telegram-webhook` (step 6) and getting its URL:
  ```
  curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
    -d "url=https://<telegram-webhook-worker-url>/" \
    -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
  ```
- Seed the allowlist — your own chat_id and the friend's/volunteers':
  ```
  wrangler d1 execute relief --remote \
    --command "INSERT INTO allowlist (chat_id, label) VALUES ('123456789', 'friend')"
  ```
  (Get a chat_id by messaging your bot and checking the webhook logs, or
  message [@userinfobot](https://t.me/userinfobot).)

## 5. Anthropic API key

- Create a project-scoped key (not your root account key) at
  [console.anthropic.com](https://console.anthropic.com).
- This is `ANTHROPIC_API_KEY`, used only by `vision-extract` — it's
  advisory pre-fill for the admin form, never a gate, so a cheap Haiku-tier
  key is the right call, not a high-limit production key.

## 6. Deploy

Site (Astro + admin + public APIs):

```
npm run deploy
```

Each standalone worker (from its own directory):

```
cd workers/telegram-webhook && wrangler secret put TELEGRAM_BOT_TOKEN && wrangler secret put TELEGRAM_WEBHOOK_SECRET && wrangler deploy
cd ../vision-extract && wrangler secret put ANTHROPIC_API_KEY && wrangler secret put TELEGRAM_BOT_TOKEN && wrangler secret put ADMIN_CHAT_ID && wrangler deploy
cd ../inflow-indexer && wrangler secret put HELIUS_WEBHOOK_SECRET && wrangler secret put ALCHEMY_SIGNING_KEY && wrangler deploy
```

The site's own secrets (`ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN` — these
are declared in `src/env.d.ts` but only actually used if you later add
routes that need them; harmless to skip if unused):

```
wrangler secret put ANTHROPIC_API_KEY
```

## 7. Publish the canonical address anchor

- Post both addresses together, with their `shortHash` values, from an
  established personal account (long history, hard to clone).
- Screenshot and archive it the same day (archive.org / archive.today) as a
  second, independent timestamp.
- Put that URL in `CANONICAL_ANCHOR_URL` (step 1) and redeploy.

## 8. Protect /admin

`/admin` and `/api/admin/*` have **no authentication built into this repo**
— they rely entirely on **Cloudflare Access** at the edge. Before deploying
with real data behind it:

- Cloudflare dashboard → Zero Trust → Access → Applications → add an
  application covering `cryptoforvenezuela.org/admin*` and
  `cryptoforvenezuela.org/api/admin*`.
- Policy: allow your email (and the friend's, if he'll review too).
- `/api/media/*` and `/api/gallery`, `/api/counters`, `/api/inflows` are
  intentionally public — that's the published evidence, no gate needed.

## 9. On-chain webhooks (Phase 5)

- **Helius**: create a webhook on the Solana address, commitment level
  `confirmed` (this setting *is* the confirmation-depth guard — nothing in
  this repo re-implements it), Auth Header = `HELIUS_WEBHOOK_SECRET`,
  target URL = `https://<inflow-indexer-url>/webhooks/helius`.
- **Alchemy**: create an Address Activity webhook
  (`MINED_TRANSACTION`) on the Ethereum address, plus subscribe to the
  reorg webhook for the same address (this is what makes totals reorg-safe
  — see `workers/inflow-indexer/src/index.ts`). Target URL =
  `https://<inflow-indexer-url>/webhooks/alchemy`. Copy the signing key
  into `ALCHEMY_SIGNING_KEY`.

## 10. Wallet connect (Phase 6)

- Sign up free at [cloud.reown.com](https://cloud.reown.com), create a
  project, copy the project ID.
- Set `PUBLIC_REOWN_PROJECT_ID` in the Pages/Workers environment variables
  (dashboard → your Worker → Settings → Variables) — it's a public client
  ID, safe to expose, but still an env var rather than hardcoded so it's
  not baked into the repo.
- Optional: set `PUBLIC_SOLANA_RPC_URL` to a paid RPC endpoint (Helius,
  QuickNode, etc.) — the public `clusterApiUrl("mainnet-beta")` fallback is
  rate-limited and fine for low volume only.

## Local development

```
npm install
npm run generate-types   # regenerates worker-configuration.d.ts, gitignored
npm run db:migrate:local
npm run build && npx wrangler dev
```

Use `wrangler dev` (against the built output), not `npm run dev` — see the
note at the top of `AGENTS.md` about a real bug in this Astro version's dev
server that masks errors on every route. `astro dev` is still fine for quick
CSS/markup iteration where you don't need working D1/R2/API routes.

The admin queue and gallery return empty arrays against a fresh local D1 —
that's expected until you seed data through the pipeline (or by hand with
`wrangler d1 execute relief --local`).
