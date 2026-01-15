const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("Testing with account:", signer.address);

  const POOLS = "0xe63514C2B0842B58A16Ced0C63668BAA91B033Af";
  const ROUTER = "0xFe2108798dC74481d5cCE1588cBD00801758dD6d";
  const tUSDC = "0x6D13968b1Fe787ed0237D3645D094161CC165E4c";
  const tDAI = "0x907fF6a35a3E030c11a02e937527402F0d3333ee";
  const tWETH = "0x95829976c0cd4a58fBaA4802410d10BDe15E3CA0";

  try {
    // Get router contract
    const router = await hre.ethers.getContractAt("MultiHopSwapRouter", ROUTER);
    console.log("\n✅ Router contract found");

    // Get pool contract
    const pools = await hre.ethers.getContractAt("MultiTokenLiquidityPools", POOLS);
    console.log("✅ Pools contract found");

    // Check balances
    const usdc = await hre.ethers.getContractAt("TestERC20Token", tUSDC);
    const dai = await hre.ethers.getContractAt("TestERC20Token", tDAI);
    const weth = await hre.ethers.getContractAt("TestERC20Token", tWETH);

    const usdcBal = await usdc.balanceOf(signer.address);
    const daiBal = await dai.balanceOf(signer.address);
    const wethBal = await weth.balanceOf(signer.address);

    console.log("\n📊 Testing 2-hop swap:");
    console.log("Route: tUSDC → tDAI → tWETH");

    const amountIn = hre.ethers.parseEther("1");
    console.log("Amount in:", hre.ethers.formatEther(amountIn));

    console.log("\nBefore swap:");
    console.log("  tUSDC:", hre.ethers.formatEther(usdcBal));
    console.log("  tDAI:", hre.ethers.formatEther(daiBal));
    console.log("  tWETH:", hre.ethers.formatEther(wethBal));

    // Approve router
    console.log("\n🔐 Approving tUSDC to router...");
    const approveTx = await usdc.approve(ROUTER, amountIn);
    await approveTx.wait();
    console.log("✅ Approved!");

    // Execute 2-hop swap using swapTwoHop function
    console.log("\n💱 Executing 2-hop swap...");
    const tx = await router.swapTwoHop(
      tUSDC,        // tokenIn
      tDAI,         // tokenIntermediate
      tWETH,        // tokenOut
      amountIn,     // amount in
      0,            // minAmountOut
      signer.address, // receiver
      {
        gasLimit: 500000,
      }
    );

    console.log("Transaction hash:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ 2-hop swap successful!");
    console.log("Gas used:", receipt.gasUsed.toString());

    // Check new balances
    const newUsdcBal = await usdc.balanceOf(signer.address);
    const newDaiBal = await dai.balanceOf(signer.address);
    const newWethBal = await weth.balanceOf(signer.address);

    console.log("\nAfter swap:");
    console.log("  tUSDC:", hre.ethers.formatEther(newUsdcBal));
    console.log("  tDAI:", hre.ethers.formatEther(newDaiBal));
    console.log("  tWETH:", hre.ethers.formatEther(newWethBal));

  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
  }
}

main().catch(console.error);
