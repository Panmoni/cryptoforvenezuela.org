-- Phase 0/2/3/4/5/7 schema. Manual-review model: nothing reaches `live`
-- without a human clicking Approve on /admin. No auto-approval columns.

CREATE TABLE media (
  id             TEXT PRIMARY KEY,          -- uuid
  update_id      INTEGER UNIQUE,            -- Telegram update_id, dedupe key
  source_user    TEXT NOT NULL,             -- Telegram chat_id
  received_at    INTEGER NOT NULL,          -- unix ms
  media_kind     TEXT NOT NULL CHECK (media_kind IN ('photo','video','document')),
  r2_pending_key TEXT NOT NULL,
  r2_public_key  TEXT,
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','needs_review','live','rejected')),
  reject_reason  TEXT
);

CREATE INDEX idx_media_status ON media(status);

CREATE TABLE extraction (
  media_id      TEXT PRIMARY KEY REFERENCES media(id),
  category      TEXT,             -- nullable: admin fills in if extraction failed/was skipped
  items_json    TEXT,             -- suggested JSON, editable on the admin page
  scene         TEXT,
  location_hint TEXT,
  visible_date  TEXT,
  ocr_text      TEXT,
  extracted_at  INTEGER
);

CREATE TABLE impact (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  media_id  TEXT NOT NULL REFERENCES media(id),
  category  TEXT NOT NULL,
  item_name TEXT NOT NULL,
  count     INTEGER NOT NULL
);

CREATE INDEX idx_impact_media ON impact(media_id);
CREATE INDEX idx_impact_category_item ON impact(category, item_name);

CREATE TABLE inflows (
  tx_hash      TEXT PRIMARY KEY,
  chain        TEXT NOT NULL CHECK (chain IN ('solana','ethereum')),
  from_addr    TEXT NOT NULL,
  to_addr      TEXT NOT NULL,
  token        TEXT NOT NULL,      -- 'native' or token symbol
  amount       TEXT NOT NULL,      -- decimal string, never a float
  confirmed_at INTEGER NOT NULL
);

CREATE INDEX idx_inflows_chain_confirmed ON inflows(chain, confirmed_at);

CREATE TABLE social_drafts (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  media_id  TEXT NOT NULL REFERENCES media(id),
  platform  TEXT NOT NULL,
  caption   TEXT NOT NULL,
  media_key TEXT NOT NULL,
  status    TEXT NOT NULL DEFAULT 'draft'
            CHECK (status IN ('draft','approved','posted','rejected'))
);

CREATE TABLE allowlist (
  chat_id TEXT PRIMARY KEY,
  label   TEXT
);
