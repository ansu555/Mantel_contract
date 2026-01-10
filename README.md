# Mantel_contract

Mantle Sepolia liquidity pool contracts and test tokens.

## Contracts
- MultiTokenLiquidityPools (AMM-style pools)
- TestERC20Token (test tokens with mint)

## Quick start
1) Install deps
   - `npm install`
2) Configure env
   - Copy `.env.sample` to `.env`
   - Set `PRIVATE_KEY` (0x-prefixed, funded on Mantle Sepolia)
   - Optional: `MANTLESCAN_API_KEY` for verification
3) Compile
   - `npm run compile`
4) Deploy to Mantle Sepolia
   - `npm run deploy:mantle`
   - Save printed addresses (pools contract + tokens)

## Network
- RPC: https://rpc.sepolia.mantle.xyz
- Chain ID: 5003
- Explorer: https://explorer.sepolia.mantle.xyz
- Faucet: https://faucet.sepolia.mantle.xyz
