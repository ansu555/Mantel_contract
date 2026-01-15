const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  
  const POOLS = "0xe63514C2B0842B58A16Ced0C63668BAA91B033Af";
  const tUSDC = "0x6D13968b1Fe787ed0237D3645D094161CC165E4c";
  const tUSDT = "0x0828b7774ea41Db0fCbf13ADe31b5F61624A1364";

  console.log("\n🔄 QUICK SWAP TEST\n");
  console.log("Account:", signer.address);

  const pools = await hre.ethers.getContractAt("MultiTokenLiquidityPools", POOLS);
  const usdc = await hre.ethers.getContractAt("TestERC20Token", tUSDC);
  const usdt = await hre.ethers.getContractAt("TestERC20Token", tUSDT);

  // Check balances before
  const usdcBefore = await usdc.balanceOf(signer.address);
  const usdtBefore = await usdt.balanceOf(signer.address);
  console.log("Before - tUSDC:", hre.ethers.formatEther(usdcBefore));
  console.log("Before - tUSDT:", hre.ethers.formatEther(usdtBefore));

  const swapAmount = hre.ethers.parseEther("0.1");
  const poolId = await pools.getPoolId(tUSDC, tUSDT);

  // Approve
  console.log("\nApproving...");
  const approveTx = await usdc.approve(POOLS, swapAmount, { gasLimit: 80000000 });
  console.log("Approve TX:", approveTx.hash);
  await approveTx.wait();
  console.log("✅ Approved");

  // Swap
  console.log("\nSwapping 0.1 tUSDC → tUSDT...");
  const swapTx = await pools.swap(poolId, tUSDC, swapAmount, 0, { gasLimit: 80000000 });
  console.log("Swap TX:", swapTx.hash);
  
  const receipt = await swapTx.wait();
  console.log("Gas used:", receipt.gasUsed.toString());
  console.log("Status:", receipt.status === 1 ? "✅ SUCCESS" : "❌ FAILED");

  // Check balances after
  const usdcAfter = await usdc.balanceOf(signer.address);
  const usdtAfter = await usdt.balanceOf(signer.address);
  console.log("\nAfter - tUSDC:", hre.ethers.formatEther(usdcAfter));
  console.log("After - tUSDT:", hre.ethers.formatEther(usdtAfter));

  const received = usdtAfter - usdtBefore;
  if (received > 0n) {
    console.log("\n✅ SWAP WORKED! Received:", hre.ethers.formatEther(received), "tUSDT");
  }
}

main().catch(e => console.error("Error:", e.message));
