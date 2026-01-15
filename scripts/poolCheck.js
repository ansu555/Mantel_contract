const hre = require("hardhat");

async function main() {
  const POOLS = "0xe63514C2B0842B58A16Ced0C63668BAA91B033Af";
  const tUSDC = "0x6D13968b1Fe787ed0237D3645D094161CC165E4c";
  const tUSDT = "0x0828b7774ea41Db0fCbf13ADe31b5F61624A1364";

  console.log("\n=== QUICK POOL STATE CHECK ===\n");

  try {
    const pools = await hre.ethers.getContractAt("MultiTokenLiquidityPools", POOLS);
    
    // Get all pools info
    console.log("Checking pool state...");
    const poolId = await pools.getPoolId(tUSDC, tUSDT);
    console.log("Pool ID:", poolId.toString());

    const poolInfo = await pools.getPoolInfo(poolId);
    const token0 = poolInfo[0];
    const token1 = poolInfo[1];
    const reserve0 = hre.ethers.formatEther(poolInfo[2]);
    const reserve1 = hre.ethers.formatEther(poolInfo[3]);
    const lpTokens = poolInfo[4];

    console.log("\n📊 POOL STATE:");
    console.log("Token0 (tUSDT):", token0);
    console.log("Token1 (tUSDC):", token1);
    console.log("Reserve0 (tUSDT):", reserve0);
    console.log("Reserve1 (tUSDC):", reserve1);
    console.log("LP Tokens:", hre.ethers.formatEther(lpTokens));

    // Check if pool has liquidity
    if (parseFloat(reserve0) > 0 && parseFloat(reserve1) > 0) {
      console.log("\n✅ Pool has liquidity - SWAPS POSSIBLE");
    } else {
      console.log("\n❌ Pool has NO liquidity - SWAPS NOT POSSIBLE");
    }

  } catch (error) {
    console.error("Error:", error.message);
  }
}

main().catch(console.error);
