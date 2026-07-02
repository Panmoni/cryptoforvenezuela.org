import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import QRCode from "qrcode";
import { PublicKey } from "@solana/web3.js";
import { ADDRESS_ALERT, CANONICAL_ANCHOR_URL, RECIPIENT_ADDRESSES, type ChainKey } from "../config/addresses";

const SUGGESTED_USD = [5, 20, 50];

// Canonical, immutable Solana program/mint addresses — safe to hardcode,
// same category of well-known constant as the recipient addresses' shortHash.
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const USDC_MINT_SOLANA = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

/** Derives the Associated Token Account address deterministically from
 * (owner, mint) — the same PDA formula @solana/spl-token's
 * getAssociatedTokenAddressSync uses, done by hand here since
 * @solana/web3.js (already a dependency) has everything needed. This is
 * display-only, for verification: donors still send to the plain wallet
 * address above — their wallet resolves the token account itself. */
function deriveAssociatedTokenAddress(owner: PublicKey, mint: PublicKey): string {
  const [ata] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  return ata.toBase58();
}

const SOLANA_ICON = (
  <svg viewBox="0 0 32 32" width="16" height="16" aria-hidden="true" style={{ flexShrink: 0 }}>
    <defs>
      <linearGradient id="solana-grad" x1="2" y1="26" x2="30" y2="6">
        <stop offset="0" stopColor="#9945FF" />
        <stop offset="1" stopColor="#14F195" />
      </linearGradient>
    </defs>
    <path d="M7 21.5L10.5 18H27L23.5 21.5Z" fill="url(#solana-grad)" />
    <path d="M7 10.5L10.5 7H27L23.5 10.5Z" fill="url(#solana-grad)" />
    <path d="M23.5 16L27 12.5H10.5L7 16Z" fill="url(#solana-grad)" />
  </svg>
);

const ETHEREUM_ICON = (
  <svg viewBox="0 0 32 32" width="16" height="16" aria-hidden="true" style={{ flexShrink: 0 }}>
    <path d="M16 1L16 12.8L26.5 17.8Z" fill="#8A92B2" />
    <path d="M16 1L5.5 17.8L16 12.8Z" fill="#62688F" />
    <path d="M16 20.2L16 30.9L26.5 20Z" fill="#8A92B2" />
    <path d="M16 30.9L16 20.2L5.5 20Z" fill="#62688F" />
    <path d="M16 18.4L26.5 17.8L16 12.8Z" fill="#454A75" />
    <path d="M5.5 17.8L16 18.4L16 12.8Z" fill="#8A92B2" />
  </svg>
);

// Simple Icons brand marks — single-color, official hex per icon.
const BITCOIN_ICON = (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" style={{ flexShrink: 0 }}>
    <path
      fill="#F7931A"
      d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.548v-.002zm-6.35-4.613c.24-1.59-.974-2.45-2.64-3.03l.54-2.153-1.315-.33-.525 2.107c-.345-.087-.705-.167-1.064-.25l.526-2.127-1.32-.33-.54 2.165c-.285-.067-.565-.132-.84-.2l-1.815-.45-.35 1.407s.975.225.955.236c.535.136.63.486.615.766l-1.477 5.92c-.075.166-.24.406-.614.314.015.02-.96-.24-.96-.24l-.66 1.51 1.71.426.93.242-.54 2.19 1.32.327.54-2.17c.36.1.705.19 1.05.273l-.51 2.154 1.32.33.545-2.19c2.24.427 3.93.257 4.64-1.774.57-1.637-.03-2.58-1.217-3.196.854-.193 1.5-.76 1.68-1.93h.01zm-3.01 4.22c-.404 1.64-3.157.75-4.05.53l.72-2.9c.896.23 3.757.67 3.33 2.37zm.41-4.24c-.37 1.49-2.662.735-3.405.55l.654-2.64c.744.18 3.137.524 2.75 2.084v.006z"
    />
  </svg>
);

