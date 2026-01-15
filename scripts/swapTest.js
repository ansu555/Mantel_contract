const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("Account:", signer.address);

  const POOLS = "0xe63514C2B0842B58A16Ced0C63668BAA91B033Af";
  const ROUTER = "0xFe2108798dC74481d5cCE1588cBD00801758dD6d";
  const tUSDC = "0x6D13968b1Fe787ed0237D3645D094161CC165E4c";
  const tUSDT = "0x0828b7774ea41Db0fCbf13ADe31b5F61624A1364";

  console.log("\n=== SWAP FUNCTIONALITY TEST ===\n");

  try {
    const pools = await hre.ethers.getContractAt("MultiTokenLiquidityPools", POOLS);
    const router = await hre.ethers.getContractAt("MultiHopSwapRouter", ROUTER);
    const usdc = await hre.ethers.getContractAt("TestERC20Token", tUSDC);
    const usdt = await hre.ethers.getContractAt("TestERC20Token", tUSDT);

    // Get pool info
    console.log("📊 POOL INFO:");
    const poolId = await pools.getPoolId(tUSDC, tUSDT);
    console.log("Pool ID for tUSDC/tUSDT:", poolId.toString());

    const poolInfo = await pools.getPoolInfo(poolId);
    console.log("Token0:", poolInfo[0]);
    console.log("Token1:", poolInfo[1]);
    console.log("Reserve0:", hre.ethers.formatEther(poolInfo[2]));
    console.log("Reserve1:", hre.ethers.formatEther(poolInfo[3]));

    // Check initial balances
    console.log("\n💰 BEFORE SWAP:");
    const usdcBal = await usdc.balanceOf(signer.address);
    const usdtBal = await usdt.balanceOf(signer.address);
    console.log("tUSDC balance:", hre.ethers.formatEther(usdcBal));
    console.log("tUSDT balance:", hre.ethers.formatEther(usdtBal));

    // Approve and execute single-hop swap
    const swapAmount = hre.ethers.parseEther("1");
    console.log("\n🔄 ATTEMPTING SINGLE HOP SWAP:");
    console.log("Swapping 1 tUSDC for tUSDT via router...");

    // Approve router
    console.log("Approving router for", hre.ethers.formatEther(swapAmount), "tUSDC...");
    const approveTx = await usdc.approve(ROUTER, swapAmount);
    await approveTx.wait();
    console.log("✅ Approved");

    // Call single hop swap
    console.log("Calling router.swapSingleHop()...");
    const swapTx = await router.swapSingleHop(
      tUSDC,           // tokenIn
      tUSDT,           // tokenOut
      swapAmount,      // amountIn
      0,               // minAmountOut (0 for test)
      signer.address,  // receiver
      { gasLimit: 500000 }
    );

    console.log("TX hash:", swapTx.hash);
    const receipt = await swapTx.wait();
    
    if (receipt.status === 1) {
      console.log("✅ SWAP SUCCESSFUL!");
      console.log("Gas used:", receipt.gasUsed.toString());
    } else {
      console.log("❌ SWAP FAILED - Transaction reverted");
      return;
    }

    // Check final balances
    console.log("\n💰 AFTER SWAP:");
    const newUsdcBal = await usdc.balanceOf(signer.address);
    const newUsdtBal = await usdt.balanceOf(signer.address);
    console.log("tUSDC balance:", hre.ethers.formatEther(newUsdcBal));
    console.log("tUSDT balance:", hre.ethers.formatEther(newUsdtBal));

    // Calculate changes
    const usdcSpent = usdcBal - newUsdcBal;
    const usdtReceived = newUsdtBal - usdtBal;
    
    console.log("\n📈 SWAP RESULTS:");
    console.log("tUSDC spent:", hre.ethers.formatEther(usdcSpent));
    console.log("tUSDT received:", hre.ethers.formatEther(usdtReceived));

    if (usdtReceived > 0n) {
      console.log("\n✅ SUCCESS: SWAP IS WORKING!");
      const rate = parseFloat(hre.ethers.formatEther(usdtReceived)) / parseFloat(hre.ethers.formatEther(usdcSpent));
      console.log("Exchange rate: 1 tUSDC =", rate.toFixed(6), "tUSDT");
    } else {
      console.log("\n❌ FAILED: No tokens received!");
    }

  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    if (error.reason) console.error("Reason:", error.reason);
    if (error.code) console.error("Code:", error.code);
  }
}

main().catch(console.error);
