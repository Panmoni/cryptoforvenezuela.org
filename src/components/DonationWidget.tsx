import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { ADDRESS_ALERT, CANONICAL_ANCHOR_URL, RECIPIENT_ADDRESSES, type ChainKey } from "../config/addresses";

const SUGGESTED_USD = [5, 20, 50];

export default function DonationWidget() {
  const [chain, setChain] = useState<ChainKey>("solana");
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
            onClick={() => setChain(key)}
            aria-pressed={chain === key}
          >
            {RECIPIENT_ADDRESSES[key].chainLabel}
          </button>
        ))}
      </div>

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
