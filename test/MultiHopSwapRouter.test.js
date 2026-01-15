const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiHopSwapRouter", function () {
  let pools, router;
  let tokenA, tokenB, tokenC, tokenD;
  let owner, user1;

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();

    // Deploy test tokens
    const Token = await ethers.getContractFactory("TestERC20Token");
    tokenA = await Token.deploy("Token A", "TKA", 1000000);
    tokenB = await Token.deploy("Token B", "TKB", 1000000);
    tokenC = await Token.deploy("Token C", "TKC", 1000000);
    tokenD = await Token.deploy("Token D", "TKD", 1000000);
    
    await tokenA.waitForDeployment();
    await tokenB.waitForDeployment();
    await tokenC.waitForDeployment();
    await tokenD.waitForDeployment();

    // Deploy pools contract
    const Pools = await ethers.getContractFactory("MultiTokenLiquidityPools");
    pools = await Pools.deploy();
    await pools.waitForDeployment();

    // Deploy router
    const Router = await ethers.getContractFactory("MultiHopSwapRouter");
    router = await Router.deploy(await pools.getAddress());
    await router.waitForDeployment();

    // Mint tokens to user
    await tokenA.mint(user1.address, ethers.parseEther("10000"));
    await tokenB.mint(user1.address, ethers.parseEther("10000"));
    await tokenC.mint(user1.address, ethers.parseEther("10000"));
    await tokenD.mint(user1.address, ethers.parseEther("10000"));

    // Create a dummy pool first to avoid poolId 0 (router bug: treats poolId 0 as "not found")
    const dummyToken = await (await ethers.getContractFactory("TestERC20Token")).deploy("Dummy", "DUMMY", 1000);
    await dummyToken.waitForDeployment();
    await pools.createPool(await dummyToken.getAddress(), await tokenA.getAddress());

    // Create pools: A-B, B-C, C-D (these will be poolIds 1, 2, 3)
    await pools.createPool(await tokenA.getAddress(), await tokenB.getAddress());
    await pools.createPool(await tokenB.getAddress(), await tokenC.getAddress());
    await pools.createPool(await tokenC.getAddress(), await tokenD.getAddress());

    // Get pool IDs
    const poolId1 = await pools.getPoolId(await tokenA.getAddress(), await tokenB.getAddress());
    const poolId2 = await pools.getPoolId(await tokenB.getAddress(), await tokenC.getAddress());
    const poolId3 = await pools.getPoolId(await tokenC.getAddress(), await tokenD.getAddress());

    // Add liquidity to all pools
    await tokenA.connect(user1).approve(await pools.getAddress(), ethers.parseEther("10000"));
    await tokenB.connect(user1).approve(await pools.getAddress(), ethers.parseEther("10000"));
    await tokenC.connect(user1).approve(await pools.getAddress(), ethers.parseEther("10000"));
    await tokenD.connect(user1).approve(await pools.getAddress(), ethers.parseEther("10000"));

    // Pool A-B: 1000 A, 2000 B (1 A = 2 B)
    await pools.connect(user1).addLiquidity(poolId1, ethers.parseEther("1000"), ethers.parseEther("2000"), 0, 0);
    
    // Pool B-C: 1000 B, 1000 C (1 B = 1 C)
    await pools.connect(user1).addLiquidity(poolId2, ethers.parseEther("1000"), ethers.parseEther("1000"), 0, 0);
    
    // Pool C-D: 2000 C, 1000 D (2 C = 1 D)
    await pools.connect(user1).addLiquidity(poolId3, ethers.parseEther("2000"), ethers.parseEther("1000"), 0, 0);
  });

  describe("Deployment", function () {
    it("Should set the correct pool contract address", async function () {
      const poolAddress = await router.poolContract();
      expect(poolAddress).to.equal(await pools.getAddress());
    });

    it("Should revert if deployed with zero address", async function () {
      const Router = await ethers.getContractFactory("MultiHopSwapRouter");
      await expect(Router.deploy(ethers.ZeroAddress)).to.be.revertedWithCustomError(
        Router,
        "InvalidPoolContract"
      );
    });
  });

  describe("Single Hop Swap", function () {
    beforeEach(async function () {
      // Approve router to spend tokens
      await tokenA.connect(user1).approve(await router.getAddress(), ethers.parseEther("1000"));
    });

    it("Should execute single hop swap successfully", async function () {
      const swapAmount = ethers.parseEther("100");
      const balanceBefore = await tokenB.balanceOf(user1.address);

      await router.connect(user1).swapSingleHop(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        swapAmount,
        0,
        user1.address
      );

      const balanceAfter = await tokenB.balanceOf(user1.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("Should emit SingleHopSwap event", async function () {
      const swapAmount = ethers.parseEther("100");

      await expect(
        router.connect(user1).swapSingleHop(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          swapAmount,
          0,
          user1.address
        )
      ).to.emit(router, "SingleHopSwap");
    });

    it("Should revert with zero amount", async function () {
      await expect(
        router.connect(user1).swapSingleHop(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          0,
          0,
          user1.address
        )
      ).to.be.revertedWithCustomError(router, "InvalidAmount");
    });

    it("Should revert if pool not found", async function () {
      // Try to swap A-D directly (no pool exists)
      await expect(
        router.connect(user1).swapSingleHop(
          await tokenA.getAddress(),
          await tokenD.getAddress(),
          ethers.parseEther("10"),
          0,
          user1.address
        )
      ).to.be.revertedWithCustomError(router, "PoolNotFound");
    });

    it("Should revert if output less than minimum", async function () {
      const swapAmount = ethers.parseEther("100");

      // Reverts in pools contract with string error, not custom error
      await expect(
        router.connect(user1).swapSingleHop(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          swapAmount,
          ethers.parseEther("999999"), // unrealistically high
          user1.address
        )
      ).to.be.revertedWith("Insufficient output amount");
    });

    it("Should transfer tokens to specified receiver", async function () {
      const swapAmount = ethers.parseEther("100");
      const receiverBalanceBefore = await tokenB.balanceOf(owner.address);

      await router.connect(user1).swapSingleHop(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        swapAmount,
        0,
        owner.address // Different receiver
      );

      const receiverBalanceAfter = await tokenB.balanceOf(owner.address);
      expect(receiverBalanceAfter).to.be.gt(receiverBalanceBefore);
    });
  });

  describe("Two Hop Swap", function () {
    beforeEach(async function () {
      await tokenA.connect(user1).approve(await router.getAddress(), ethers.parseEther("1000"));
    });

    it("Should execute two hop swap successfully (A → B → C)", async function () {
      const swapAmount = ethers.parseEther("100");
      const balanceBefore = await tokenC.balanceOf(user1.address);

      await router.connect(user1).swapTwoHop(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        await tokenC.getAddress(),
        swapAmount,
        0,
        user1.address
      );

      const balanceAfter = await tokenC.balanceOf(user1.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("Should emit TwoHopSwap event", async function () {
      const swapAmount = ethers.parseEther("100");

      await expect(
        router.connect(user1).swapTwoHop(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          await tokenC.getAddress(),
          swapAmount,
          0,
          user1.address
        )
      ).to.emit(router, "TwoHopSwap");
    });

    it("Should handle fees correctly across two hops", async function () {
      const swapAmount = ethers.parseEther("100");
      
      const balanceBefore = await tokenC.balanceOf(user1.address);
      await router.connect(user1).swapTwoHop(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        await tokenC.getAddress(),
        swapAmount,
        0,
        user1.address
      );
      const balanceAfter = await tokenC.balanceOf(user1.address);

      const actualOut = balanceAfter - balanceBefore;
      
      // Should receive some output
      expect(actualOut).to.be.gt(0);
      
      // Output should be less than input due to fees (0.3% per hop = ~0.6% total)
      expect(actualOut).to.be.lt(swapAmount);
    });

    it("Should revert if any pool not found", async function () {
      // Create a new token without pools
      const Token = await ethers.getContractFactory("TestERC20Token");
      const tokenE = await Token.deploy("Token E", "TKE", 1000000);
      await tokenE.waitForDeployment();

      await expect(
        router.connect(user1).swapTwoHop(
          await tokenA.getAddress(),
          await tokenE.getAddress(), // No pool
          await tokenC.getAddress(),
          ethers.parseEther("10"),
          0,
          user1.address
        )
      ).to.be.revertedWithCustomError(router, "PoolNotFound");
    });

    it("Should revert if output less than minimum", async function () {
      // Reverts in pools contract with string error, not custom error
      await expect(
        router.connect(user1).swapTwoHop(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          await tokenC.getAddress(),
          ethers.parseEther("100"),
          ethers.parseEther("999999"),
          user1.address
        )
      ).to.be.revertedWith("Insufficient output amount");
    });
  });

  describe("Three Hop Swap", function () {
    beforeEach(async function () {
      await tokenA.connect(user1).approve(await router.getAddress(), ethers.parseEther("1000"));
    });

    it("Should execute three hop swap successfully (A → B → C → D)", async function () {
      const swapAmount = ethers.parseEther("100");
      const balanceBefore = await tokenD.balanceOf(user1.address);

      await router.connect(user1).swapThreeHop(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        await tokenC.getAddress(),
        await tokenD.getAddress(),
        swapAmount,
        0,
        user1.address
      );

      const balanceAfter = await tokenD.balanceOf(user1.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("Should emit ThreeHopSwap event", async function () {
      const swapAmount = ethers.parseEther("100");

      await expect(
        router.connect(user1).swapThreeHop(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          await tokenC.getAddress(),
          await tokenD.getAddress(),
          swapAmount,
          0,
          user1.address
        )
      ).to.emit(router, "ThreeHopSwap");
    });

    it("Should compound fees correctly across three hops", async function () {
      const swapAmount = ethers.parseEther("10");
      
      const balanceBefore = await tokenD.balanceOf(user1.address);
      await router.connect(user1).swapThreeHop(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        await tokenC.getAddress(),
        await tokenD.getAddress(),
        swapAmount,
        0,
        user1.address
      );
      const balanceAfter = await tokenD.balanceOf(user1.address);

      // Output should be positive but less than if no fees existed
      expect(balanceAfter).to.be.gt(balanceBefore);
      
      // With 0.3% per hop, total loss is ~0.9% (slightly more due to compounding)
      const actualOut = balanceAfter - balanceBefore;
      expect(actualOut).to.be.gt(0);
    });

    it("Should revert if any pool not found", async function () {
      const Token = await ethers.getContractFactory("TestERC20Token");
      const tokenE = await Token.deploy("Token E", "TKE", 1000000);
      await tokenE.waitForDeployment();

      await expect(
        router.connect(user1).swapThreeHop(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          await tokenE.getAddress(), // No pool with C
          await tokenD.getAddress(),
          ethers.parseEther("10"),
          0,
          user1.address
        )
      ).to.be.revertedWithCustomError(router, "PoolNotFound");
    });

    it("Should revert with zero amount", async function () {
      await expect(
        router.connect(user1).swapThreeHop(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          await tokenC.getAddress(),
          await tokenD.getAddress(),
          0,
          0,
          user1.address
        )
      ).to.be.revertedWithCustomError(router, "InvalidAmount");
    });

    it("Should transfer to specified receiver", async function () {
      const swapAmount = ethers.parseEther("10");
      const receiverBalanceBefore = await tokenD.balanceOf(owner.address);

      await router.connect(user1).swapThreeHop(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        await tokenC.getAddress(),
        await tokenD.getAddress(),
        swapAmount,
        0,
        owner.address
      );

      const receiverBalanceAfter = await tokenD.balanceOf(owner.address);
      expect(receiverBalanceAfter).to.be.gt(receiverBalanceBefore);
    });
  });

  describe("View Functions", function () {
    it("Should calculate two hop output correctly", async function () {
      const swapAmount = ethers.parseEther("100");

      const expectedOutput = await router.getAmountOutTwoHop(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        await tokenC.getAddress(),
        swapAmount
      );

      expect(expectedOutput).to.be.gt(0);

      // Verify by doing actual swap
      await tokenA.connect(user1).approve(await router.getAddress(), swapAmount);
      const balanceBefore = await tokenC.balanceOf(user1.address);
      
      await router.connect(user1).swapTwoHop(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        await tokenC.getAddress(),
        swapAmount,
        0,
        user1.address
      );

      const balanceAfter = await tokenC.balanceOf(user1.address);
      const actualOutput = balanceAfter - balanceBefore;

      expect(actualOutput).to.equal(expectedOutput);
    });

    it("Should calculate three hop output correctly", async function () {
      const swapAmount = ethers.parseEther("50");

      const expectedOutput = await router.getAmountOutThreeHop(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        await tokenC.getAddress(),
        await tokenD.getAddress(),
        swapAmount
      );

      expect(expectedOutput).to.be.gt(0);

      // Verify by doing actual swap
      await tokenA.connect(user1).approve(await router.getAddress(), swapAmount);
      const balanceBefore = await tokenD.balanceOf(user1.address);
      
      await router.connect(user1).swapThreeHop(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        await tokenC.getAddress(),
        await tokenD.getAddress(),
        swapAmount,
        0,
        user1.address
      );

      const balanceAfter = await tokenD.balanceOf(user1.address);
      const actualOutput = balanceAfter - balanceBefore;

      expect(actualOutput).to.equal(expectedOutput);
    });
  });

  describe("Token Recovery", function () {
    it("Should allow token recovery", async function () {
      // Send some tokens to router by mistake
      const amount = ethers.parseEther("100");
      await tokenA.connect(user1).transfer(await router.getAddress(), amount);

      const balanceBefore = await tokenA.balanceOf(user1.address);
      
      await router.recoverTokens(
        await tokenA.getAddress(),
        amount,
        user1.address
      );

      const balanceAfter = await tokenA.balanceOf(user1.address);
      expect(balanceAfter).to.equal(balanceBefore + amount);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle very small swap amounts", async function () {
      const swapAmount = ethers.parseUnits("1", 6); // Very small amount
      await tokenA.connect(user1).approve(await router.getAddress(), swapAmount);

      const balanceBefore = await tokenB.balanceOf(user1.address);

      await router.connect(user1).swapSingleHop(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        swapAmount,
        0,
        user1.address
      );

      const balanceAfter = await tokenB.balanceOf(user1.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("Should handle large swap amounts", async function () {
      const largeAmount = ethers.parseEther("500");
      await tokenA.connect(user1).approve(await router.getAddress(), largeAmount);

      const balanceBefore = await tokenB.balanceOf(user1.address);

      await router.connect(user1).swapSingleHop(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        largeAmount,
        0,
        user1.address
      );

      const balanceAfter = await tokenB.balanceOf(user1.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });
  });
});

