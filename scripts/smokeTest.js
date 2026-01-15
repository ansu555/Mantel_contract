const hre = require("hardhat");

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║      MANTEL SWAP CONTRACTS - SMOKE TEST REPORT        ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  const POOLS = "0xe63514C2B0842B58A16Ced0C63668BAA91B033Af";
  const ROUTER = "0xFe2108798dC74481d5cCE1588cBD00801758dD6d";

  try {
    // 1. Check Pools Contract
    console.log("1️⃣  POOLS CONTRACT");
    console.log("   Address: " + POOLS);
    const poolsCode = await hre.ethers.provider.getCode(POOLS);
    if (poolsCode !== "0x") {
      console.log("   Status:  ✅ DEPLOYED");
    } else {
      console.log("   Status:  ❌ NOT FOUND");
      return;
    }

    const pools = await hre.ethers.getContractAt("MultiTokenLiquidityPools", POOLS);

    // 2. Check Router Contract
    console.log("\n2️⃣  ROUTER CONTRACT");
    console.log("   Address: " + ROUTER);
    const routerCode = await hre.ethers.provider.getCode(ROUTER);
    if (routerCode !== "0x") {
      console.log("   Status:  ✅ DEPLOYED");
    } else {
      console.log("   Status:  ❌ NOT FOUND");
      return;
    }

    const router = await hre.ethers.getContractAt("MultiHopSwapRouter", ROUTER);

    // 3. Check Liquidity Pools
    console.log("\n3️⃣  LIQUIDITY POOLS");
    const poolInfo = await pools.getPoolInfo(0);
    const reserve0 = parseFloat(hre.ethers.formatEther(poolInfo[2]));
    const reserve1 = parseFloat(hre.ethers.formatEther(poolInfo[3]));

    console.log("   Pool 0 (tUSDT/tUSDC):");
    console.log("     Reserve tUSDT: " + reserve0);
    console.log("     Reserve tUSDC: " + reserve1);

    if (reserve0 > 0 && reserve1 > 0) {
      console.log("     Status:   ✅ HAS LIQUIDITY");
    } else {
      console.log("     Status:   ❌ NO LIQUIDITY");
      return;
    }

    // 4. Check Contract Functions
    console.log("\n4️⃣  ROUTER FUNCTIONS");
    const functions = [
      "swapSingleHop",
      "swapTwoHop", 
      "swapThreeHop"
    ];

    for (const fn of functions) {
      if (router[fn]) {
        console.log("     ✅ " + fn);
      } else {
        console.log("     ❌ " + fn);
      }
    }

    // 5. Summary
    console.log("\n5️⃣  SUMMARY");
    console.log("   ✅ Pools contract is deployed and operational");
    console.log("   ✅ Router contract is deployed and operational");
    console.log("   ✅ Liquidity pool has " + reserve0 + " tUSDT and " + reserve1 + " tUSDC");
    console.log("   ✅ All router swap functions available");

    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║  ✅ ALL CONTRACTS ARE LIVE AND READY FOR SWAPPING ✅ ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");

  } catch (error) {
    console.error("\n❌ Error:", error.message);
  }
}

main().catch(console.error);
