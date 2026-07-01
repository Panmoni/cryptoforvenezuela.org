# cryptoforvenezuela — Build Plan

Direct-relief amplification site for the June 2026 Venezuela earthquake. Funds move **wallet-to-wallet, donor → friend in Caracas**. The site never custodies, never holds keys, never touches money. It constructs transactions the donor signs (Phase 6) or simply displays addresses (Phase 1).

Stack: Astro (static-first) · Cloudflare Pages · Workers · R2 · D1 · Anthropic API (vision, advisory-only) · Telegram Bot API.

Two hard design principles that everything else serves:
1. **Every public number decomposes into evidence, and every item is manually approved.** A counter is a `SUM()` over records *you* approved on the admin page. Nothing auto-publishes. No confidence thresholds, no sanity caps — you look at the photo, you decide.
2. **The friend's addresses are build-time constants, never runtime-fetched.** Address integrity is the single highest-stakes technical property — a swapped address means donations reach a clone, not him.

**Non-goals:**
- No custody, no pooled wallet, no smart-contract escrow. Money never passes through anything you control.
- No tax receipts / 501(c)(3) mechanics — informal peer-to-peer relief, not a registered charity.
- No KYC on donors. No fiat on/off-ramp.
- No auto-approval of media, ever. Every published item was clicked "Approve" by a human.

---

## Phase 0 — Foundations (½ day)

**0.1 Domain**
- Register `cryptoforvenezuela.org` on Cloudflare Registrar. That's the only domain — no `.com` to register or redirect.
- Enable DNSSEC, registrar lock, auto-renew.

**0.2 Repo + tooling**
- `npm create astro@latest -- --template minimal --typescript strict`.
- Add `wrangler`, `zod` (schema validation), `qrcode` (QR generation).
- Repo layout:
  ```
  src/
    pages/            # index, about, impact, received, admin (auth-gated)
    components/        # DonationWidget.tsx (island), Counter.tsx (island), Gallery.astro
    config/
      addresses.ts      # THE file — build-time constants, see 1.1
    lib/
      d1.ts                # typed query helpers
      schema.ts           # zod schemas shared client/worker
  workers/
    telegram-webhook/    # Phase 2
    vision-extract/      # Phase 3 — advisory pre-fill only
    inflow-indexer/       # Phase 5
    admin-api/              # Phase 3 admin page backend
  migrations/             # D1 schema migrations
  ```
- Protect `main`, require PR review. A CODEOWNERS entry pinning `src/config/addresses.ts` to you specifically — the one file where friction is worth it.

