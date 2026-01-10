# Frontend - Mantle DEX Test UI

Simple Vite + React + wagmi/viem wallet-connected test interface for reading pool data on Mantle Sepolia.

## Quick start

1. Install deps (from frontend directory):
   ```bash
   cd frontend
   npm install
   ```

2. Run dev server:
   ```bash
   npm run dev
   ```
   Opens http://localhost:5173

3. Build for production:
   ```bash
   npm run build
   ```

## Features
- **Wallet Connect:** MetaMask injected connector on Mantle Sepolia
- **Pool Count:** View total number of pools deployed
- **Pool Info:** Fetch reserves and LP token data for any pool ID
- **Your Position:** View your liquidity provider position in a pool

## Config

Update deployed contract addresses in [src/config.js](src/config.js):

```javascript
export const POOLS_ADDRESS = "0x..."; // Your MultiTokenLiquidityPools address
export const TOKEN_ADDRESSES = {
  tUSDC: "0x...",
  tUSDT: "0x...",
  // ... other tokens
};
```

## Prerequisites
- MetaMask wallet with Mantle Sepolia testnet added
- Get testnet MNT: https://faucet.sepolia.mantle.xyz
- Deployed pool contract on Mantle Sepolia

## Testing
1. Connect wallet to Mantle Sepolia
2. Click "Get Total Pools" to see deployed pools
3. Enter a pool ID and click "Get Pool Info" to view reserves
4. Data fetched via viem publicClient with no backend required

## Notes
- UI uses viem for read-only contract calls (no write functions yet)
- All amounts displayed in wei (18 decimals)
- Requires internet connection to Mantle Sepolia RPC

