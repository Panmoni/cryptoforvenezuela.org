import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { mainnet } from "@reown/appkit/networks";

// Get a free project ID at https://cloud.reown.com and set
// PUBLIC_REOWN_PROJECT_ID in your environment before this does anything
// useful — without it the modal loads but wallet connections will fail.
const projectId = import.meta.env.PUBLIC_REOWN_PROJECT_ID ?? "";

export const wagmiAdapter = new WagmiAdapter({
  networks: [mainnet],
  projectId,
});

let initialized = false;

/** Idempotent — the donate page can mount/unmount the connect-wallet
 * island without re-registering the modal on every mount. */
export function ensureAppKitInitialized() {
  if (initialized) return;
  createAppKit({
    adapters: [wagmiAdapter],
    networks: [mainnet],
    projectId,
    metadata: {
      name: "Crypto for Venezuela",
      description: "Direct, wallet-to-wallet earthquake relief for Venezuela.",
      url: "https://cryptoforvenezuela.org",
      icons: ["https://cryptoforvenezuela.org/favicon.svg"],
    },
    features: { analytics: false, email: false, socials: false },
  });
  initialized = true;
}
