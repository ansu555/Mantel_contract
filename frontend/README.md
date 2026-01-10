# Frontend - Mantle DEX Test UI

Simple Vite + React + wagmi/viem wallet-connected test UI for the liquidity pools.

## Quick start

1. Install deps from root (if not done):
   ```bash
   npm install
   ```

2. Install frontend deps:
   ```bash
   cd frontend
   npm install
   ```

3. Run dev server:
   ```bash
   npm run dev
   ```
   Opens http://localhost:3000

## Features
- **Wallet Connect:** MetaMask (injected connector) on Mantle Sepolia
- **Create Pool:** Select two tokens, create a new pool
- **Add Liquidity:** Deposit both tokens, receive LP tokens
- **Remove Liquidity:** Burn LP tokens, withdraw both tokens
- **Swap:** Exchange one token for another
- **Pool Info:** View reserves, total LP tokens, and your position

## Config
Update deployed contract addresses in [src/config.js](src/config.js):
- `POOLS_ADDRESS`: MultiTokenLiquidityPools contract
- `TOKEN_ADDRESSES`: Each test token (tUSDC, tUSDT, etc.)

## Notes
- Requires MetaMask with Mantle Sepolia testnet added
- Get MNT testnet tokens: https://faucet.sepolia.mantle.xyz
- UI calls contract via wagmi/viem injected connector
- All amounts in wei (18 decimals)