**0.3 Cloudflare project skeleton**
- Pages project, auto-deploy on push to `main`, preview deploys on PRs.
- Provision via `wrangler`: R2 `media-pending` (private) + `media-public`; D1 `relief`; Workers for webhook/extraction/indexer/admin-api; a Queue (`vision-extract-queue`) so the Telegram webhook responds fast and the slow work happens async.
- Secrets via `wrangler secret put` — never in repo: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY`, indexer API keys (Helius/Alchemy), and whatever Cloudflare Access needs for the admin page (no custom auth code — see 3.2).

**Exit criteria:** `cryptoforvenezuela.org` resolves and serves an empty Astro page over HTTPS, D1 + R2 + Queues provisioned, secrets set.

---

## Phase 1 — Donation widget → LIVE, RECEIVING TODAY (1 day)

This phase alone is a shippable, money-receiving site. Everything after is transparency layering.

**1.1 Address constants — one Ethereum address, one Solana address**
- Your friend generates both addresses himself, on his own device, his own keys — you never see a seed phrase or private key.
- He sends you the two addresses over an out-of-band channel you trust (voice call, video, something where you can confirm it's really him).
- Commit as typed constants:
  ```ts
  // src/config/addresses.ts
  export const RECIPIENT_ADDRESSES = {
    solana: {
      address: "…",
      shortHash: "a3f9…",       // sha256(address).slice(0,8) — rendered next to the address
      explorerUrl: (addr: string) => `https://solscan.io/account/${addr}`,
    },
    ethereum: {
      address: "0x…",
      shortHash: "…",
      explorerUrl: (addr: string) => `https://etherscan.io/address/${addr}`,
    },
  } as const;

  // Kill switch: flip true + redeploy if an address is ever suspected compromised.
  // Renders a blocking banner in DonationWidget instead of the address.
  export const ADDRESS_ALERT: { solana: boolean; ethereum: boolean } = {
    solana: false,
    ethereum: false,
  };
  ```
- Both addresses are plain accounts — they can receive native SOL/ETH and any SPL/ERC-20 token sent to them directly (e.g. USDC). The site only needs to *display* the address and QR; it doesn't need to know every asset that might land there.
- `ADDRESS_ALERT` is the incident-response mechanism: Cloudflare Pages redeploys in under a minute on push to `main`, so a one-line flip is the actual answer to "what if an address is reported compromised."

**1.2 Widget UI (front and center, above the fold)**
- `DonationWidget.tsx` as an Astro island (`client:load`).
- Per chain: address as selectable/monospace text, QR generated client-side (`qrcode` package, no network call).
- "Verify this address" — shows `shortHash` + link to the canonical post (1.4) + chain explorer link.
- Suggested amounts, copy-to-clipboard, chain toggle Solana / Ethereum as a segmented control (both visible at once).
- No wallet JS in this phase — static HTML/CSS + one island. Ship fast.

**1.3 Content**
- Hero: what happened (twin M7.2/M7.5 quakes, June 24 2026), who the friend is, what the money buys.
- Placeholder impact section (wired for real in Phase 4).
- About/transparency page: explains the direct wallet-to-wallet model, states the non-goals, links the address-verification story.

**1.4 Canonical address anchor**
- Publish both addresses **once**, together, with `shortHash` values, from an established personal channel (your long-standing social handle). Screenshot/archive it same day. The widget's "Verify" link points here.

**Exit criteria:** site is live, donors on Solana or Ethereum can send funds directly to the friend, addresses are independently verifiable, kill-switch runbook exists.

---

## Phase 2 — Telegram ingestion pipeline (1–1.5 days)

**2.1 Bot**
- Create bot via BotFather. `setWebhook` with a `secret_token` — verify the `X-Telegram-Bot-Api-Secret-Token` header on every request before touching the body. This is the entire trust boundary for ingestion.
- **Allowlist by `chat_id`**: friend + named volunteers only. Reject everyone else with a silent 200.
- Dedup on `update_id` (unique index) — Telegram can redeliver.

**2.2 Intake Worker**
- Webhook handler does the minimum to respond fast: verify secret header → check allowlist → dedupe → enqueue to `vision-extract-queue` → 200. Slow work (file download, LLM call) happens in the queue consumer.
- Consumer: `getFile` → stream bytes into R2 `media-pending/{uuid}`. Write D1 `media` row: `status='pending'`.
- Telegram's `getFile` caps at 20MB — fine for photos and short clips; document the limit in the bot's reply text rather than standing up a self-hosted Bot API server for it.
- Ack in Telegram ("received, in review queue") on enqueue.

**Exit criteria:** an allowlisted phone can Telegram a photo and it lands in `media-pending` + a `pending` D1 row.

---

## Phase 3 — Extraction + admin review (manual approval, no auto-publish) (1.5 days)

Nothing goes live without you clicking Approve. There is no confidence threshold, no sanity cap, no auto-gate — those are guardrails for automated decisions, and there are no automated decisions here.

**3.1 Vision extraction — advisory pre-fill only**
- On a new `pending` row, call the Anthropic API (Haiku-tier is plenty for this — it's a form auto-fill, not a gate) asking for a best-guess JSON: category, items + counts, scene description, location hint, date, OCR text.
- Parse it if it parses; if it doesn't (bad JSON, empty response), leave the fields blank. There's no retry logic and no rejection path — a failed extraction just means you type the fields yourself instead of editing pre-filled ones.
- Every row lands in `status='needs_review'` after this step, always — extraction never promotes anything to `live`.

**3.2 Admin page**
- `/admin`, gated by Cloudflare Access (your email + the friend's, if he wants to review too) — no custom auth code to write or maintain.
- Queue view: `needs_review` items, photo + pre-filled/editable fields (category, items, counts, notes).
- Per item: **Approve** (publishes as-is or with your edits), **Reject** (discarded, optional private note for your own records), or just edit fields inline before approving.
- On Approve: copy media `media-pending/` → `media-public/`, strip EXIF/GPS on the public copy, write `impact` rows from the (possibly corrected) counts, set `status='live'`.
- Also list already-`live` items so you can correct a mistake later (edit counts, unpublish) without touching D1 by hand.
- You're the content check too — if a photo shouldn't be public (identifiable patient, minor, sensitive scene), you just don't approve it. No separate flag or gate needed; that's what "you are the guardrail" means in practice.

**3.3 Notify**
- Telegram DM to yourself when new items land in the queue, so you know to check `/admin` rather than polling it.

**Exit criteria:** every photo sent via Telegram sits in the queue with a pre-filled suggestion; nothing reaches the public site until you approve it on `/admin`.

---

## Phase 4 — Impact log + counters (1 day)

**4.1 Aggregation**
- Counters = SQL aggregates over `impact` joined to `media` where `media.status='live'` (i.e., admin-approved):
  ```sql
  SELECT category, item_name, SUM(count) AS total
  FROM impact
  JOIN media ON media.id = impact.media_id
  WHERE media.status = 'live'
  GROUP BY category, item_name;
  ```

**4.2 Counter API**
- Worker returns cached JSON, recomputed on each Approve action (event-driven, not polled). Astro island fetches + animates.

**4.3 Drill-down**
- Each counter links to its underlying `live` media — the photos that sum to that number. This is the trust mechanism: the number is auditable.

**4.4 Public gallery**
- Grid of `media-public`, category filters, served from R2 via CDN, paginated.

**Exit criteria:** homepage shows live, photo-backed counters that each drill down to source evidence you personally approved.

---

## Phase 5 — On-chain inflow transparency (1 day)

**5.1 Indexer**
- Worker receives push webhooks:
  - Solana: Helius webhook on the friend's Solana address.
  - Ethereum: Alchemy webhook (Notify API) on the friend's Ethereum address — native ETH transfers to start; add USDC/major ERC-20 transfer tracking later if he ends up receiving stablecoins there, same address either way.
- Wait for a minimum confirmation depth before writing to `inflows` and counting a transfer publicly — avoids a reorg briefly overstating the total.
- Idempotent on `tx_hash` (`INSERT OR IGNORE`) — webhook redelivery must not double-count.

**5.2 Public "Received" view**
- Total received + recent-inflow feed, shown beside the impact log. Chain data is public regardless, so surfacing it natively is free trust.

**Exit criteria:** site shows verifiable, reorg-safe on-chain totals received next to verifiable, admin-approved impact delivered.

---

## Phase 6 — Connect-wallet-and-send (1–1.5 days)

Layered on top of the working address widget (Phase 1), which stays visible always.

**6.1 Ethereum**
- Reown AppKit (Web3Modal) + wagmi + viem. Connect MetaMask / Coinbase Wallet / WalletConnect.
- Prefill a plain native ETH transfer to `RECIPIENT_ADDRESSES.ethereum.address` (read from the same constants file as the widget — never re-typed). No ERC-20 ABI needed for v1; add a USDC-on-Ethereum option later if there's demand.
- Donor confirms and signs in-wallet. Site never holds keys or the signed payload beyond broadcasting.

**6.2 Solana**
- `@solana/wallet-adapter` + `@solana/web3.js`. Connect Phantom / Solflare.
- Build a native SOL `SystemProgram.transfer` to `RECIPIENT_ADDRESSES.solana.address`, same constants-file rule.

**6.3 UX**
- Amount input, chain select, connect → review (show the exact destination address + amount before signing) → sign.
- Raw-address fallback (Phase 1) stays visible on the same page.

**Exit criteria:** donor can connect a wallet and send in a couple of clicks; the address widget fallback is untouched.

---

## Phase 7 — Social auto-drafting (1 day)

**7.1 Draft generation**
- On each Approve action: Worker generates a caption + selects the photo → writes `social_drafts(media_id, platform, caption, media_key, status)`.

**7.2 Approve + post**
- You review and post manually — no auto-post to platforms.

**Exit criteria:** every approved impact item produces a ready-to-post draft; nothing auto-posts.

---

## D1 schema (reference)

```sql
CREATE TABLE media (
  id             TEXT PRIMARY KEY,          -- uuid
  update_id      INTEGER UNIQUE,             -- Telegram update_id, dedup key
  source_user    TEXT NOT NULL,               -- Telegram chat_id
  received_at    INTEGER NOT NULL,             -- unix ms
  r2_pending_key TEXT NOT NULL,
  r2_public_key  TEXT,
  status         TEXT NOT NULL CHECK (status IN ('pending','needs_review','live','rejected')),
  reject_reason  TEXT                            -- private note, only on status='rejected'
);

