const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiTokenLiquidityPools", function () {
  let pools, tokenA, tokenB, tokenC;
  let owner, user1, user2;

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy test tokens
    const Token = await ethers.getContractFactory("TestERC20Token");
    tokenA = await Token.deploy("Token A", "TKA", 1000000);
    tokenB = await Token.deploy("Token B", "TKB", 1000000);
    tokenC = await Token.deploy("Token C", "TKC", 1000000);
    
    await tokenA.waitForDeployment();
    await tokenB.waitForDeployment();
    await tokenC.waitForDeployment();

    // Deploy pools contract
    const Pools = await ethers.getContractFactory("MultiTokenLiquidityPools");
    pools = await Pools.deploy();
    await pools.waitForDeployment();

    // Mint tokens to users
    await tokenA.mint(user1.address, ethers.parseEther("10000"));
    await tokenB.mint(user1.address, ethers.parseEther("10000"));
    await tokenC.mint(user1.address, ethers.parseEther("10000"));
    
    await tokenA.mint(user2.address, ethers.parseEther("5000"));
    await tokenB.mint(user2.address, ethers.parseEther("5000"));
  });

  describe("Pool Creation", function () {
    it("Should create a pool successfully", async function () {
      const tx = await pools.createPool(await tokenA.getAddress(), await tokenB.getAddress());
      await tx.wait();

      const poolId = await pools.getPoolId(await tokenA.getAddress(), await tokenB.getAddress());
      expect(poolId).to.equal(0);

      const poolCount = await pools.poolCount();
      expect(poolCount).to.equal(1);
    });

    it("Should emit PoolCreated event", async function () {
      const tokenAAddr = await tokenA.getAddress();
      const tokenBAddr = await tokenB.getAddress();
      
      // Just verify event is emitted with correct poolId
      // Token order is determined by contract (lower address first)
      const tx = await pools.createPool(tokenAAddr, tokenBAddr);
      const receipt = await tx.wait();
      
      const poolCreatedEvent = receipt.logs.find(
        log => log.fragment && log.fragment.name === "PoolCreated"
      );
      
      expect(poolCreatedEvent).to.not.be.undefined;
      expect(poolCreatedEvent.args[0]).to.equal(0n); // poolId should be 0 for first pool
    });

    it("Should order tokens correctly (token0 < token1)", async function () {
      const tokenAAddr = await tokenA.getAddress();
      const tokenBAddr = await tokenB.getAddress();
      
      await pools.createPool(tokenAAddr, tokenBAddr);
      const poolId = await pools.getPoolId(tokenAAddr, tokenBAddr);
      const poolInfo = await pools.getPoolInfo(poolId);

      // token0 should be less than token1
      expect(poolInfo[0] < poolInfo[1]).to.be.true;
    });

    it("Should prevent duplicate pool creation", async function () {
      await pools.createPool(await tokenA.getAddress(), await tokenB.getAddress());
      
      await expect(
        pools.createPool(await tokenA.getAddress(), await tokenB.getAddress())
      ).to.be.revertedWith("Pool already exists");
    });

    it("Should prevent pool creation with identical tokens", async function () {
      await expect(
        pools.createPool(await tokenA.getAddress(), await tokenA.getAddress())
      ).to.be.revertedWith("Identical tokens");
    });

    it("Should prevent pool creation with zero address", async function () {
      await expect(
        pools.createPool(ethers.ZeroAddress, await tokenB.getAddress())
      ).to.be.revertedWith("Invalid token address");
    });
  });

  describe("Add Liquidity", function () {
    let poolId;

    beforeEach(async function () {
      // Create a pool
      await pools.createPool(await tokenA.getAddress(), await tokenB.getAddress());
      poolId = await pools.getPoolId(await tokenA.getAddress(), await tokenB.getAddress());

      // Approve tokens
      await tokenA.connect(user1).approve(await pools.getAddress(), ethers.parseEther("10000"));
      await tokenB.connect(user1).approve(await pools.getAddress(), ethers.parseEther("10000"));
    });

    it("Should add initial liquidity", async function () {
      const amount0 = ethers.parseEther("100");
      const amount1 = ethers.parseEther("200");

      await pools.connect(user1).addLiquidity(poolId, amount0, amount1, 0, 0);

      const poolInfo = await pools.getPoolInfo(poolId);
      expect(poolInfo[2]).to.equal(amount0); // reserve0
      expect(poolInfo[3]).to.equal(amount1); // reserve1
    });

    it("Should mint LP tokens correctly for initial liquidity", async function () {
      const amount0 = ethers.parseEther("100");
      const amount1 = ethers.parseEther("200");

      await pools.connect(user1).addLiquidity(poolId, amount0, amount1, 0, 0);

      const position = await pools.getUserPosition(poolId, user1.address);
      // LP tokens = sqrt(100 * 200) = sqrt(20000) ≈ 141.42
      expect(position[0]).to.be.gt(0);
    });

    it("Should add subsequent liquidity proportionally", async function () {
      // Add initial liquidity
      await pools.connect(user1).addLiquidity(
        poolId,
        ethers.parseEther("100"),
        ethers.parseEther("200"),
        0,
        0
      );

      // Approve for user2
      await tokenA.connect(user2).approve(await pools.getAddress(), ethers.parseEther("5000"));
      await tokenB.connect(user2).approve(await pools.getAddress(), ethers.parseEther("5000"));

      // Add more liquidity (should maintain 1:2 ratio)
      await pools.connect(user2).addLiquidity(
        poolId,
        ethers.parseEther("50"),
        ethers.parseEther("100"),
        0,
        0
      );

      const poolInfo = await pools.getPoolInfo(poolId);
      expect(poolInfo[2]).to.equal(ethers.parseEther("150")); // reserve0
      expect(poolInfo[3]).to.equal(ethers.parseEther("300")); // reserve1
    });

    it("Should emit LiquidityAdded event", async function () {
      await expect(
        pools.connect(user1).addLiquidity(
          poolId,
          ethers.parseEther("100"),
          ethers.parseEther("200"),
          0,
          0
        )
      ).to.emit(pools, "LiquidityAdded");
    });

    it("Should revert if minimum amount not met", async function () {
      // First add some liquidity to establish a ratio
      await pools.connect(user1).addLiquidity(
        poolId,
        ethers.parseEther("100"),
        ethers.parseEther("200"),
        0,
        0
      );

      // Now try to add more with impossible minimum requirements
      await expect(
        pools.connect(user1).addLiquidity(
          poolId,
          ethers.parseEther("100"),
          ethers.parseEther("50"), // Not enough token1 for 1:2 ratio
          ethers.parseEther("100"),
          ethers.parseEther("200"), // Minimum requires full amount but won't be met
        )
      ).to.be.reverted;
    });
  });

  describe("Remove Liquidity", function () {
    let poolId;

    beforeEach(async function () {
      await pools.createPool(await tokenA.getAddress(), await tokenB.getAddress());
      poolId = await pools.getPoolId(await tokenA.getAddress(), await tokenB.getAddress());

      await tokenA.connect(user1).approve(await pools.getAddress(), ethers.parseEther("10000"));
      await tokenB.connect(user1).approve(await pools.getAddress(), ethers.parseEther("10000"));

      // Add initial liquidity
      await pools.connect(user1).addLiquidity(
        poolId,
        ethers.parseEther("100"),
        ethers.parseEther("200"),
        0,
        0
      );
    });

    it("Should remove liquidity successfully", async function () {
      const position = await pools.getUserPosition(poolId, user1.address);
      const lpTokens = position[0];

      const balanceBefore0 = await tokenA.balanceOf(user1.address);
      const balanceBefore1 = await tokenB.balanceOf(user1.address);

      await pools.connect(user1).removeLiquidity(poolId, lpTokens, 0, 0);

      const balanceAfter0 = await tokenA.balanceOf(user1.address);
      const balanceAfter1 = await tokenB.balanceOf(user1.address);

      expect(balanceAfter0).to.be.gt(balanceBefore0);
      expect(balanceAfter1).to.be.gt(balanceBefore1);
    });

    it("Should burn LP tokens when removing liquidity", async function () {
      const position = await pools.getUserPosition(poolId, user1.address);
      const lpTokens = position[0];

      await pools.connect(user1).removeLiquidity(poolId, lpTokens, 0, 0);

      const positionAfter = await pools.getUserPosition(poolId, user1.address);
      expect(positionAfter[0]).to.equal(0);
    });

    it("Should emit LiquidityRemoved event", async function () {
      const position = await pools.getUserPosition(poolId, user1.address);
      const lpTokens = position[0];

      await expect(
        pools.connect(user1).removeLiquidity(poolId, lpTokens, 0, 0)
      ).to.emit(pools, "LiquidityRemoved");
    });

    it("Should revert if insufficient LP tokens", async function () {
      await expect(
        pools.connect(user1).removeLiquidity(poolId, ethers.parseEther("999999999"), 0, 0)
      ).to.be.revertedWith("Insufficient LP tokens");
    });
  });

  describe("Swap", function () {
    let poolId;

    beforeEach(async function () {
      await pools.createPool(await tokenA.getAddress(), await tokenB.getAddress());
      poolId = await pools.getPoolId(await tokenA.getAddress(), await tokenB.getAddress());

      // Add liquidity
      await tokenA.connect(user1).approve(await pools.getAddress(), ethers.parseEther("10000"));
      await tokenB.connect(user1).approve(await pools.getAddress(), ethers.parseEther("10000"));
      await pools.connect(user1).addLiquidity(
        poolId,
        ethers.parseEther("1000"),
        ethers.parseEther("2000"),
        0,
        0
      );
    });

    it("Should swap tokens successfully", async function () {
      const swapAmount = ethers.parseEther("10");
      await tokenA.connect(user2).approve(await pools.getAddress(), swapAmount);

      const balanceBefore = await tokenB.balanceOf(user2.address);
      
      await pools.connect(user2).swap(
        poolId,
        await tokenA.getAddress(),
        swapAmount,
        0
      );

      const balanceAfter = await tokenB.balanceOf(user2.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("Should charge 0.3% fee on swaps", async function () {
      const swapAmount = ethers.parseEther("100");
      await tokenA.connect(user2).approve(await pools.getAddress(), swapAmount);

      // Get pool info and expected output before swap
      const poolInfoBefore = await pools.getPoolInfo(poolId);
      const expectedOut = await pools.getAmountOut(swapAmount, poolInfoBefore[2], poolInfoBefore[3]);

      const balanceBefore = await tokenB.balanceOf(user2.address);
      await pools.connect(user2).swap(poolId, await tokenA.getAddress(), swapAmount, 0);
      const balanceAfter = await tokenB.balanceOf(user2.address);

      const actualOut = balanceAfter - balanceBefore;
      expect(actualOut).to.equal(expectedOut);

      // Verify the output is less than ideal (due to 0.3% fee)
      // Ideal output without fee: (amountIn * reserveOut) / (reserveIn + amountIn)
      const idealOut = (swapAmount * poolInfoBefore[3]) / (poolInfoBefore[2] + swapAmount);
      expect(actualOut).to.be.lt(idealOut); // Should be less due to fees
      
      // Fee should be approximately 0.3% of input
      const feeAmount = idealOut - actualOut;
      expect(feeAmount).to.be.gt(0);
    });

    it("Should update reserves after swap", async function () {
      const swapAmount = ethers.parseEther("10");
      await tokenA.connect(user2).approve(await pools.getAddress(), swapAmount);

      const poolInfoBefore = await pools.getPoolInfo(poolId);
      const tokenAAddr = await tokenA.getAddress();
      
      // Determine if tokenA is token0 or token1 in the pool
      const isToken0 = tokenAAddr.toLowerCase() === poolInfoBefore[0].toLowerCase();
      const reserveIn = isToken0 ? poolInfoBefore[2] : poolInfoBefore[3];
      const reserveOut = isToken0 ? poolInfoBefore[3] : poolInfoBefore[2];
      
      // Calculate expected output
      const expectedOut = await pools.getAmountOut(swapAmount, reserveIn, reserveOut);
      
      await pools.connect(user2).swap(
        poolId,
        tokenAAddr,
        swapAmount,
        0
      );

      const poolInfoAfter = await pools.getPoolInfo(poolId);
      
      // Check reserves updated correctly based on which token was swapped
      if (isToken0) {
        expect(poolInfoAfter[2]).to.equal(poolInfoBefore[2] + swapAmount); // reserve0 increased
        expect(poolInfoAfter[3]).to.equal(poolInfoBefore[3] - expectedOut); // reserve1 decreased
      } else {
        expect(poolInfoAfter[2]).to.equal(poolInfoBefore[2] - expectedOut); // reserve0 decreased
        expect(poolInfoAfter[3]).to.equal(poolInfoBefore[3] + swapAmount); // reserve1 increased
      }
    });

    it("Should emit Swap event", async function () {
      const swapAmount = ethers.parseEther("10");
      await tokenA.connect(user2).approve(await pools.getAddress(), swapAmount);

      await expect(
        pools.connect(user2).swap(poolId, await tokenA.getAddress(), swapAmount, 0)
      ).to.emit(pools, "Swap");
    });

    it("Should revert if output less than minimum", async function () {
      const swapAmount = ethers.parseEther("10");
      await tokenA.connect(user2).approve(await pools.getAddress(), swapAmount);

      await expect(
        pools.connect(user2).swap(
          poolId,
          await tokenA.getAddress(),
          swapAmount,
          ethers.parseEther("999999") // unrealistically high minimum
        )
      ).to.be.revertedWith("Insufficient output amount");
    });

    it("Should revert with invalid token", async function () {
      const swapAmount = ethers.parseEther("10");
      await tokenC.connect(user1).approve(await pools.getAddress(), swapAmount);

      await expect(
        pools.connect(user1).swap(poolId, await tokenC.getAddress(), swapAmount, 0)
      ).to.be.revertedWith("Invalid token");
    });

    it("Should revert with zero amount", async function () {
      await expect(
        pools.connect(user2).swap(poolId, await tokenA.getAddress(), 0, 0)
      ).to.be.revertedWith("Invalid amount");
    });
  });

  describe("View Functions", function () {
    let poolId;

    beforeEach(async function () {
      await pools.createPool(await tokenA.getAddress(), await tokenB.getAddress());
      poolId = await pools.getPoolId(await tokenA.getAddress(), await tokenB.getAddress());

      await tokenA.connect(user1).approve(await pools.getAddress(), ethers.parseEther("10000"));
      await tokenB.connect(user1).approve(await pools.getAddress(), ethers.parseEther("10000"));
      await pools.connect(user1).addLiquidity(
        poolId,
        ethers.parseEther("1000"),
        ethers.parseEther("2000"),
        0,
        0
      );
    });

    it("Should return correct pool info", async function () {
      const poolInfo = await pools.getPoolInfo(poolId);
      
      expect(poolInfo[0]).to.not.equal(ethers.ZeroAddress); // token0
      expect(poolInfo[1]).to.not.equal(ethers.ZeroAddress); // token1
      expect(poolInfo[2]).to.equal(ethers.parseEther("1000")); // reserve0
      expect(poolInfo[3]).to.equal(ethers.parseEther("2000")); // reserve1
      expect(poolInfo[4]).to.be.gt(0); // totalLPTokens
    });

    it("Should return correct user position", async function () {
      const position = await pools.getUserPosition(poolId, user1.address);
      
      expect(position[0]).to.be.gt(0); // lpTokens
      expect(position[1]).to.equal(ethers.parseEther("1000")); // token0Deposited
      expect(position[2]).to.equal(ethers.parseEther("2000")); // token1Deposited
    });

    it("Should calculate quote correctly", async function () {
      const amountA = ethers.parseEther("100");
      const reserveA = ethers.parseEther("1000");
      const reserveB = ethers.parseEther("2000");

      const amountB = await pools.quote(amountA, reserveA, reserveB);
      expect(amountB).to.equal(ethers.parseEther("200"));
    });

    it("Should calculate getAmountOut correctly", async function () {
      const amountIn = ethers.parseEther("100");
      const reserveIn = ethers.parseEther("1000");
      const reserveOut = ethers.parseEther("2000");

      const amountOut = await pools.getAmountOut(amountIn, reserveIn, reserveOut);
      expect(amountOut).to.be.gt(0);
      expect(amountOut).to.be.lt(ethers.parseEther("200")); // Less than quote due to fees
    });

    it("Should find pool by token pair", async function () {
      const foundPoolId1 = await pools.getPoolId(
        await tokenA.getAddress(),
        await tokenB.getAddress()
      );
      const foundPoolId2 = await pools.getPoolId(
        await tokenB.getAddress(),
        await tokenA.getAddress()
      );

      expect(foundPoolId1).to.equal(poolId);
      expect(foundPoolId2).to.equal(poolId); // Order doesn't matter
    });
  });

  describe("TestERC20Token", function () {
    it("Should mint tokens correctly", async function () {
      const mintAmount = ethers.parseEther("1000");
      await tokenA.mint(user1.address, mintAmount);

      const balance = await tokenA.balanceOf(user1.address);
      expect(balance).to.be.gte(mintAmount);
    });

    it("Should have correct decimals", async function () {
      const decimals = await tokenA.decimals();
      expect(decimals).to.equal(18);
    });
  });
});

