import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { MANTLE_SEPOLIA } from "./config";

export const config = createConfig({
  chains: [MANTLE_SEPOLIA],
  connectors: [
    injected({
      target: "metaMask",
      shimDisconnect: true,
    }),
  ],
  transports: {
    [MANTLE_SEPOLIA.id]: http("https://rpc.sepolia.mantle.xyz", {
      timeout: 30_000,
      retryCount: 3,
    }),
  },
});
