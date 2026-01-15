const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  
  const POOLS = "0xe63514C2B0842B58A16Ced0C63668BAA91B033Af";
  const tUSDC = "0x6D13968b1Fe787ed0237D3645D094161CC165E4c";
  const tUSDT = "0x0828b7774ea41Db0fCbf13ADe31b5F61624A1364";

  console.log("\n=== DEBUG SWAP ===\n");

  const pools = await hre.ethers.getContractAt("MultiTokenLiquidityPools", POOLS);
  const usdc = await hre.ethers.getContractAt("TestERC20Token", tUSDC);

  // Get pool info
  const poolId = await pools.getPoolId(tUSDC, tUSDT);
  const poolInfo = await pools.getPoolInfo(poolId);
  
  console.log("Pool ID:", poolId.toString());
  console.log("Token0:", poolInfo[0]);
  console.log("Token1:", poolInfo[1]);
  console.log("Reserve0:", hre.ethers.formatEther(poolInfo[2]));
  console.log("Reserve1:", hre.ethers.formatEther(poolInfo[3]));
  
  // Check which token is which
  console.log("\nConfig addresses:");
  console.log("tUSDC:", tUSDC);
  console.log("tUSDT:", tUSDT);
  
  // Check if tUSDC is token0 or token1
  const isUsdcToken0 = poolInfo[0].toLowerCase() === tUSDC.toLowerCase();
  console.log("\ntUSDC is token0?", isUsdcToken0);
  
  // Check allowance
  const swapAmount = hre.ethers.parseEther("0.1");
  const allowance = await usdc.allowance(signer.address, POOLS);
  const balance = await usdc.balanceOf(signer.address);
  
  console.log("\nAllowance to pools:", hre.ethers.formatEther(allowance));
  console.log("Balance:", hre.ethers.formatEther(balance));
  console.log("Swap amount:", hre.ethers.formatEther(swapAmount));
  
  // Try static call first to get error
  console.log("\nTrying static call...");
  try {
    const result = await pools.swap.staticCall(poolId, tUSDC, swapAmount, 0);
    console.log("Static call result:", hre.ethers.formatEther(result));
  } catch (e) {
    console.log("Static call error:", e.reason || e.message);
  }
}

main().catch(console.error);
