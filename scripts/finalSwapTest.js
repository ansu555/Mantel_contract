const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  
  const POOLS = "0xe63514C2B0842B58A16Ced0C63668BAA91B033Af";
  const tUSDC = "0x6D13968b1Fe787ed0237D3645D094161CC165E4c";
  const tUSDT = "0x0828b7774ea41Db0fCbf13ADe31b5F61624A1364";

  console.log("\n╔════════════════════════════════════════════╗");
  console.log("║    FINAL SWAP TEST (Direct Pool)          ║");
  console.log("╚════════════════════════════════════════════╝\n");

  try {
    const pools = await hre.ethers.getContractAt("MultiTokenLiquidityPools", POOLS);
    const usdc = await hre.ethers.getContractAt("TestERC20Token", tUSDC);
    const usdt = await hre.ethers.getContractAt("TestERC20Token", tUSDT);

    // Before
    console.log("BEFORE:");
    let usdcBal = await usdc.balanceOf(signer.address);
    let usdtBal = await usdt.balanceOf(signer.address);
    console.log("  tUSDC:", hre.ethers.formatEther(usdcBal));
    console.log("  tUSDT:", hre.ethers.formatEther(usdtBal));

    const swapAmount = hre.ethers.parseEther("0.1"); // Smaller amount
    const poolId = await pools.getPoolId(tUSDC, tUSDT);

    // Approve
    console.log("\nApproving...");
    let tx = await usdc.approve(POOLS, swapAmount);
    await tx.wait();
    console.log("✅ Approved");

    // Swap
    console.log("\nSwapping 0.1 tUSDC...");
    tx = await pools.swap(poolId, tUSDC, swapAmount, 0, { gasLimit: 100000000 }); // 100M gas for Mantle
    console.log("TX:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("Status:", receipt.status === 1 ? "✅ SUCCESS" : "❌ FAILED");
    console.log("Gas:", receipt.gasUsed.toString());

    // After
    console.log("\nAFTER:");
    usdcBal = await usdc.balanceOf(signer.address);
    usdtBal = await usdt.balanceOf(signer.address);
    console.log("  tUSDC:", hre.ethers.formatEther(usdcBal));
    console.log("  tUSDT:", hre.ethers.formatEther(usdtBal));

    if (receipt.status === 1) {
      console.log("\n╔════════════════════════════════════════════╗");
      console.log("║        ✅ SWAP IS WORKING! ✅             ║");
      console.log("╚════════════════════════════════════════════╝\n");
    }

  } catch (error) {
    console.error("\n❌ Error:", error.message);
  }
}

main().catch(console.error);