CREATE TABLE extraction (
  media_id      TEXT PRIMARY KEY REFERENCES media(id),
  category      TEXT,                             -- nullable: admin can fill in if extraction failed
  items_json    TEXT,                              -- suggested JSON, editable on the admin page
  scene         TEXT,
  location_hint TEXT,
  visible_date  TEXT,
  ocr_text      TEXT
);

CREATE TABLE impact (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  media_id  TEXT NOT NULL REFERENCES media(id),
  category  TEXT NOT NULL,
  item_name TEXT NOT NULL,
  count     INTEGER NOT NULL
);

CREATE TABLE inflows (
  tx_hash      TEXT PRIMARY KEY,
  chain        TEXT NOT NULL CHECK (chain IN ('solana','ethereum')),
  from_addr    TEXT NOT NULL,
  to_addr      TEXT NOT NULL,
  token        TEXT NOT NULL,                       -- 'native' or token symbol
  amount       TEXT NOT NULL,                         -- string, never a float
  confirmed_at INTEGER NOT NULL
);

CREATE TABLE social_drafts (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  media_id  TEXT NOT NULL REFERENCES media(id),
  platform  TEXT NOT NULL,
  caption   TEXT NOT NULL,
  media_key TEXT NOT NULL,
  status    TEXT NOT NULL CHECK (status IN ('draft','approved','posted','rejected'))
);
```

---

## Cross-cutting: security

- **Address integrity** is still the top risk and the one place automation is deliberately *not* trusted: single constants file (1.1), CODEOWNERS gate, `ADDRESS_ALERT` kill switch, dual-channel canonical anchor (1.4). Every send path — widget and connect-wallet — reads the same constant.
- **Telegram webhook**: secret-header check + chat_id allowlist (2.1) is the entire trust boundary for ingestion.
- **Prompt injection via photo**: no longer a gating risk, because nothing auto-publishes. A manipulated photo can at worst produce a wrong *suggested* count on the admin page — you see the photo yourself before approving, so the worst case is "you notice it's wrong and fix it or reject it."
- **Admin auth**: Cloudflare Access, not custom auth code.
- **PII/EXIF**: stripped on Approve, before the public copy is written; originals stay private.

## Two decisions to lock before writing code

1. **Rails:** one Ethereum address, one Solana address. No auto-approval — every published item is manually reviewed and approved via `/admin`.

## Critical path to first dollar

Phase 0 → Phase 1. ~1.5 days and the site is live and receiving. Phases 2–7 are transparency/review tooling layered onto an already-working donation site.
