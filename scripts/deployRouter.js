const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying MultiHopSwapRouter...");

  // Get the existing pool contract address
  const POOLS_ADDRESS = "0xe63514C2B0842B58A16Ced0C63668BAA91B033Af";
  
  console.log(`Using existing pool contract at: ${POOLS_ADDRESS}`);

  // Deploy MultiHopSwapRouter
  const MultiHopSwapRouter = await hre.ethers.getContractFactory("MultiHopSwapRouter");
  const router = await MultiHopSwapRouter.deploy(POOLS_ADDRESS);

  await router.waitForDeployment();

  const routerAddress = await router.getAddress();

  console.log("\n✅ Deployment Complete!");
  console.log("════════════════════════════════════════");
  console.log(`MultiHopSwapRouter: ${routerAddress}`);
  console.log("════════════════════════════════════════");
  
  console.log("\n📝 Next Steps:");
  console.log("1. Update frontend/src/config.js:");
  console.log(`   export const ROUTER_ADDRESS = "${routerAddress}";`);
  console.log("\n2. Test multi-hop swaps in the frontend");
  console.log("\n3. Example routes:");
  console.log("   - Direct: tUSDC → tUSDT");
  console.log("   - 2-Hop: tUSDC → tDAI → tWETH");
  console.log("   - 3-Hop: tUSDC → tDAI → tWETH → tMKR");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
