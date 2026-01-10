const hre = require("hardhat");

async function main() {
  const POOLS = "0xe63514C2B0842B58A16Ced0C63668BAA91B033Af";
  const USER = "0x57Eb9B6E84e3a80144958b8608b54ef002A6599f";
  const tUSDC = "0x6D13968b1Fe787ed0237D3645D094161CC165E4c";
  const tUSDT = "0xA6B762307Da59d44eF18122c760B6a3a331c8895";

  console.log("\n=== SWAP DIAGNOSTIC ===\n");

  const pools = await hre.ethers.getContractAt("MultiTokenLiquidityPools", POOLS);
  const usdc = await hre.ethers.getContractAt("TestERC20Token", tUSDC);

  // Pool info
  const poolId = await pools.getPoolId(tUSDC, tUSDT);
  console.log("Pool ID:", poolId.toString());

  const info = await pools.getPoolInfo(poolId);
  console.log("\nPool tokens:");
  console.log("  Token0:", info[0]);
  console.log("  Token1:", info[1]);
  console.log("  Reserve0:", hre.ethers.formatEther(info[2]));
  console.log("  Reserve1:", hre.ethers.formatEther(info[3]));

  // User state
  const balance = await usdc.balanceOf(USER);
  const allowance = await usdc.allowance(USER, POOLS);
  
  console.log("\nUser tUSDC:");
  console.log("  Balance:", hre.ethers.formatEther(balance));
  console.log("  Allowance to pool:", hre.ethers.formatEther(allowance));

  // Check if allowance is sufficient
  const swapAmount = hre.ethers.parseEther("1");
  if (allowance < swapAmount) {
    console.log("\n❌ PROBLEM: Allowance too low!");
    console.log("   Need:", "1.0");
    console.log("   Have:", hre.ethers.formatEther(allowance));
  } else {
    console.log("\n✅ Allowance OK");
  }

  // Check token order in pool
  console.log("\nToken address check:");
  console.log("  tUSDC config:", tUSDC);
  console.log("  tUSDT config:", tUSDT);
  console.log("  Pool token0:", info[0]);
  console.log("  Pool token1:", info[1]);
  
  const usdcInPool = info[0].toLowerCase() === tUSDC.toLowerCase() || 
                     info[1].toLowerCase() === tUSDC.toLowerCase();
  const usdtInPool = info[0].toLowerCase() === tUSDT.toLowerCase() || 
                     info[1].toLowerCase() === tUSDT.toLowerCase();
  
  console.log("  tUSDC in pool:", usdcInPool);
  console.log("  tUSDT in pool:", usdtInPool);

  if (!usdcInPool || !usdtInPool) {
    console.log("\n❌ PROBLEM: Token mismatch!");
  }
}

main().catch(console.error);
