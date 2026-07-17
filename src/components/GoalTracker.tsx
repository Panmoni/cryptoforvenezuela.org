import { useEffect, useState } from "react";
import { fetchJsonWithRetry } from "../lib/fetchJson";
import { GOAL_BUCKETS, RELIEF_GOAL_USD, GOAL_COPY, type GoalLang } from "../config/goals";

interface InflowsResponse {
  valuation: { usd: number; ves: number } | null;
}

// Distinct, on-brand zone tints. Red (--red) is deliberately excluded — the
// stylesheet reserves it for alerts.
const ZONE_TINT: Record<string, string> = {
  supplies: "var(--accent)",
  shelter: "var(--blue)",
  animals: "#2f9e79",
};

/** Live progress against the published relief plan. The "raised" figure is
 * the same USD valuation ReceivedApp shows (from /api/inflows) — one real
 * total, not a per-bucket attribution; see src/config/goals.ts. */
export default function GoalTracker({ lang }: { lang: GoalLang }) {
  const c = GOAL_COPY[lang];
  // undefined = still loading; null = fetch ok but USD valuation unavailable
  // (price/FX feed down); object = live figure.
  const [valuation, setValuation] = useState<{ usd: number; ves: number } | null | undefined>(undefined);

  useEffect(() => {
    const load = () =>
      fetchJsonWithRetry<InflowsResponse>("/api/inflows")
        .then((d) => setValuation(d.valuation))
        .catch((err) => console.error("failed to load inflows", err));
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  const usd = valuation?.usd ?? 0;
  const pct = Math.min(usd / RELIEF_GOAL_USD, 1) * 100;
  const toGo = Math.max(RELIEF_GOAL_USD - usd, 0);
  const haveFigure = valuation !== undefined && valuation !== null;

  const fmtUsd = (n: number) =>
    new Intl.NumberFormat(lang, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

  return (
    <section className="section" id="plan">
      <h2>{c.progressHeading}</h2>

      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 40, fontWeight: 700, lineHeight: 1 }}>
          {valuation === undefined ? "…" : fmtUsd(usd)}
        </span>
        <span style={{ color: "var(--text-dim)" }}>{c.raised}</span>
      </div>
      <p style={{ color: "var(--text-dim)", margin: "6px 0 0", fontSize: 14 }}>
        {c.ofGoal} {fmtUsd(RELIEF_GOAL_USD)}
        {haveFigure && <> · {Math.round(pct)}%</>}
        {haveFigure && valuation!.ves > 0 && (
          <> · ≈ Bs. {valuation!.ves.toLocaleString(lang, { maximumFractionDigits: 0 })}</>
        )}
      </p>
      {valuation === null && (
        <p style={{ color: "var(--text-dim)", margin: "4px 0 0", fontSize: 13 }}>{c.unavailable}</p>
      )}

      {/* Segmented thermometer: one accent fill over neutral, labeled zones. */}
      <div
        role="progressbar"
        aria-valuenow={Math.round(usd)}
        aria-valuemin={0}
        aria-valuemax={RELIEF_GOAL_USD}
        aria-label={c.progressHeading}
        style={{
          position: "relative",
          height: 30,
          marginTop: 20,
          background: "var(--bg-raised)",
          border: "1px solid var(--border)",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            insetBlock: 0,
            left: 0,
            width: `${pct}%`,
            background: "linear-gradient(90deg, var(--accent), #ffd968)",
            transition: "width .6s ease",
          }}
        />
        {GOAL_BUCKETS.slice(0, -1).map((b, i) => {
          const boundary = GOAL_BUCKETS.slice(0, i + 1).reduce((s, x) => s + x.usd, 0);
          return (
            <div
              key={b.key}
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: `${(boundary / RELIEF_GOAL_USD) * 100}%`,
                width: 2,
                background: "var(--bg)",
              }}
            />
          );
        })}
      </div>

      {/* Zone $ labels, flex-sized to match each segment's share of the bar. */}
      <div style={{ display: "flex", marginTop: 8, gap: 2 }}>
        {GOAL_BUCKETS.map((b) => (
          <div key={b.key} style={{ flexGrow: b.usd, flexBasis: 0, fontSize: 12, color: "var(--text-dim)" }}>
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: 2,
                background: ZONE_TINT[b.key],
                marginRight: 6,
              }}
            />
            {fmtUsd(b.usd)}
          </div>
        ))}
      </div>

      <p style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 14, maxWidth: "60ch" }}>
        {haveFigure && (
          <>
            <strong style={{ color: "var(--text)" }}>{fmtUsd(toGo)}</strong> {c.toGo} ·{" "}
          </>
        )}
        {c.planNote}
      </p>

      {/* The plan in words — what each slice buys. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginTop: 24,
        }}
      >
        {GOAL_BUCKETS.map((b) => (
          <div key={b.key} className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{ width: 10, height: 10, borderRadius: 3, background: ZONE_TINT[b.key], flexShrink: 0 }}
              />
              <strong>{fmtUsd(b.usd)}</strong>
            </div>
            <h3 style={{ fontSize: 16, margin: "10px 0 6px" }}>{c.buckets[b.key].title}</h3>
            <p style={{ color: "var(--text-dim)", fontSize: 14, margin: 0 }}>{c.buckets[b.key].body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