const BNB_ICON = (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" style={{ flexShrink: 0 }}>
    <path
      fill="#F0B90B"
      d="M5.631 3.676 12.001 0l6.367 3.676-2.34 1.358L12 2.716 7.972 5.034l-2.34-1.358Zm12.737 4.636-2.34-1.358L12 9.272 7.972 6.954l-2.34 1.358v2.716l4.026 2.318v4.636L12 19.341l2.341-1.359v-4.636l4.027-2.318V8.312Zm0 7.352v-2.716l-2.34 1.358v2.716l2.34-1.358Zm1.663.96-4.027 2.318v2.717l6.368-3.677V10.63l-2.34 1.358v4.636Zm-2.34-10.63 2.34 1.358v2.716l2.341-1.358V5.994l-2.34-1.358-2.342 1.358ZM9.657 19.926v2.716L12 24l2.341-1.358v-2.716l-2.34 1.358-2.343-1.358Zm-4.027-4.262 2.341 1.358v-2.716l-2.34-1.358v2.716Zm4.027-9.67L12 7.352l2.341-1.358-2.34-1.358-2.343 1.358Zm-5.69 1.358L6.31 5.994 3.968 4.636l-2.34 1.358V8.71l2.34 1.358V7.352Zm0 4.636-2.34-1.358v7.352l6.368 3.677v-2.717l-4.028-2.318v-4.636Z"
    />
  </svg>
);

const BITCOIN_CASH_ICON = (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" style={{ flexShrink: 0 }}>
    <path
      fill="#0AC18E"
      d="m10.84 11.22-.688-2.568c.728-.18 2.839-1.051 3.39.506.27 1.682-1.978 1.877-2.702 2.062zm.289 1.313.755 2.829c.868-.228 3.496-.46 3.241-2.351-.433-1.666-3.125-.706-3.996-.478zM24 12c0 6.627-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0s12 5.373 12 12zm-6.341.661c-.183-1.151-1.441-2.095-2.485-2.202.643-.57.969-1.401.57-2.488-.603-1.368-1.989-1.66-3.685-1.377l-.546-2.114-1.285.332.536 2.108c-.338.085-.685.158-1.029.256L9.198 5.08l-1.285.332.545 2.114c-.277.079-2.595.673-2.595.673l.353 1.377s.944-.265.935-.244c.524-.137.771.125.886.372l1.498 5.793c.018.168-.012.454-.372.551.021.012-.935.241-.935.241l.14 1.605s2.296-.588 2.598-.664l.551 2.138 1.285-.332-.551-2.153c.353-.082.697-.168 1.032-.256l.548 2.141 1.285-.332-.551-2.135c1.982-.482 3.38-1.73 3.094-3.64z"
    />
  </svg>
);

const CHAIN_ICONS: Record<ChainKey, ReactElement> = {
  solana: SOLANA_ICON,
  ethereum: ETHEREUM_ICON,
  bitcoin: BITCOIN_ICON,
  bnb: BNB_ICON,
  bitcoincash: BITCOIN_CASH_ICON,
};

function ChainIcon({ chain }: { chain: ChainKey }) {
  return CHAIN_ICONS[chain];
}

