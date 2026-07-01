import { formatUnits } from "viem";
import { RECIPIENT_ADDRESSES } from "../../../src/config/addresses";

interface Env {
  DB: D1Database;
  HELIUS_API_KEY: string;
  ALCHEMY_API_KEY: string;
}

const LAMPORTS_DECIMALS = 9;
const POLL_LIMIT = 50;

// Known Solana SPL mints we recognize by symbol; anything else falls back to
// its mint address so it still shows up rather than being silently dropped.
const SOLANA_MINT_SYMBOLS: Record<string, string> = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "USDC",
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: "USDT",
};

export default {
  // Real trigger — see wrangler.jsonc `triggers.crons`.
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(pollAll(env));
  },

  // Manual trigger for testing (`wrangler dev` doesn't fire cron without
  // extra flags) — read-only against public on-chain data, so no auth
  // needed; worst case of hitting this is a wasted API call.
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "GET") return new Response("not found", { status: 404 });
    const result = await pollAll(env);
    return Response.json(result);
  },
};

async function pollAll(env: Env) {
  const [solana, ethereum] = await Promise.allSettled([pollSolana(env), pollEthereum(env)]);
  return {
    solana: solana.status === "fulfilled" ? solana.value : { error: String(solana.reason) },
    ethereum: ethereum.status === "fulfilled" ? ethereum.value : { error: String(ethereum.reason) },
  };
}

// --- Solana / Helius ----------------------------------------------------

interface HeliusTx {
  signature: string;
  timestamp: number; // unix seconds
  nativeTransfers?: { fromUserAccount: string; toUserAccount: string; amount: number }[];
  // Helius resolves the owning wallet (not the raw token account) into
  // from/toUserAccount here, and tokenAmount is already decimal-adjusted.
  tokenTransfers?: { fromUserAccount: string; toUserAccount: string; mint: string; tokenAmount: number }[];
}

async function pollSolana(env: Env): Promise<{ inserted: number }> {
  const target = RECIPIENT_ADDRESSES.solana.address;
  const res = await fetch(
    `https://api.helius.xyz/v0/addresses/${target}/transactions?api-key=${env.HELIUS_API_KEY}&limit=${POLL_LIMIT}`,
  );
  if (!res.ok) throw new Error(`Helius ${res.status}`);
  const txs = (await res.json()) as HeliusTx[];

  const statements = [];
  for (const tx of txs) {
    for (const transfer of tx.nativeTransfers ?? []) {
      if (transfer.toUserAccount !== target) continue;
      statements.push(
        env.DB.prepare(
          `INSERT OR IGNORE INTO inflows (tx_hash, chain, from_addr, to_addr, token, amount, confirmed_at)
           VALUES (?, 'solana', ?, ?, 'native', ?, ?)`,
        ).bind(
          tx.signature,
          transfer.fromUserAccount,
          transfer.toUserAccount,
          formatUnits(BigInt(transfer.amount), LAMPORTS_DECIMALS),
          tx.timestamp * 1000,
        ),
      );
    }
    for (const transfer of tx.tokenTransfers ?? []) {
      if (transfer.toUserAccount !== target) continue;
      statements.push(
        env.DB.prepare(
          `INSERT OR IGNORE INTO inflows (tx_hash, chain, from_addr, to_addr, token, amount, confirmed_at)
           VALUES (?, 'solana', ?, ?, ?, ?, ?)`,
        ).bind(
          tx.signature,
          transfer.fromUserAccount,
          transfer.toUserAccount,
          SOLANA_MINT_SYMBOLS[transfer.mint] ?? transfer.mint,
          String(transfer.tokenAmount),
          tx.timestamp * 1000,
        ),
      );
    }
  }
  if (statements.length) await env.DB.batch(statements);
  return { inserted: statements.length };
}

// --- Ethereum / Alchemy ---------------------------------------------------

interface AlchemyTransfer {
  hash: string;
  from: string;
  to: string;
  value: number | null;
  asset: string | null;
  category: string;
  metadata?: { blockTimestamp?: string };
}

async function pollEthereum(env: Env): Promise<{ inserted: number }> {
  const target = RECIPIENT_ADDRESSES.ethereum.address;
  const res = await fetch(`https://eth-mainnet.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "alchemy_getAssetTransfers",
      params: [
        {
          toAddress: target,
          category: ["external", "erc20"],
          order: "desc",
          maxCount: `0x${POLL_LIMIT.toString(16)}`,
          excludeZeroValue: true,
          withMetadata: true,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Alchemy ${res.status}`);
  const json = (await res.json()) as { result?: { transfers: AlchemyTransfer[] }; error?: { message: string } };
  if (json.error) throw new Error(`Alchemy: ${json.error.message}`);

  const statements = (json.result?.transfers ?? [])
    .filter((t) => t.to?.toLowerCase() === target.toLowerCase() && t.value != null)
    .map((t) => {
      const confirmedAt = t.metadata?.blockTimestamp ? Date.parse(t.metadata.blockTimestamp) : Date.now();
      return env.DB.prepare(
        `INSERT OR IGNORE INTO inflows (tx_hash, chain, from_addr, to_addr, token, amount, confirmed_at)
         VALUES (?, 'ethereum', ?, ?, ?, ?, ?)`,
      ).bind(t.hash, t.from, t.to, t.category === "external" ? "native" : (t.asset ?? "unknown"), String(t.value), confirmedAt);
    });
  if (statements.length) await env.DB.batch(statements);
  return { inserted: statements.length };
}
