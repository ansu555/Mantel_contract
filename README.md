# Mantel_contract

Mantle Sepolia liquidity pool contracts and test UI for the Mantle DEX.

## Project Structure

```
├── contracts/
│   └── MultiTokenLiquidityPools.sol    # Pool contract + TestERC20Token
├── scripts/
│   └── deploy.js                       # Deploy script
├── frontend/
│   ├── src/
│   │   ├── components/                 # React components
│   │   ├── config.js                   # Contract addresses & ABIs
│   │   ├── viem.js                     # Viem public client setup
│   │   ├── wagmi.js                    # Wagmi config
│   │   └── App.jsx                     # Main app
│   ├── package.json                    # Frontend deps
│   ├── vite.config.js                  # Vite config
│   └── README.md                       # Frontend docs
├── package.json                        # Hardhat + root deps
├── hardhat.config.js                   # Network config
└── .env.sample                         # Environment template
```

## Quick Start

### 1. Deploy Contracts

```bash
# Install dependencies
npm install

# Copy .env.sample to .env and add your PRIVATE_KEY
cp .env.sample .env

# Compile contracts
npm run compile

# Deploy to Mantle Sepolia
npm run deploy:mantle
```

The script will:
- Deploy 10 test tokens (tUSDC, tUSDT, tDAI, tWETH, tWBTC, tLINK, tUNI, tAAVE, tCRV, tMKR)
- Deploy MultiTokenLiquidityPools contract
- Create 10 initial pools
- Print all contract addresses

**Save the printed addresses** — you'll need them for the frontend.

### 2. Configure Frontend

```bash
cd frontend
npm install
```

Update [frontend/src/config.js](frontend/src/config.js) with deployed addresses:

```javascript
export const POOLS_ADDRESS = "0x...";  // From deploy output
export const TOKEN_ADDRESSES = {
  tUSDC: "0x...",
  tUSDT: "0x...",
  // ... rest from deploy output
};
```

### 3. Run Test UI

```bash
cd frontend
npm run dev
```

Opens http://localhost:5173

## Network

- **Chain ID:** 5003
- **RPC URL:** https://rpc.sepolia.mantle.xyz
- **Explorer:** https://explorer.sepolia.mantle.xyz
- **Faucet:** https://faucet.sepolia.mantle.xyz (get test MNT)

## Contracts

### MultiTokenLiquidityPools
- `createPool(token0, token1)` → Creates a new pool
- `addLiquidity(poolId, amount0, amount1, mins)` → Deposit liquidity
- `removeLiquidity(poolId, lpTokens, mins)` → Withdraw liquidity
- `swap(poolId, tokenIn, amountIn, amountOutMin)` → Swap tokens
- `getPoolInfo(poolId)` → View reserves & LP tokens
- `getUserPosition(poolId, user)` → View your position

### TestERC20Token
- Standard ERC20 with `mint(to, amount)` for testing

## Frontend

Vite + React + wagmi/viem for wallet connection and read-only contract calls.

**Features:**
- Connect MetaMask wallet to Mantle Sepolia
- View total pools
- Fetch pool info (reserves, LP tokens)
- View your liquidity provider position

See [frontend/README.md](frontend/README.md) for details.

## Testing Workflow

1. Connect wallet to Mantle Sepolia via MetaMask
2. Get test MNT tokens from faucet
3. Deploy contracts and save addresses
4. Update frontend config
5. Run frontend and view pool data
6. Use contract ABIs to add write functions for pool creation, liquidity, and swaps

## Gas Considerations

- 0.3% trading fee on swaps
- Optimal liquidity pricing (uses Uniswap V2 math)
- LP tokens minted as geometric mean of deposited amounts



## Deploying test tokens...
- tUSDC deployed to: 0x6D13968b1Fe787ed0237D3645D094161CC165E4c
- tUSDT deployed to: 0x0828b7774ea41Db0fCbf13ADe31b5F61624A1364
- tDAI deployed to: 0x907fF6a35a3E030c11a02e937527402F0d3333ee
- tWETH deployed to: 0x95829976c0cd4a58fBaA4802410d10BDe15E3CA0
- tWBTC deployed to: 0xD781bf79d86112215F7bF141277f5782640cad5D
- tLINK deployed to: 0xCEbBd58F40c8CE0739327fDde1A52bb67557e37a
- tUNI deployed to: 0xe771E51F90D7176B6bd17a123f7D78c2231158a0
- tAAVE deployed to: 0x6b1F4e0Eea462745750dddaEB11FB85B968a87F6
- tCRV deployed to: 0xa6bAeA5811Bd070AeF343537b03A909597002526
- tMKR deployed to: 0x4296e3e1d3efbb5bac66a66f1E463BAc25Ec6189

### Liquidity Pools deployed to: 0xe63514C2B0842B58A16Ced0C63668BAA91B033Af

## Creating pools...
- Pool 0: tUSDC/tUSDT created
- Pool 1: tWETH/tUSDC created
- Pool 2: tWBTC/tWETH created
- Pool 3: tLINK/tUSDC created
- Pool 4: tUNI/tWETH created
- Pool 5: tAAVE/tUSDC created
- Pool 6: tCRV/tUSDC created
- Pool 7: tMKR/tWETH created
- Pool 8: tDAI/tUSDC created
- Pool 9: tLINK/tWETH created

## === Deployment Complete ===
- Pools Contract: 0xe63514C2B0842B58A16Ced0C63668BAA91B033Af
- tUSDC: 0x6D13968b1Fe787ed0237D3645D094161CC165E4c
- tUSDT: 0x0828b7774ea41Db0fCbf13ADe31b5F61624A1364
- tDAI: 0x907fF6a35a3E030c11a02e937527402F0d3333ee
- tWETH: 0x95829976c0cd4a58fBaA4802410d10BDe15E3CA0
- tWBTC: 0xD781bf79d86112215F7bF141277f5782640cad5D
- tLINK: 0xCEbBd58F40c8CE0739327fDde1A52bb67557e37a
- tUNI: 0xe771E51F90D7176B6bd17a123f7D78c2231158a0
- tAAVE: 0x6b1F4e0Eea462745750dddaEB11FB85B968a87F6
- tCRV: 0xa6bAeA5811Bd070AeF343537b03A909597002526
- tMKR: 0x4296e3e1d3efbb5bac66a66f1E463BAc25Ec6189
 