export default function DonationWidget() {
  const [chain, setChain] = useState<ChainKey>("solana");
  const [sendingToken, setSendingToken] = useState(false);
  const [copied, setCopied] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const target = RECIPIENT_ADDRESSES[chain];
  const alerted = ADDRESS_ALERT[chain];
  const usdcTokenAccount = useMemo(
    () => deriveAssociatedTokenAddress(new PublicKey(RECIPIENT_ADDRESSES.solana.address), USDC_MINT_SOLANA),
    [],
  );

  useEffect(() => {
    if (!canvasRef.current || alerted) return;
    QRCode.toCanvas(canvasRef.current, target.address, { width: 220, margin: 1 }).catch(() => {
      // If QR rendering fails client-side for any reason, the address text
      // + copy button below is the fallback — the donor never depends on
      // the QR alone.
    });
  }, [target.address, alerted]);

  async function copyAddress() {
    await navigator.clipboard.writeText(target.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="card" aria-live="polite">
      <div className="chain-tabs" style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {(Object.keys(RECIPIENT_ADDRESSES) as ChainKey[]).map((key) => (
          <button
            key={key}
            type="button"
            className={chain === key ? "button" : "button secondary"}
            onClick={() => {
              setChain(key);
              setSendingToken(false);
            }}
            aria-pressed={chain === key}
            aria-label={RECIPIENT_ADDRESSES[key].chainLabel}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <ChainIcon chain={key} />
            <span className="chain-tab-label">{RECIPIENT_ADDRESSES[key].chainLabel}</span>
          </button>
        ))}
      </div>

      {chain === "solana" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            className={!sendingToken ? "button" : "button secondary"}
            onClick={() => setSendingToken(false)}
            aria-pressed={!sendingToken}
          >
            SOL
          </button>
          <button
            type="button"
            className={sendingToken ? "button" : "button secondary"}
            onClick={() => setSendingToken(true)}
            aria-pressed={sendingToken}
          >
            Token
          </button>
        </div>
      )}

      {alerted ? (
        <div className="alert-banner" role="alert">
          This {target.chainLabel} address has been flagged and is temporarily suspended. Do not send funds to
          it. Check {CANONICAL_ANCHOR_URL} for the latest verified address.
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
            <canvas ref={canvasRef} width={220} height={220} style={{ borderRadius: 8, background: "#fff" }} />
            <div style={{ flex: 1, minWidth: 220 }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                  margin: "0 0 6px",
                }}
              >
                Send here — {sendingToken ? "SOL or any SPL token" : "any amount"}
              </p>
              <p className="mono" style={{ wordBreak: "break-all", fontSize: 15 }}>
                {target.address}
              </p>
              <button type="button" className="button" onClick={copyAddress}>
                {copied ? "Copied" : "Copy address"}
              </button>

              {chain === "solana" && sendingToken && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 12,
                    borderRadius: "var(--radius)",
                    border: "1px dashed var(--border)",
                    background: "var(--bg)",
                  }}
                >
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--text-dim)",
                      margin: "0 0 6px",
                    }}
                  >
                    Verify only — not a send address
                  </p>
                  <p style={{ fontSize: 13, color: "var(--text-dim)" }}>
                    Your wallet resolves the token account for you — always send to the address above, for
                    SOL and every SPL token alike. This is where USDC specifically ends up on-chain, shown so
                    you can independently confirm it after sending:
                  </p>
                  <p className="mono" style={{ fontSize: 13, color: "var(--text-dim)", wordBreak: "break-all", marginTop: 8 }}>
                    {usdcTokenAccount}
                  </p>
                </div>
              )}

              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: 14, color: "var(--text-dim)", margin: "0 0 8px" }}>Suggested amounts:</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {SUGGESTED_USD.map((amt) => (
                    <span key={amt} className="mono" style={{ fontSize: 14, color: "var(--text-dim)" }}>
                      ${amt}
                    </span>
                  ))}
                  <span style={{ fontSize: 14, color: "var(--text-dim)" }}>or any amount</span>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="button secondary"
            style={{ marginTop: 20 }}
            onClick={() => setVerifyOpen((v) => !v)}
            aria-expanded={verifyOpen}
          >
            {verifyOpen ? "Hide verification" : "Verify this address"}
          </button>

          {verifyOpen && (
            <div style={{ marginTop: 12, fontSize: 14, color: "var(--text-dim)" }}>
              <p>
                Check value: <span className="mono">{target.shortHash}</span>
              </p>
              <p>
                This address was published once, from an established channel, and hasn't changed since:{" "}
                <a href={CANONICAL_ANCHOR_URL} target="_blank" rel="noreferrer">
                  canonical source
                </a>
              </p>
              <p>
                <a href={target.explorerUrl(target.address)} target="_blank" rel="noreferrer">
                  View on block explorer
                </a>
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
