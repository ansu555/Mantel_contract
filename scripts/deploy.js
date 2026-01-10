const hre = require("hardhat");

async function main() {
  // Deploy test tokens
  const TestToken = await hre.ethers.getContractFactory("TestERC20Token");

  const tokens = [];
  const tokenNames = [
    ["Test USDC", "tUSDC", 1_000_000],
    ["Test USDT", "tUSDT", 1_000_000],
    ["Test DAI", "tDAI", 1_000_000],
    ["Test WETH", "tWETH", 10_000],
    ["Test WBTC", "tWBTC", 100],
    ["Test LINK", "tLINK", 50_000],
    ["Test UNI", "tUNI", 50_000],
    ["Test AAVE", "tAAVE", 10_000],
    ["Test CRV", "tCRV", 100_000],
    ["Test MKR", "tMKR", 5_000],
  ];

  console.log("Deploying test tokens...");
  for (const [name, symbol, supply] of tokenNames) {
    const token = await TestToken.deploy(name, symbol, supply);
    await token.waitForDeployment();
    const address = await token.getAddress();
    tokens.push({ name, symbol, address });
    console.log(`${symbol} deployed to: ${address}`);
  }

  // Deploy pool contract
  const LiquidityPools = await hre.ethers.getContractFactory("MultiTokenLiquidityPools");
  const pools = await LiquidityPools.deploy();
  await pools.waitForDeployment();
  const poolsAddress = await pools.getAddress();
  console.log("\nLiquidity Pools deployed to:", poolsAddress);

  // Create pools (using token indexes above)
  console.log("\nCreating pools...");
  const poolPairs = [
    [0, 1],
    [3, 0],
    [4, 3],
    [5, 0],
    [6, 3],
    [7, 0],
    [8, 0],
    [9, 3],
    [2, 0],
    [5, 3],
  ];

  for (let i = 0; i < poolPairs.length; i++) {
    const [idx0, idx1] = poolPairs[i];
    const tx = await pools.createPool(tokens[idx0].address, tokens[idx1].address);
    await tx.wait();
    console.log(`Pool ${i}: ${tokens[idx0].symbol}/${tokens[idx1].symbol} created`);
  }

  console.log("\n=== Deployment Complete ===");
  console.log("Pools Contract:", poolsAddress);
  tokens.forEach((t) => console.log(`${t.symbol}: ${t.address}`));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
