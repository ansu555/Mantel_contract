// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MultiHopSwapRouter
 * @notice Enables multi-hop token swaps across multiple liquidity pools on Mantle Network
 */

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface ILiquidityPool {
    function swap(
        uint256 poolId,
        address tokenIn,
        uint256 amountIn,
        uint256 amountOutMin
    ) external returns (uint256 amountOut);
    
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) external pure returns (uint256 amountOut);
    
    function getPoolInfo(uint256 poolId) external view returns (
        address token0,
        address token1,
        uint256 reserve0,
        uint256 reserve1,
        uint256 totalLPTokens
    );
    
    function getPoolId(address token0, address token1) external view returns (uint256);
}

contract MultiHopSwapRouter {
    
    ILiquidityPool public immutable poolContract;
    
    event SingleHopSwap(
        address indexed user,
        uint256 indexed poolId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    
    event TwoHopSwap(
        address indexed user,
        address tokenIn,
        address tokenIntermediate,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    
    event ThreeHopSwap(
        address indexed user,
        address tokenIn,
        address tokenIntermediate1,
        address tokenIntermediate2,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    
    error InvalidPoolContract();
    error InvalidAmount();
    error InsufficientOutput();
    error PoolNotFound();
    error TransferFailed();
    
    constructor(address _poolContract) {
        if (_poolContract == address(0)) revert InvalidPoolContract();
        poolContract = ILiquidityPool(_poolContract);
    }
    
    function swapSingleHop(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address receiver
    ) external returns (uint256 amountOut) {
        if (amountIn == 0) revert InvalidAmount();
        
        uint256 poolId = poolContract.getPoolId(tokenIn, tokenOut);
        if (poolId == 0) revert PoolNotFound();
        
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(poolContract), amountIn);
        
        amountOut = poolContract.swap(poolId, tokenIn, amountIn, minAmountOut);
        
        if (amountOut < minAmountOut) revert InsufficientOutput();
        
        IERC20(tokenOut).transfer(receiver, amountOut);
        
        emit SingleHopSwap(msg.sender, poolId, tokenIn, tokenOut, amountIn, amountOut);
    }
    
    function swapTwoHop(
        address tokenIn,
        address tokenIntermediate,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address receiver
    ) external returns (uint256 finalAmountOut) {
        if (amountIn == 0) revert InvalidAmount();
        
        uint256 poolId1 = poolContract.getPoolId(tokenIn, tokenIntermediate);
        uint256 poolId2 = poolContract.getPoolId(tokenIntermediate, tokenOut);
        if (poolId1 == 0 || poolId2 == 0) revert PoolNotFound();
        
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        IERC20(tokenIn).approve(address(poolContract), amountIn);
        uint256 intermediateAmount = poolContract.swap(poolId1, tokenIn, amountIn, 0);
        
        IERC20(tokenIntermediate).approve(address(poolContract), intermediateAmount);
        finalAmountOut = poolContract.swap(poolId2, tokenIntermediate, intermediateAmount, minAmountOut);
        
        if (finalAmountOut < minAmountOut) revert InsufficientOutput();
        
        IERC20(tokenOut).transfer(receiver, finalAmountOut);
        
        emit TwoHopSwap(msg.sender, tokenIn, tokenIntermediate, tokenOut, amountIn, finalAmountOut);
    }
    
    function swapThreeHop(
        address tokenIn,
        address tokenIntermediate1,
        address tokenIntermediate2,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address receiver
    ) external returns (uint256 finalAmountOut) {
        if (amountIn == 0) revert InvalidAmount();
        
        uint256 poolId1 = poolContract.getPoolId(tokenIn, tokenIntermediate1);
        uint256 poolId2 = poolContract.getPoolId(tokenIntermediate1, tokenIntermediate2);
        uint256 poolId3 = poolContract.getPoolId(tokenIntermediate2, tokenOut);
        if (poolId1 == 0 || poolId2 == 0 || poolId3 == 0) revert PoolNotFound();
        
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        IERC20(tokenIn).approve(address(poolContract), amountIn);
        uint256 intermediate1Amount = poolContract.swap(poolId1, tokenIn, amountIn, 0);
        
        IERC20(tokenIntermediate1).approve(address(poolContract), intermediate1Amount);
        uint256 intermediate2Amount = poolContract.swap(poolId2, tokenIntermediate1, intermediate1Amount, 0);
        
        IERC20(tokenIntermediate2).approve(address(poolContract), intermediate2Amount);
        finalAmountOut = poolContract.swap(poolId3, tokenIntermediate2, intermediate2Amount, minAmountOut);
        
        if (finalAmountOut < minAmountOut) revert InsufficientOutput();
        
        IERC20(tokenOut).transfer(receiver, finalAmountOut);
        
        emit ThreeHopSwap(msg.sender, tokenIn, tokenIntermediate1, tokenIntermediate2, tokenOut, amountIn, finalAmountOut);
    }
    
    function getAmountOutTwoHop(
        address tokenIn,
        address tokenIntermediate,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 expectedOutput) {
        uint256 poolId1 = poolContract.getPoolId(tokenIn, tokenIntermediate);
        (address token0_1, address token1_1, uint256 reserve0_1, uint256 reserve1_1,) = 
            poolContract.getPoolInfo(poolId1);
        
        bool isToken0_1 = tokenIn == token0_1;
        (uint256 reserveIn1, uint256 reserveOut1) = isToken0_1 
            ? (reserve0_1, reserve1_1) 
            : (reserve1_1, reserve0_1);
        
        uint256 intermediateAmount = poolContract.getAmountOut(amountIn, reserveIn1, reserveOut1);
        
        uint256 poolId2 = poolContract.getPoolId(tokenIntermediate, tokenOut);
        (address token0_2, address token1_2, uint256 reserve0_2, uint256 reserve1_2,) = 
            poolContract.getPoolInfo(poolId2);
        
        bool isToken0_2 = tokenIntermediate == token0_2;
        (uint256 reserveIn2, uint256 reserveOut2) = isToken0_2 
            ? (reserve0_2, reserve1_2) 
            : (reserve1_2, reserve0_2);
        
        expectedOutput = poolContract.getAmountOut(intermediateAmount, reserveIn2, reserveOut2);
    }
    
    function getAmountOutThreeHop(
        address tokenIn,
        address tokenIntermediate1,
        address tokenIntermediate2,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 expectedOutput) {
        uint256 poolId1 = poolContract.getPoolId(tokenIn, tokenIntermediate1);
        (address token0_1, address token1_1, uint256 reserve0_1, uint256 reserve1_1,) = 
            poolContract.getPoolInfo(poolId1);
        bool isToken0_1 = tokenIn == token0_1;
        (uint256 reserveIn1, uint256 reserveOut1) = isToken0_1 
            ? (reserve0_1, reserve1_1) 
            : (reserve1_1, reserve0_1);
        uint256 intermediate1Amount = poolContract.getAmountOut(amountIn, reserveIn1, reserveOut1);
        
        uint256 poolId2 = poolContract.getPoolId(tokenIntermediate1, tokenIntermediate2);
        (address token0_2, address token1_2, uint256 reserve0_2, uint256 reserve1_2,) = 
            poolContract.getPoolInfo(poolId2);
        bool isToken0_2 = tokenIntermediate1 == token0_2;
        (uint256 reserveIn2, uint256 reserveOut2) = isToken0_2 
            ? (reserve0_2, reserve1_2) 
            : (reserve1_2, reserve0_2);
        uint256 intermediate2Amount = poolContract.getAmountOut(intermediate1Amount, reserveIn2, reserveOut2);
        
        uint256 poolId3 = poolContract.getPoolId(tokenIntermediate2, tokenOut);
        (address token0_3, address token1_3, uint256 reserve0_3, uint256 reserve1_3,) = 
            poolContract.getPoolInfo(poolId3);
        bool isToken0_3 = tokenIntermediate2 == token0_3;
        (uint256 reserveIn3, uint256 reserveOut3) = isToken0_3 
            ? (reserve0_3, reserve1_3) 
            : (reserve1_3, reserve0_3);
        expectedOutput = poolContract.getAmountOut(intermediate2Amount, reserveIn3, reserveOut3);
    }
    
    function recoverTokens(
        address token,
        uint256 amount,
        address recipient
    ) external {
        IERC20(token).transfer(recipient, amount);
    }
}
