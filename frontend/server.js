import express from "express";
import cors from "cors";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const RPC_URL = "https://rpc.sepolia.mantle.xyz";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = PRIVATE_KEY ? new ethers.Wallet(PRIVATE_KEY, provider) : null;

// Mock endpoints - replace with actual contract calls if backend is needed
app.post("/api/create-pool", async (req, res) => {
  try {
    const { poolsAddress, token0, token1, userAddress } = req.body;
    // This is where you'd call the contract
    res.json({ poolId: "0", tx: "0x..." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/add-liquidity", async (req, res) => {
  try {
    res.json({ lpTokens: "1000000000000000000" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/remove-liquidity", async (req, res) => {
  try {
    res.json({ amount0: "500000000000000000", amount1: "500000000000000000" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/swap", async (req, res) => {
  try {
    res.json({ amountOut: "950000000000000000" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/pool-info", async (req, res) => {
  try {
    const { poolsAddress, poolId } = req.body;
    res.json({
      token0: "0x...",
      token1: "0x...",
      reserve0: "1000000000000000000000",
      reserve1: "1000000000000000000000",
      totalLPTokens: "1000000000000000000000",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/user-position", async (req, res) => {
  try {
    res.json({
      lpTokens: "10000000000000000000",
      token0Deposited: "100000000000000000000",
      token1Deposited: "100000000000000000000",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
