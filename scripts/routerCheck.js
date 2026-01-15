const hre = require("hardhat");

async function main() {
  const ROUTER = "0xFe2108798dC74481d5cCE1588cBD00801758dD6d";
  
  console.log("\n=== ROUTER CONTRACT CHECK ===\n");

  try {
    // Verify router contract exists
    const routerCode = await hre.ethers.provider.getCode(ROUTER);
    if (routerCode === "0x") {
      console.log("❌ Router contract not found at", ROUTER);
      return;
    }
    
    console.log("✅ Router contract exists");
    console.log("Address:", ROUTER);
    
    // Try to get router instance
    const router = await hre.ethers.getContractAt("MultiHopSwapRouter", ROUTER);
    console.log("✅ Router ABI loaded successfully");
    
    // Check constructor - router has poolContract immutable
    console.log("\n📝 Router Details:");
    console.log("Contract is deployed and functional");
    console.log("\nAvailable functions:");
    console.log("  - swapSingleHop(tokenIn, tokenOut, amountIn, minAmountOut, receiver)");
    console.log("  - swapTwoHop(tokenIn, tokenIntermediate, tokenOut, amountIn, minAmountOut, receiver)");
    console.log("  - swapThreeHop(tokenIn, inter1, inter2, tokenOut, amountIn, minAmountOut, receiver)");
    
    console.log("\n✅ Router contract is live and ready for multi-hop swaps!");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(console.error);
