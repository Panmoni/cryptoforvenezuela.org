import { useState } from "react";
import EthSend from "./EthSend";
import SolanaSend from "./SolanaSend";
import type { ChainKey } from "../config/addresses";

/**
 * Convenience layer on top of DonationWidget's raw address + QR, which
 * stays visible on the page regardless — this is optional, not a
 * replacement, for donors without a wallet-less fallback need.
 */
export default function ConnectSend() {
  const [chain, setChain] = useState<ChainKey>("solana");

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
          type="button"
          className={chain === "solana" ? "button" : "button secondary"}
          onClick={() => setChain("solana")}
        >
          Solana wallet
        </button>
        <button
          type="button"
          className={chain === "ethereum" ? "button" : "button secondary"}
          onClick={() => setChain("ethereum")}
        >
          Ethereum wallet
        </button>
      </div>
      {chain === "solana" ? <SolanaSend /> : <EthSend />}
    </div>
  );
}
