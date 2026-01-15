const hre = require("hardhat");

async function main() {
  const POOLS = "0xe63514C2B0842B58A16Ced0C63668BAA91B033Af";
  
  const pools = await hre.ethers.getContractAt("MultiTokenLiquidityPools", POOLS);
  
  console.log("\n=== CURRENT POOL STATE ===\n");
  
  // Check multiple pools to see if any swaps happened
  for (let i = 0; i < 5; i++) {
    try {
      const info = await pools.getPoolInfo(i);
      const r0 = hre.ethers.formatEther(info[2]);
      const r1 = hre.ethers.formatEther(info[3]);
      console.log(`Pool ${i}:`);
      console.log(`  Reserve0: ${r0}`);
      console.log(`  Reserve1: ${r1}`);
    } catch(e) {
      // Pool doesn't exist
    }
  }
}

main().catch(console.error);
