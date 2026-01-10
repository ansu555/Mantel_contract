import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { MANTLE_SEPOLIA } from "./config";

export const config = createConfig({
  connectors: [injected()],
  chains: [MANTLE_SEPOLIA],
  transports: {
    [MANTLE_SEPOLIA.id]: http("https://rpc.sepolia.mantle.xyz"),
  },
});

