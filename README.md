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

## Subtitling social clips

Ad hoc video clips (e.g. testimony/delivery footage bound for X) get English
subtitles burned in locally — this never touches R2/D1/the gallery pipeline.

- `scripts/subtitle-local.sh <video-file> [source-language] [output-dir]` —
  takes a local file straight through. The only network call is to
  `/api/tools/subtitles` (Whisper transcription + m2m100 translation); nothing
  is uploaded or published anywhere.
- `scripts/subtitle.sh <media-id> [source-language] [output-dir]` — same, but
  for a file already live at `/api/media/<id>` (downloads it first).

Both scripts extract audio, call the subtitles API, then burn the returned SRT
into the video with `ffmpeg`.

### Lessons learned (free fixes, no new spend)

- **Force 8-bit output.** Newer-iPhone footage is often 10-bit HEVC
  (`yuv420p10le`). Burning subtitles re-encodes to H.264 but doesn't change
  pixel format on its own, so the output silently becomes H.264 profile
  "High 10" — which almost no player or platform (X included) fails to open.
  Both scripts now pass `-pix_fmt yuv420p` on the burn-in step to force
  standard 8-bit output. If an older subtitled file won't open, this is why —
  regenerate it with the current script.
- **Translate whole sentences, not subtitle-sized fragments.** `m2m100` needs
  sentence-level context to disambiguate; translating already-chopped ~70-char
  cue fragments in isolation produced garbled output at chunk boundaries.
  `transcribeAndTranslate` (`src/lib/subtitle.ts`) now translates each whole
  Whisper segment first, then splits the *translated* English text into
  on-screen cues — which also fixes cue-length sizing, since Spanish and
  English don't have the same character count for the same content.
- **Glossary placeholder-protect for recurring mistranslations.**
  `m2m100` has no glossary/domain-hint support and has no reliable way to
  learn Venezuelan-Spanish relief-testimony vocabulary (`carpa` → tent,
  `pañalitis` → diaper rash, `talco` → baby powder come up repeatedly and were
  each mistranslated or garbled inconsistently). Post-hoc-correcting the
  English output is whack-a-mole — the model doesn't always fail the same
  way. Instead `translateToEnglish` (`src/lib/translate.ts`) swaps each known
  term for a numeric placeholder before calling the model, then restores the
  correct English word after — the model never sees the term it can't
  translate. Add new recurring terms to `GLOSSARY_TERMS` there as they turn
  up; don't try to catch every garbled variant with regex on the output side.
- **Whisper's own `task: "translate"` doesn't work here.** Tested directly
  against several source-language hints — output stayed in the source
  language every time. Don't retry this; transcribe (Whisper) + translate
  (m2m100) as two separate calls is the working path (documented in
  `src/lib/subtitle.ts`).
- **Retry once after a fresh deploy before assuming a fix didn't work.**
  Cloudflare's edge can serve a stale Worker version for a short window after
  `wrangler deploy`; a request right after deploy can hit old code even
  though the new version is live.

## Two things to never do

1. Never fetch the recipient addresses at runtime — they're build-time
   constants in `src/config/addresses.ts` for a reason.
2. Never auto-publish media. Everything from Telegram lands in
   `needs_review` and stays there until a human approves it on `/admin`.
