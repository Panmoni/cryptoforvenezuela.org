-- SQLite can't ALTER a CHECK constraint in place — rebuild the table with
-- the widened constraint, same columns/indexes, existing rows untouched.
CREATE TABLE inflows_new (
  tx_hash      TEXT PRIMARY KEY,
  chain        TEXT NOT NULL CHECK (chain IN ('solana','ethereum','bitcoin','bnb','bitcoincash')),
  from_addr    TEXT NOT NULL,
  to_addr      TEXT NOT NULL,
  token        TEXT NOT NULL,
  amount       TEXT NOT NULL,
  confirmed_at INTEGER NOT NULL
);

INSERT INTO inflows_new SELECT * FROM inflows;
DROP TABLE inflows;
ALTER TABLE inflows_new RENAME TO inflows;

CREATE INDEX idx_inflows_chain_confirmed ON inflows(chain, confirmed_at);
