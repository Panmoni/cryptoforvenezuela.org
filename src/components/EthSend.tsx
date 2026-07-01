import { useEffect, useState } from "react";
import { WagmiProvider, useConnection, useSendTransaction } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { parseEther } from "viem";
import { ensureAppKitInitialized, wagmiAdapter } from "../lib/appkit";
import { RECIPIENT_ADDRESSES } from "../config/addresses";

const queryClient = new QueryClient();

export default function EthSend() {
  useEffect(() => {
    ensureAppKitInitialized();
  }, []);

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <EthSendInner />
      </QueryClientProvider>
    </WagmiProvider>
  );
}

function EthSendInner() {
  const { isConnected, address } = useConnection();
  const { mutate: sendTransaction, data: hash, isPending, error } = useSendTransaction();
  const [amount, setAmount] = useState("0.01");

  const target = RECIPIENT_ADDRESSES.ethereum.address;

  return (
    <div>
      {/* AppKit's web component — registered by createAppKit(), works as
          plain HTML in a React tree without extra wiring. */}
      <appkit-button />

      {isConnected && (
        <div style={{ marginTop: 16 }}>
          <label>
            Amount (ETH){" "}
            <input value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: 100 }} />
          </label>
          <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "8px 0" }}>
            Sending from <span className="mono">{address}</span> to{" "}
            <span className="mono">{target}</span> — check this matches the address shown above before
            confirming in your wallet.
          </p>
          <button
            type="button"
            className="button"
            disabled={isPending}
            onClick={() => sendTransaction({ to: target as `0x${string}`, value: parseEther(amount) })}
          >
            {isPending ? "Confirm in wallet…" : `Send ${amount} ETH`}
          </button>
          {hash && (
            <p style={{ fontSize: 13, marginTop: 8 }}>
              Sent: <a href={`https://etherscan.io/tx/${hash}`} target="_blank" rel="noreferrer">{hash}</a>
            </p>
          )}
          {error && <p style={{ color: "var(--red)", fontSize: 13 }}>{error.message}</p>}
        </div>
      )}
    </div>
  );
}
