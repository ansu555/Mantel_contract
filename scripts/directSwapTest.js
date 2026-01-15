const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("Testing with:", signer.address);

  const POOLS = "0xe63514C2B0842B58A16Ced0C63668BAA91B033Af";
  const tUSDC = "0x6D13968b1Fe787ed0237D3645D094161CC165E4c";
  const tUSDT = "0x0828b7774ea41Db0fCbf13ADe31b5F61624A1364";

  console.log("\n=== DIRECT POOL SWAP TEST ===\n");

  try {
    const pools = await hre.ethers.getContractAt("MultiTokenLiquidityPools", POOLS);
    const usdc = await hre.ethers.getContractAt("TestERC20Token", tUSDC);
    const usdt = await hre.ethers.getContractAt("TestERC20Token", tUSDT);

    // Initial state
    console.log("BEFORE:");
    let usdcBal = await usdc.balanceOf(signer.address);
    let usdtBal = await usdt.balanceOf(signer.address);
    console.log("tUSDC:", hre.ethers.formatEther(usdcBal));
    console.log("tUSDT:", hre.ethers.formatEther(usdtBal));

    const swapAmount = hre.ethers.parseEther("0.5");

    // Approve pool
    console.log("\nApproving pool...");
    let approveTx = await usdc.approve(POOLS, swapAmount);
    await approveTx.wait();
    console.log("✅ Approved");

    // Direct swap call
    console.log("\nCalling pools.swap()...");
    const poolId = await pools.getPoolId(tUSDC, tUSDT);
    
    const swapTx = await pools.swap(
      poolId,
      tUSDC,
      swapAmount,
      0,
      { gasLimit: 80000000 }  // Mantle needs ~75M gas minimum
    );

    console.log("TX:", swapTx.hash);
    const receipt = await swapTx.wait();
    
    if (receipt.status === 1) {
      console.log("✅ Swap completed!");
    } else {
      console.log("❌ Swap failed!");
      return;
    }

    // Check after
    console.log("\nAFTER:");
    usdcBal = await usdc.balanceOf(signer.address);
    usdtBal = await usdt.balanceOf(signer.address);
    console.log("tUSDC:", hre.ethers.formatEther(usdcBal));
    console.log("tUSDT:", hre.ethers.formatEther(usdtBal));

    console.log("\n✅ SUCCESS: SWAP IS WORKING!");

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(console.error);
