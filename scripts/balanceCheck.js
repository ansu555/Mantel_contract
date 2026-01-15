const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  
  const tUSDC = "0x6D13968b1Fe787ed0237D3645D094161CC165E4c";
  const tUSDT = "0x0828b7774ea41Db0fCbf13ADe31b5F61624A1364";

  console.log("\n📊 BALANCE CHECK\n");

  const usdc = await hre.ethers.getContractAt("TestERC20Token", tUSDC);
  const usdt = await hre.ethers.getContractAt("TestERC20Token", tUSDT);

  const usdcBal = await usdc.balanceOf(signer.address);
  const usdtBal = await usdt.balanceOf(signer.address);
  
  console.log("tUSDC:", hre.ethers.formatEther(usdcBal));
  console.log("tUSDT:", hre.ethers.formatEther(usdtBal));
  
  // Original balances were:
  // tUSDC: 1000200.0
  // tUSDT: 1000100.0
  
  const usdcDiff = parseFloat("1000200") - parseFloat(hre.ethers.formatEther(usdcBal));
  const usdtDiff = parseFloat(hre.ethers.formatEther(usdtBal)) - parseFloat("1000100");
  
  if (usdtDiff > 0) {
    console.log("\n✅ SWAP HAS WORKED!");
    console.log("tUSDC spent:", usdcDiff.toFixed(4));
    console.log("tUSDT received:", usdtDiff.toFixed(4));
  } else {
    console.log("\n❌ No change - swap not executed");
  }
}

main().catch(e => console.error("Error:", e.message));
