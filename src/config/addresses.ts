/**
 * Build-time constants. NEVER fetched at runtime, never derived from any
 * API or database. Every send path in this codebase — the display widget
 * (DonationWidget) and the connect-wallet flow (ConnectSend) — imports
 * `RECIPIENT_ADDRESSES` from here and only from here.
 *
 * Any PR touching this file requires review — see .github/CODEOWNERS.
 */

const SOLANA_ADDRESS = "He4B73HniFh2RXw6dhjHARHZZMDLTni6ZFbme7c4YUjD";
const ETHEREUM_ADDRESS = "0x80CA70243F77d6969214f231cb60f971317Db9d1";

export const RECIPIENT_ADDRESSES = {
  solana: {
    chainLabel: "Solana",
    address: SOLANA_ADDRESS,
    // sha256(address).slice(0, 8) — computed once, hardcoded, not derived
    // at request time from a value that might be wrong.
    shortHash: "a95c72bc",
    explorerUrl: (addr: string) => `https://solscan.io/account/${addr}`,
  },
  ethereum: {
    chainLabel: "Ethereum",
    address: ETHEREUM_ADDRESS,
    shortHash: "7ea87f85",
    explorerUrl: (addr: string) => `https://etherscan.io/address/${addr}`,
  },
} as const;

export type ChainKey = keyof typeof RECIPIENT_ADDRESSES;

/**
 * Kill switch. Flip to true + push to main to redeploy a blocking banner
 * in place of the address on that chain, if it's ever reported compromised.
 * This is the entire incident-response runbook for a swapped-address
 * scenario: one line, one push, live in under a minute on Cloudflare.
 */
export const ADDRESS_ALERT: Record<ChainKey, boolean> = {
  solana: false,
  ethereum: false,
};

/**
 * Where the canonical, out-of-band-published address anchor post lives.
 * TODO: still a placeholder — publish both addresses once from an
 * established personal account (see plan.md 1.4 / SETUP.md step 7), then
 * put the real URL here and redeploy.
 */
export const CANONICAL_ANCHOR_URL = "https://x.com/GeorgeDonnelly/status/2072394462337323231";
