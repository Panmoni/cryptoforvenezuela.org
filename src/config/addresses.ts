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
const BITCOIN_ADDRESS = "bc1qr8ra9rfzzvkduaq53sm6yxv2jcqey8euntfnfv";
// Same address as Ethereum, on purpose — these are all EVM-compatible
// chains, so this self-custodied wallet's address is identical across
// every one of them.
const BNB_ADDRESS = "0x80CA70243F77d6969214f231cb60f971317Db9d1";
const POLYGON_ADDRESS = "0x80CA70243F77d6969214f231cb60f971317Db9d1";
const BASE_ADDRESS = "0x80CA70243F77d6969214f231cb60f971317Db9d1";
const ARBITRUM_ADDRESS = "0x80CA70243F77d6969214f231cb60f971317Db9d1";
const BITCOIN_CASH_ADDRESS = "qp6ey0s0nntf4qqvpwl4vf4rzagc7xeshcxsv4rm96";
const TRON_ADDRESS = "TCTyS9wQY9Hz224T5CE8dxH77ipvHTbSuJ";

// EVM chains are grouped together (right after Solana) since they share
// one address — keeping them adjacent makes that obvious in the tab row.
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
  bnb: {
    chainLabel: "BNB Smart Chain",
    address: BNB_ADDRESS,
    shortHash: "7ea87f85",
    explorerUrl: (addr: string) => `https://bscscan.com/address/${addr}`,
  },
  polygon: {
    chainLabel: "Polygon",
    address: POLYGON_ADDRESS,
    shortHash: "7ea87f85",
    explorerUrl: (addr: string) => `https://polygonscan.com/address/${addr}`,
  },
  base: {
    chainLabel: "Base",
    address: BASE_ADDRESS,
    shortHash: "7ea87f85",
    explorerUrl: (addr: string) => `https://basescan.org/address/${addr}`,
  },
  arbitrum: {
    chainLabel: "Arbitrum",
    address: ARBITRUM_ADDRESS,
    shortHash: "7ea87f85",
    explorerUrl: (addr: string) => `https://arbiscan.io/address/${addr}`,
  },
  bitcoin: {
    chainLabel: "Bitcoin",
    address: BITCOIN_ADDRESS,
    shortHash: "b8096a9e",
    explorerUrl: (addr: string) => `https://mempool.space/address/${addr}`,
  },
  bitcoincash: {
    chainLabel: "Bitcoin Cash",
    address: BITCOIN_CASH_ADDRESS,
    shortHash: "914a22d8",
    explorerUrl: (addr: string) => `https://blockchair.com/bitcoin-cash/address/${addr}`,
  },
  tron: {
    chainLabel: "Tron",
    address: TRON_ADDRESS,
    shortHash: "c7478a94",
    explorerUrl: (addr: string) => `https://tronscan.org/#/address/${addr}`,
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
  bnb: false,
  polygon: false,
  base: false,
  arbitrum: false,
  bitcoin: false,
  bitcoincash: false,
  tron: false,
};

/**
 * Where the canonical, out-of-band-published address anchor post lives.
 * TODO: still a placeholder — publish both addresses once from an
 * established personal account (see plan.md 1.4 / SETUP.md step 7), then
 * put the real URL here and redeploy.
 */
export const CANONICAL_ANCHOR_URL = "https://x.com/GeorgeDonnelly/status/2072394462337323231";
