const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("Testing swap with account:", signer.address);

  const POOLS = "0xe63514C2B0842B58A16Ced0C63668BAA91B033Af";
  const tUSDC = "0x6D13968b1Fe787ed0237D3645D094161CC165E4c";
  const tUSDT = "0x0828b7774ea41Db0fCbf13ADe31b5F61624A1364";

  // Get contracts
  const pools = await hre.ethers.getContractAt("MultiTokenLiquidityPools", POOLS);
  const usdc = await hre.ethers.getContractAt("TestERC20Token", tUSDC);
  const usdt = await hre.ethers.getContractAt("TestERC20Token", tUSDT);

  // Check pool
  const poolId = await pools.getPoolId(tUSDC, tUSDT);
  console.log("\nPool ID:", poolId.toString());

  const poolInfo = await pools.getPoolInfo(poolId);
  console.log("Pool Token0:", poolInfo[0]);
  console.log("Pool Token1:", poolInfo[1]);
  console.log("Reserve0:", hre.ethers.formatEther(poolInfo[2]));
  console.log("Reserve1:", hre.ethers.formatEther(poolInfo[3]));

  // Check balances
  const usdcBal = await usdc.balanceOf(signer.address);
  const usdtBal = await usdt.balanceOf(signer.address);
  console.log("\nYour tUSDC:", hre.ethers.formatEther(usdcBal));
  console.log("Your tUSDT:", hre.ethers.formatEther(usdtBal));

  // Check allowance
  const allowance = await usdc.allowance(signer.address, POOLS);
  console.log("tUSDC allowance to pool:", hre.ethers.formatEther(allowance));

  // Approve if needed
  const swapAmount = hre.ethers.parseEther("1");
  if (allowance < swapAmount) {
    console.log("\n🔐 Approving tUSDC...");
    const approveTx = await usdc.approve(POOLS, swapAmount);
    await approveTx.wait();
    console.log("✅ Approved!");
  }

  // Execute swap
  console.log("\n💱 Executing swap: 1 tUSDC -> tUSDT...");
  try {
    // Mantle Sepolia requires MUCH higher gas - sequencer reported minimum: 68990976
    const tx = await pools.swap(poolId, tUSDC, swapAmount, 0, {
      gasLimit: 100000000, // 100M gas for Mantle
    });
    console.log("Transaction hash:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("✅ Swap successful!");
    console.log("Gas used:", receipt.gasUsed.toString());

    // Check new balances
    const newUsdcBal = await usdc.balanceOf(signer.address);
    const newUsdtBal = await usdt.balanceOf(signer.address);
    console.log("\nNew tUSDC:", hre.ethers.formatEther(newUsdcBal));
    console.log("New tUSDT:", hre.ethers.formatEther(newUsdtBal));
    console.log("tUSDC spent:", hre.ethers.formatEther(usdcBal - newUsdcBal));
    console.log("tUSDT received:", hre.ethers.formatEther(newUsdtBal - usdtBal));
  } catch (error) {
    console.error("❌ Swap failed:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
  }
}

main().catch(console.error);
