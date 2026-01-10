# Multi-Hop Swap Router - Testing Guide

## Overview
The Multi-Hop Swap Router enables token swaps through multiple liquidity pools when direct pairs don't exist. It automatically finds the best route and minimizes fees.

## Features

### 🔄 Swap Types
- **Direct Swap**: Swap when a pool exists for the token pair (lowest fees ~0.3%)
- **2-Hop Swap**: Route through 1 intermediate token (total fees ~0.6%)
- **3-Hop Swap**: Route through 2 intermediate tokens (total fees ~0.9%)

### 🎯 Auto Route Finding
- Automatically detects if direct pool exists
- Searches through common intermediate tokens (USDC, USDT, DAI, WETH)
- Selects the route with best output
- Manual override available for advanced users

## Deployment Steps

### 1. Deploy the Router Contract
```bash
npx hardhat run scripts/deployRouter.js --network mantleSepolia
```

### 2. Update Frontend Config
Copy the router address from deployment output and update `frontend/src/config.js`:
```javascript
export const ROUTER_ADDRESS = "0xYourRouterAddressHere";
```

### 3. Start Frontend
```bash
cd frontend
npm run dev
```

## Testing Scenarios

### Scenario 1: Direct Swap (Pool Exists)
**Example**: tUSDC → tUSDT
- Both tokens have a direct pool
- Router uses single-hop swap
- Lowest fees (~0.3%)
- **Steps**:
  1. Select tUSDC as input
  2. Select tUSDT as output
  3. Enter amount
  4. See "Best Route: DIRECT" displayed
  5. Approve and swap

### Scenario 2: 2-Hop Swap (No Direct Pool)
**Example**: tCRV → tWETH (no direct pool exists)
- Route: tCRV → tUSDC → tWETH
- Uses two pools with intermediate token
- Medium fees (~0.6%)
- **Steps**:
  1. Select tCRV as input
  2. Select tWETH as output
  3. Enter amount
  4. See "Best Route: 2HOP" with path displayed
  5. Approve tCRV for router
  6. Execute swap

### Scenario 3: 3-Hop Swap (Complex Route)
**Example**: tCRV → tMKR (requires 2 intermediate tokens)
- Route: tCRV → tUSDC → tWETH → tMKR
- Uses three pools
- Highest fees (~0.9%)
- **Steps**:
  1. Select tCRV as input
  2. Select tMKR as output
  3. Enter amount
  4. See "Best Route: 3HOP" with full path
  5. Approve tCRV for router
  6. Execute swap

### Scenario 4: Manual Route Selection
Test when you want to force a specific route:
- Set "Route Type" to "2-Hop" or "3-Hop"
- Select intermediate tokens manually
- Compare outputs with auto mode

## Key Features to Test

### ✅ Route Detection
- [ ] Auto-detects direct pools
- [ ] Finds 2-hop routes when direct doesn't exist
- [ ] Finds 3-hop routes for complex pairs
- [ ] Displays route path clearly

### ✅ Output Estimation
- [ ] Shows estimated output for each route
- [ ] Calculates fees correctly (0.3% per hop)
- [ ] Updates estimates when amount changes
- [ ] Compares multiple routes and picks best

### ✅ Slippage Protection
- [ ] Allows setting minimum output
- [ ] Transaction reverts if output too low
- [ ] Recommended: 95-99% of estimate

### ✅ Transaction Flow
- [ ] Approve token for router (not pool)
- [ ] Single transaction for multi-hop swap
- [ ] All-or-nothing execution (atomic)
- [ ] Proper event emissions

### ✅ UI/UX
- [ ] Clear route visualization
- [ ] Shows path with arrows (A → B → C)
- [ ] Displays estimated vs actual output
- [ ] Network validation
- [ ] Balance checking

## Common Test Pairs

### Direct Swaps (Should use single-hop)
```
tUSDC ↔ tUSDT
tUSDC ↔ tDAI
tWETH ↔ tUSDC
tWBTC ↔ tWETH
```

### 2-Hop Swaps (No direct pool)
```
tDAI → tUSDC → tWETH
tLINK → tUSDC → tAAVE
tCRV → tUSDC → tWETH
tUNI → tWETH → tUSDC
```

### 3-Hop Swaps (Complex routes)
```
tCRV → tUSDC → tWETH → tMKR
tLINK → tUSDC → tDAI → tWETH
tUNI → tWETH → tUSDC → tAAVE
```

## Expected Behavior

### Gas Costs
- Direct: ~150,000 gas
- 2-Hop: ~300,000 gas
- 3-Hop: ~450,000 gas

### Fees
- Each hop adds 0.3% fee
- 2-hop total: ~0.6% (slightly worse than 0.6% due to compounding)
- 3-hop total: ~0.9% (compounding effect)

### Advantages vs Manual Swaps
- ✅ Single transaction (vs multiple manual swaps)
- ✅ Atomic execution (all-or-nothing)
- ✅ No need to manage intermediate tokens
- ✅ Auto-routing finds best path
- ❌ Slightly higher gas costs
- ❌ Cumulative slippage through multiple pools

## Troubleshooting

### "Router not deployed"
- Deploy router using `deployRouter.js`
- Update `ROUTER_ADDRESS` in config.js

### "Pool not found"
- Ensure liquidity exists for the route
- Check that intermediate tokens have pools
- Try different intermediate tokens

### "Insufficient output"
- Slippage too tight
- Pool reserves changed
- Increase minimum output or retry

### "Insufficient allowance"
- Click "Approve" button first
- Approve router address (not pool address)
- Check approval was successful

## Advanced Testing

### Compare Routes
1. Try same swap with different intermediate tokens
2. Compare estimated outputs
3. Verify auto-mode picks best route

### Slippage Testing
1. Set very tight slippage (99.9%)
2. Try swap
3. May fail if price moves
4. Set looser slippage (95-98%)

### Gas Optimization
1. Compare gas costs: direct vs 2-hop vs 3-hop
2. Test with different amounts
3. Verify gas estimates

## Smart Contract Functions

### Swap Functions
- `swapSingleHop()` - Direct swap
- `swapTwoHop()` - Through 1 intermediate
- `swapThreeHop()` - Through 2 intermediates

### View Functions
- `getAmountOutTwoHop()` - Estimate 2-hop output
- `getAmountOutThreeHop()` - Estimate 3-hop output

### Key Parameters
- `tokenIn` - Input token address
- `tokenOut` - Output token address
- `tokenIntermediate` - Intermediate token(s)
- `amountIn` - Input amount (18 decimals)
- `minAmountOut` - Minimum acceptable output
- `receiver` - Address to receive output tokens

## Success Criteria

Your multi-hop router is working correctly if:
- ✅ Auto-detects best route
- ✅ Executes swaps through multiple hops
- ✅ Respects slippage protection
- ✅ Emits correct events
- ✅ Transfers correct amounts
- ✅ UI shows route clearly
- ✅ Gas costs reasonable

## Next Steps

After successful testing:
1. Deploy to Mantle mainnet
2. Add more intermediate tokens
3. Implement path caching
4. Add MEV protection
5. Optimize gas costs
6. Add limit orders
7. Build aggregator comparing multiple DEXs

## Resources

- Contract: `contracts/MultiHopSwapRouter.sol`
- Frontend Component: `frontend/src/components/MultiHopSwap.jsx`
- Config: `frontend/src/config.js`
- Deployment: `scripts/deployRouter.js`

## Support

If you encounter issues:
1. Check console logs in browser
2. Verify contract addresses in config
3. Ensure pools have liquidity
4. Test with smaller amounts first
5. Check network connection

Happy testing! 🚀
