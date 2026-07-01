import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { ADDRESS_ALERT, CANONICAL_ANCHOR_URL, RECIPIENT_ADDRESSES, type ChainKey } from "../config/addresses";

const SUGGESTED_USD = [5, 20, 50];

function ChainIcon({ chain }: { chain: ChainKey }) {
  if (chain === "solana") {
    return (
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
  }
  return (
    <svg viewBox="0 0 32 32" width="16" height="16" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M16 1L16 12.8L26.5 17.8Z" fill="#8A92B2" />
      <path d="M16 1L5.5 17.8L16 12.8Z" fill="#62688F" />
      <path d="M16 20.2L16 30.9L26.5 20Z" fill="#8A92B2" />
      <path d="M16 30.9L16 20.2L5.5 20Z" fill="#62688F" />
      <path d="M16 18.4L26.5 17.8L16 12.8Z" fill="#454A75" />
      <path d="M5.5 17.8L16 18.4L16 12.8Z" fill="#8A92B2" />
    </svg>
  );
}

export default function DonationWidget() {
  const [chain, setChain] = useState<ChainKey>("solana");
  const [sendingToken, setSendingToken] = useState(false);
  const [copied, setCopied] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const target = RECIPIENT_ADDRESSES[chain];
  const alerted = ADDRESS_ALERT[chain];

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
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
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
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <ChainIcon chain={key} />
            {RECIPIENT_ADDRESSES[key].chainLabel}
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
              <p className="mono" style={{ wordBreak: "break-all", fontSize: 15 }}>
                {target.address}
              </p>
              <button type="button" className="button" onClick={copyAddress}>
                {copied ? "Copied" : "Copy address"}
              </button>

              {chain === "solana" && sendingToken && (
                <p style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 12 }}>
                  Same address for any SPL token — USDC, USDT, and others all work. Pick the token in your
                  wallet and verify its contract there before confirming.
                </p>
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
