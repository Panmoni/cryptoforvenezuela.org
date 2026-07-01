import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getInflows } from "../../lib/d1";

export const prerender = false;

// Stablecoins are valued 1:1 with USD; native chain coins need a live price.
const STABLECOINS = new Set(["USDC", "USDT"]);
const NATIVE_COINGECKO_IDS: Record<string, string> = { solana: "solana", ethereum: "ethereum" };

async function fetchValuation(totals: Record<string, number>): Promise<{ usd: number; ves: number } | null> {
  const nativeChains = Object.keys(totals)
    .map((key) => key.split(":"))
    .filter(([, token]) => token === "native")
    .map(([chain]) => chain);

  try {
    const [pricesRes, ratesRes] = await Promise.all([
      nativeChains.length
        ? fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${nativeChains.map((c) => NATIVE_COINGECKO_IDS[c]).join(",")}&vs_currencies=usd`,
            { headers: { "user-agent": "cryptoforvenezuela.org (hello@panmoni.com)" } },
          )
        : null,
      fetch("https://open.er-api.com/v6/latest/USD"),
    ]);

    const prices = pricesRes?.ok ? await pricesRes.json<Record<string, { usd: number }>>() : {};
    const rates = ratesRes.ok ? await ratesRes.json<{ rates: Record<string, number> }>() : null;
    const usdToVes = rates?.rates.VES;
    if (!usdToVes) return null;

    let usd = 0;
    for (const [key, amount] of Object.entries(totals)) {
      const [chain, token] = key.split(":");
      if (STABLECOINS.has(token)) {
        usd += amount;
      } else if (token === "native") {
        const price = prices[NATIVE_COINGECKO_IDS[chain]]?.usd;
        if (price) usd += amount * price;
      }
    }
    return { usd, ves: usd * usdToVes };
  } catch {
    return null;
  }
}

export const GET: APIRoute = async () => {
  const rows = await getInflows(env.DB);
  const totals = rows.reduce<Record<string, number>>((acc, r) => {
    const key = `${r.chain}:${r.token}`;
    acc[key] = (acc[key] ?? 0) + Number(r.amount);
    return acc;
  }, {});
  const valuation = await fetchValuation(totals);
  return Response.json(
    { recent: rows, totals, valuation },
    { headers: { "cache-control": "public, max-age=30" } },
  );
};
