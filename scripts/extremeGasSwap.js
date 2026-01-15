const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  
  const POOLS = "0xe63514C2B0842B58A16Ced0C63668BAA91B033Af";
  const tUSDC = "0x6D13968b1Fe787ed0237D3645D094161CC165E4c";
  const tUSDT = "0x0828b7774ea41Db0fCbf13ADe31b5F61624A1364";

  console.log("\n=== EXTREME GAS SWAP TEST ===\n");
  console.log("Account:", signer.address);

  try {
    const pools = await hre.ethers.getContractAt("MultiTokenLiquidityPools", POOLS);
    const usdc = await hre.ethers.getContractAt("TestERC20Token", tUSDC);

    const poolId = await pools.getPoolId(tUSDC, tUSDT);
    const swapAmount = hre.ethers.parseEther("0.01");

    // First approve with very high gas
    console.log("Approving...");
    const approveTx = await usdc.approve(POOLS, hre.ethers.parseEther("1000000"), {
      gasLimit: 500000000  // 500M gas
    });
    await approveTx.wait();
    console.log("✅ Approved");

    // Now swap with extreme gas
    console.log("Swapping 0.01 tUSDC with 500M gas limit...");
    const tx = await pools.swap(poolId, tUSDC, swapAmount, 0, {
      gasLimit: 500000000  // 500M gas - maximum possible
    });
    
    console.log("TX Hash:", tx.hash);
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log("\n✅ SWAP SUCCESSFUL!");
      console.log("Gas used:", receipt.gasUsed.toString());
    } else {
      console.log("\n❌ Swap failed");
    }

  } catch (error) {
    console.error("\n❌ Error:", error.message);
  }
}

main().catch(console.error);
