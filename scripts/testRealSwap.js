const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  
  const POOLS = "0xe63514C2B0842B58A16Ced0C63668BAA91B033Af";
  const ROUTER = "0xFe2108798dC74481d5cCE1588cBD00801758dD6d";
  const tUSDC = "0x6D13968b1Fe787ed0237D3645D094161CC165E4c";
  const tUSDT = "0x0828b7774ea41Db0fCbf13ADe31b5F61624A1364";

  console.log("\n╔═══════════════════════════════════════════════════╗");
  console.log("║         TESTING REAL SWAP TRANSACTION            ║");
  console.log("╚═══════════════════════════════════════════════════╝\n");
  console.log("Account:", signer.address);

  try {
    const router = await hre.ethers.getContractAt("MultiHopSwapRouter", ROUTER);
    const usdc = await hre.ethers.getContractAt("TestERC20Token", tUSDC);
    const usdt = await hre.ethers.getContractAt("TestERC20Token", tUSDT);

    // Check balances BEFORE
    console.log("\n💰 BALANCES BEFORE SWAP:");
    const usdcBefore = await usdc.balanceOf(signer.address);
    const usdtBefore = await usdt.balanceOf(signer.address);
    console.log("   tUSDC:", hre.ethers.formatEther(usdcBefore));
    console.log("   tUSDT:", hre.ethers.formatEther(usdtBefore));

    // Prepare swap
    const swapAmount = hre.ethers.parseEther("1");
    console.log("\n🔄 EXECUTING SWAP:");
    console.log("   Swapping: 1 tUSDC → tUSDT");
    console.log("   Via: Router (Single Hop)");

    // Approve
    console.log("\n   Approving router...");
    const approveTx = await usdc.approve(ROUTER, swapAmount);
    await approveTx.wait();
    console.log("   ✅ Approved");

    // Execute swap
    console.log("\n   Executing swap...");
    const swapTx = await router.swapSingleHop(
      tUSDC,           // tokenIn
      tUSDT,           // tokenOut
      swapAmount,      // amountIn (1 USDC)
      0,               // minAmountOut
      signer.address,  // receiver
      { gasLimit: 500000 }
    );

    console.log("   TX Hash:", swapTx.hash);
    console.log("   Waiting for confirmation...");
    
    const receipt = await swapTx.wait();
    
    if (receipt.status === 1) {
      console.log("   ✅ TRANSACTION CONFIRMED!");
      console.log("   Gas Used:", receipt.gasUsed.toString());
    } else {
      console.log("   ❌ TRANSACTION FAILED!");
      return;
    }

    // Check balances AFTER
    console.log("\n💰 BALANCES AFTER SWAP:");
    const usdcAfter = await usdc.balanceOf(signer.address);
    const usdtAfter = await usdt.balanceOf(signer.address);
    console.log("   tUSDC:", hre.ethers.formatEther(usdcAfter));
    console.log("   tUSDT:", hre.ethers.formatEther(usdtAfter));

    // Calculate difference
    const usdcSpent = usdcBefore - usdcAfter;
    const usdtReceived = usdtAfter - usdtBefore;

    console.log("\n📊 SWAP RESULTS:");
    console.log("   tUSDC Spent:     ", hre.ethers.formatEther(usdcSpent));
    console.log("   tUSDT Received:  ", hre.ethers.formatEther(usdtReceived));

    if (usdtReceived > 0n) {
      const rate = parseFloat(hre.ethers.formatEther(usdtReceived)) / parseFloat(hre.ethers.formatEther(usdcSpent));
      console.log("   Exchange Rate:   ", "1 tUSDC = " + rate.toFixed(6) + " tUSDT");
      
      console.log("\n╔═══════════════════════════════════════════════════╗");
      console.log("║            ✅ SWAP IS WORKING! ✅                ║");
      console.log("╚═══════════════════════════════════════════════════╝\n");
    } else {
      console.log("\n❌ ERROR: No tokens received!");
    }

  } catch (error) {
    console.error("\n❌ SWAP FAILED!");
    console.error("Error:", error.message);
    if (error.reason) console.error("Reason:", error.reason);
    
    console.log("\n╔═══════════════════════════════════════════════════╗");
    console.log("║          ❌ SWAP IS NOT WORKING ❌               ║");
    console.log("╚═══════════════════════════════════════════════════╝\n");
  }
}

main().catch(console.error);
