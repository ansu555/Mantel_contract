import { defineConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { http } from "viem";
import { MANTLE_SEPOLIA } from "./config";

export const config = defineConfig({
  connectors: [injected()],
  chains: [MANTLE_SEPOLIA],
  transports: {
    [MANTLE_SEPOLIA.id]: http("https://rpc.sepolia.mantle.xyz"),
  },
});
