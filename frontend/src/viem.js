import { createPublicClient, http } from "viem";
import { MANTLE_SEPOLIA } from "./config";

export const publicClient = createPublicClient({
  chain: MANTLE_SEPOLIA,
  transport: http("https://rpc.sepolia.mantle.xyz"),
});
