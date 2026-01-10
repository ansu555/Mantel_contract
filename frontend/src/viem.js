import { createPublicClient, http } from "viem";
import { MANTLE_SEPOLIA } from "./config";

export const publicClient = createPublicClient({
  chain: MANTLE_SEPOLIA,
  transport: http("https://rpc.sepolia.mantle.xyz", {
    timeout: 30_000, // 30 second timeout
    retryCount: 3,
  }),
});
