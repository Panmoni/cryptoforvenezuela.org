import { useEffect, useState } from "react";

interface InflowRow {
  tx_hash: string;
  chain: "solana" | "ethereum";
  from_addr: string;
  amount: string;
  token: string;
  confirmed_at: number;
}

const EXPLORERS: Record<InflowRow["chain"], (tx: string) => string> = {
  solana: (tx) => `https://solscan.io/tx/${tx}`,
  ethereum: (tx) => `https://etherscan.io/tx/${tx}`,
};

export default function ReceivedApp() {
  const [recent, setRecent] = useState<InflowRow[] | null>(null);
  const [totals, setTotals] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    fetch("/api/inflows")
      .then((r) => r.json())
      .then((d) => {
        setRecent(d.recent);
        setTotals(d.totals);
      });
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
      </section>

      <section className="section">
        <h2>Recent transfers</h2>
        {recent?.map((row) => (
          <div key={row.tx_hash} className="card" style={{ marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
            <span>
              {row.amount} {row.token} on {row.chain}
            </span>
            <a href={EXPLORERS[row.chain](row.tx_hash)} target="_blank" rel="noreferrer">
              view tx
            </a>
          </div>
        ))}
      </section>
    </div>
  );
}
