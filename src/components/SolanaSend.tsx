import { useMemo, useState } from "react";
import { ConnectionProvider, WalletProvider, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, clusterApiUrl } from "@solana/web3.js";
import { RECIPIENT_ADDRESSES } from "../config/addresses";
import "@solana/wallet-adapter-react-ui/styles.css";

const RPC_ENDPOINT = import.meta.env.PUBLIC_SOLANA_RPC_URL || clusterApiUrl("mainnet-beta");

export default function SolanaSend() {
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={RPC_ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <SolanaSendInner />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

function SolanaSendInner() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();
  const [amount, setAmount] = useState("0.05");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const target = RECIPIENT_ADDRESSES.solana.address;

  async function send() {
    if (!publicKey) return;
    setBusy(true);
    setStatus(null);
    try {
      const lamports = Math.round(Number(amount) * LAMPORTS_PER_SOL);
      const tx = new Transaction().add(
        SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: new PublicKey(target), lamports }),
      );
      const signature = await sendTransaction(tx, connection);
      setStatus(`Sent: ${signature}`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <WalletMultiButton />

      {connected && (
        <div style={{ marginTop: 16 }}>
          <label>
            Amount (SOL){" "}
            <input value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: 100 }} />
          </label>
          <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "8px 0" }}>
            Sending from <span className="mono">{publicKey?.toBase58()}</span> to{" "}
            <span className="mono">{target}</span> — check this matches the address shown above before
            approving in your wallet.
          </p>
          <button type="button" className="button" disabled={busy} onClick={send}>
            {busy ? "Confirm in wallet…" : `Send ${amount} SOL`}
          </button>
          {status && (
            <p style={{ fontSize: 13, marginTop: 8 }}>
              {status.startsWith("Sent:") ? (
                <a href={`https://solscan.io/tx/${status.replace("Sent: ", "")}`} target="_blank" rel="noreferrer">
                  {status}
                </a>
              ) : (
                <span style={{ color: "var(--red)" }}>{status}</span>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
