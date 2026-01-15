const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  
  const POOLS = "0xe63514C2B0842B58A16Ced0C63668BAA91B033Af";
  const tUSDC = "0x6D13968b1Fe787ed0237D3645D094161CC165E4c";
  const tUSDT = "0x0828b7774ea41Db0fCbf13ADe31b5F61624A1364";

  console.log("\n=== DEEP DEBUG ===\n");

  const pools = await hre.ethers.getContractAt("MultiTokenLiquidityPools", POOLS);
  const usdc = await hre.ethers.getContractAt("TestERC20Token", tUSDC);
  const usdt = await hre.ethers.getContractAt("TestERC20Token", tUSDT);

  const poolId = await pools.getPoolId(tUSDC, tUSDT);

  // Test token transfer first
  console.log("Testing direct token transfer...");
  const testAmount = hre.ethers.parseEther("0.01");
  
  try {
    // Test if we can transfer tokens at all
    const tx = await usdc.transfer(POOLS, testAmount, { gasLimit: 100000000 });
    console.log("Transfer TX:", tx.hash);
    const receipt = await tx.wait();
    console.log("Transfer status:", receipt.status === 1 ? "SUCCESS" : "FAILED");
    
    // Check pool balance increased
    const poolUsdcBal = await usdc.balanceOf(POOLS);
    console.log("Pool tUSDC balance:", hre.ethers.formatEther(poolUsdcBal));
    
  } catch (e) {
    console.log("Transfer error:", e.message);
  }
}

main().catch(console.error);
