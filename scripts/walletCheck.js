const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  
  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║            WALLET BALANCE CHECK                        ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");
  
  console.log("Wallet Address:", signer.address);
  
  // Check native MNT balance (for gas)
  const mntBalance = await hre.ethers.provider.getBalance(signer.address);
  console.log("\n💰 NATIVE MNT (for gas):", hre.ethers.formatEther(mntBalance), "MNT");
  
  // Check if enough for gas (Mantle needs ~74M gas at ~20 gwei)
  const estimatedGasCost = BigInt(100000000) * BigInt(20100000); // 100M gas * gas price
  console.log("Estimated gas cost for swap:", hre.ethers.formatEther(estimatedGasCost), "MNT");
  
  if (mntBalance < estimatedGasCost) {
    console.log("⚠️  WARNING: May not have enough MNT for gas!");
  } else {
    console.log("✅ Sufficient MNT for gas");
  }
  
  // Token addresses
  const tokens = {
    tUSDC: "0x6D13968b1Fe787ed0237D3645D094161CC165E4c",
    tUSDT: "0x0828b7774ea41Db0fCbf13ADe31b5F61624A1364",
    tDAI: "0x907fF6a35a3E030c11a02e937527402F0d3333ee",
    tWETH: "0x95829976c0cd4a58fBaA4802410d10BDe15E3CA0",
  };
  
  console.log("\n💰 TOKEN BALANCES:");
  for (const [symbol, address] of Object.entries(tokens)) {
    const token = await hre.ethers.getContractAt("TestERC20Token", address);
    const balance = await token.balanceOf(signer.address);
    console.log(`  ${symbol}: ${hre.ethers.formatEther(balance)}`);
  }
  
  // Check allowances to pool contract
  const POOLS = "0xe63514C2B0842B58A16Ced0C63668BAA91B033Af";
  console.log("\n🔐 ALLOWANCES TO POOL CONTRACT:");
  for (const [symbol, address] of Object.entries(tokens)) {
    const token = await hre.ethers.getContractAt("TestERC20Token", address);
    const allowance = await token.allowance(signer.address, POOLS);
    console.log(`  ${symbol}: ${hre.ethers.formatEther(allowance)}`);
  }
  
  console.log("\n════════════════════════════════════════════════════════");
}

main().catch(console.error);
