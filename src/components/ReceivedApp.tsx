import { useEffect, useState } from "react";

interface InflowRow {
  tx_hash: string;
  chain: "solana" | "ethereum" | "bitcoin" | "bnb" | "bitcoincash";
  from_addr: string;
  amount: string;
  token: string;
  confirmed_at: number;
}

const EXPLORERS: Record<InflowRow["chain"], (tx: string) => string> = {
  solana: (tx) => `https://solscan.io/tx/${tx}`,
  ethereum: (tx) => `https://etherscan.io/tx/${tx}`,
  bitcoin: (tx) => `https://mempool.space/tx/${tx}`,
  bnb: (tx) => `https://bscscan.com/tx/${tx}`,
  bitcoincash: (tx) => `https://blockchair.com/bitcoin-cash/transaction/${tx}`,
};

const PAGE_SIZE = 10;

export default function ReceivedApp() {
  const [recent, setRecent] = useState<InflowRow[] | null>(null);
  const [totals, setTotals] = useState<Record<string, number> | null>(null);
  const [valuation, setValuation] = useState<{ usd: number; ves: number } | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const load = () =>
      fetch("/api/inflows")
        .then((r) => r.json<{ recent: InflowRow[]; totals: Record<string, number>; valuation: { usd: number; ves: number } | null }>())
        .then((d) => {
          setRecent(d.recent);
          setTotals(d.totals);
          setValuation(d.valuation);
        });
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <section className="section">
        <h2>Totals received</h2>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {totals &&
            Object.entries(totals).map(([key, total]) => (
              <div key={key} className="card">
                <div style={{ fontSize: 24, fontWeight: 700 }}>{total.toLocaleString(undefined, { maximumFractionDigits: 6 })}</div>
                <div style={{ color: "var(--text-dim)" }}>{key.replace(":", " · ")}</div>
              </div>
            ))}
          {totals && Object.keys(totals).length === 0 && (
            <p style={{ color: "var(--text-dim)" }}>Nothing confirmed on-chain yet.</p>
          )}
        </div>
        {valuation && (
          <p style={{ color: "var(--text-dim)", marginTop: 12 }}>
            ≈ ${valuation.usd.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD · Bs.{" "}
            {valuation.ves.toLocaleString(undefined, { maximumFractionDigits: 0 })} VES
          </p>
        )}
      </section>

      <section className="section">
        <h2>Recent transfers</h2>
        {recent?.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE).map((row) => (
          <div key={row.tx_hash} className="card" style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>
              {row.amount} {row.token} on {row.chain}
            </span>
            <span style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <span style={{ color: "var(--text-dim)", fontSize: 13 }}>
                {new Date(row.confirmed_at).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
              <a href={EXPLORERS[row.chain](row.tx_hash)} target="_blank" rel="noreferrer">
                view tx
              </a>
            </span>
          </div>
        ))}
        {recent && recent.length > PAGE_SIZE && (
          <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "center", marginTop: 12 }}>
            <button type="button" className="button secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span style={{ color: "var(--text-dim)", fontSize: 13 }}>
              Page {page + 1} of {Math.ceil(recent.length / PAGE_SIZE)}
            </span>
            <button
              type="button"
              className="button secondary"
              disabled={page >= Math.ceil(recent.length / PAGE_SIZE) - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
