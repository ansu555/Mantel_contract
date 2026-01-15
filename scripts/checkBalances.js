const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const tUSDC = "0x6D13968b1Fe787ed0237D3645D094161CC165E4c";
  const tUSDT = "0x0828b7774ea41Db0fCbf13ADe31b5F61624A1364";

  const usdc = await hre.ethers.getContractAt("TestERC20Token", tUSDC);
  const usdt = await hre.ethers.getContractAt("TestERC20Token", tUSDT);

  const usdcBal = await usdc.balanceOf(signer.address);
  const usdtBal = await usdt.balanceOf(signer.address);

  console.log("Current balances:");
  console.log("tUSDC:", hre.ethers.formatEther(usdcBal));
  console.log("tUSDT:", hre.ethers.formatEther(usdtBal));
  
  // If balance changed from initial 1000200/1000100, swap worked
  if (hre.ethers.formatEther(usdcBal) !== "1000200.0") {
    console.log("\n✅ Balance changed - SWAP WORKED!");
  }
}

main().catch(console.error);
