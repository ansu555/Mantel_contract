// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MultiTokenLiquidityPools
 * @notice Simple AMM-style pool manager for Mantle Sepolia test tokens
 * @dev Supports creating pools, adding/removing liquidity, and swapping.
 * @dev Uses SafeERC20 patterns for L2 compatibility (Mantle Network)
 */
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

/**
 * @title SafeERC20
 * @dev Wrapper library for ERC20 operations that handles non-standard tokens
 * and provides proper error handling for L2 networks like Mantle
 */
library SafeERC20 {
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeWithSelector(token.transfer.selector, to, value));
    }

    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeWithSelector(token.transferFrom.selector, from, to, value));
    }

    function safeApprove(IERC20 token, address spender, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeWithSelector(token.approve.selector, spender, value));
    }

    function _callOptionalReturn(IERC20 token, bytes memory data) private {
        (bool success, bytes memory returndata) = address(token).call(data);
        require(success, "SafeERC20: low-level call failed");
        
        if (returndata.length > 0) {
            require(abi.decode(returndata, (bool)), "SafeERC20: ERC20 operation failed");
        }
    }
}

contract MultiTokenLiquidityPools {
    using SafeERC20 for IERC20;

    struct Pool {
        address token0;
        address token1;
        uint256 reserve0;
        uint256 reserve1;
        uint256 totalLPTokens;
        bool exists;
    }

    struct LPPosition {
        uint256 lpTokens;
        uint256 token0Deposited;
        uint256 token1Deposited;
    }

    address public owner;
    uint256 public poolCount;
    uint256 public constant FEE_PERCENT = 3; // 0.3%
    uint256 public constant FEE_DENOMINATOR = 1000;

    mapping(uint256 => Pool) public pools;
    mapping(uint256 => mapping(address => LPPosition)) public lpPositions;
    // pairToPoolId stores poolId+1 so that zero means "unset".
    mapping(address => mapping(address => uint256)) public pairToPoolId;

    event PoolCreated(uint256 indexed poolId, address indexed token0, address indexed token1);
    event LiquidityAdded(uint256 indexed poolId, address indexed provider, uint256 amount0, uint256 amount1, uint256 lpTokens);
    event LiquidityRemoved(uint256 indexed poolId, address indexed provider, uint256 amount0, uint256 amount1, uint256 lpTokens);
    event Swap(uint256 indexed poolId, address indexed user, address tokenIn, uint256 amountIn, uint256 amountOut);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier poolExists(uint256 poolId) {
        require(poolId < poolCount && pools[poolId].exists, "Pool does not exist");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function createPool(address token0, address token1) external returns (uint256 poolId) {
        require(token0 != address(0) && token1 != address(0), "Invalid token address");
        require(token0 != token1, "Identical tokens");

        (address _token0, address _token1) = token0 < token1 ? (token0, token1) : (token1, token0);
        require(pairToPoolId[_token0][_token1] == 0, "Pool already exists");

        poolId = poolCount;
        pools[poolId] = Pool({
            token0: _token0,
            token1: _token1,
            reserve0: 0,
            reserve1: 0,
            totalLPTokens: 0,
            exists: true
        });

        // store poolId+1 as sentinel to differentiate from default zero
        pairToPoolId[_token0][_token1] = poolId + 1;
        pairToPoolId[_token1][_token0] = poolId + 1;
        poolCount++;

        emit PoolCreated(poolId, _token0, _token1);
    }

    function addLiquidity(
        uint256 poolId,
        uint256 amount0Desired,
        uint256 amount1Desired,
        uint256 amount0Min,
        uint256 amount1Min
    ) external poolExists(poolId) returns (uint256 amount0, uint256 amount1, uint256 lpTokens) {
        Pool storage pool = pools[poolId];

        if (pool.reserve0 == 0 && pool.reserve1 == 0) {
            amount0 = amount0Desired;
            amount1 = amount1Desired;
            lpTokens = sqrt(amount0 * amount1);
        } else {
            uint256 amount1Optimal = quote(amount0Desired, pool.reserve0, pool.reserve1);
            if (amount1Optimal <= amount1Desired) {
                require(amount1Optimal >= amount1Min, "Insufficient token1 amount");
                amount0 = amount0Desired;
                amount1 = amount1Optimal;
            } else {
                uint256 amount0Optimal = quote(amount1Desired, pool.reserve1, pool.reserve0);
                require(amount0Optimal <= amount0Desired && amount0Optimal >= amount0Min, "Insufficient token0 amount");
                amount0 = amount0Optimal;
                amount1 = amount1Desired;
            }
            lpTokens = min((amount0 * pool.totalLPTokens) / pool.reserve0, (amount1 * pool.totalLPTokens) / pool.reserve1);
        }

        require(lpTokens > 0, "Insufficient liquidity minted");

        IERC20(pool.token0).safeTransferFrom(msg.sender, address(this), amount0);
        IERC20(pool.token1).safeTransferFrom(msg.sender, address(this), amount1);

        pool.reserve0 += amount0;
        pool.reserve1 += amount1;
        pool.totalLPTokens += lpTokens;

        LPPosition storage position = lpPositions[poolId][msg.sender];
        position.lpTokens += lpTokens;
        position.token0Deposited += amount0;
        position.token1Deposited += amount1;

        emit LiquidityAdded(poolId, msg.sender, amount0, amount1, lpTokens);
    }

    function removeLiquidity(
        uint256 poolId,
        uint256 lpTokens,
        uint256 amount0Min,
        uint256 amount1Min
    ) external poolExists(poolId) returns (uint256 amount0, uint256 amount1) {
        Pool storage pool = pools[poolId];
        LPPosition storage position = lpPositions[poolId][msg.sender];

        require(lpTokens > 0 && position.lpTokens >= lpTokens, "Insufficient LP tokens");

        amount0 = (lpTokens * pool.reserve0) / pool.totalLPTokens;
        amount1 = (lpTokens * pool.reserve1) / pool.totalLPTokens;

        require(amount0 >= amount0Min && amount1 >= amount1Min, "Insufficient output amount");

        position.lpTokens -= lpTokens;
        pool.totalLPTokens -= lpTokens;
        pool.reserve0 -= amount0;
        pool.reserve1 -= amount1;

        IERC20(pool.token0).safeTransfer(msg.sender, amount0);
        IERC20(pool.token1).safeTransfer(msg.sender, amount1);

        emit LiquidityRemoved(poolId, msg.sender, amount0, amount1, lpTokens);
    }

    function swap(
        uint256 poolId,
        address tokenIn,
        uint256 amountIn,
        uint256 amountOutMin
    ) external poolExists(poolId) returns (uint256 amountOut) {
        Pool storage pool = pools[poolId];
        require(tokenIn == pool.token0 || tokenIn == pool.token1, "Invalid token");
        require(amountIn > 0, "Invalid amount");

        bool isToken0 = tokenIn == pool.token0;
        (uint256 reserveIn, uint256 reserveOut) = isToken0 ? (pool.reserve0, pool.reserve1) : (pool.reserve1, pool.reserve0);

        uint256 amountInWithFee = amountIn * (FEE_DENOMINATOR - FEE_PERCENT);
        amountOut = (amountInWithFee * reserveOut) / (reserveIn * FEE_DENOMINATOR + amountInWithFee);

        require(amountOut >= amountOutMin, "Insufficient output amount");
        require(amountOut < reserveOut, "Insufficient liquidity");

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        address tokenOut = isToken0 ? pool.token1 : pool.token0;
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        if (isToken0) {
            pool.reserve0 += amountIn;
            pool.reserve1 -= amountOut;
        } else {
            pool.reserve1 += amountIn;
            pool.reserve0 -= amountOut;
        }

        emit Swap(poolId, msg.sender, tokenIn, amountIn, amountOut);
    }

    function quote(uint256 amountA, uint256 reserveA, uint256 reserveB) public pure returns (uint256 amountB) {
        require(amountA > 0, "Insufficient amount");
        require(reserveA > 0 && reserveB > 0, "Insufficient liquidity");
        amountB = (amountA * reserveB) / reserveA;
    }

    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) public pure returns (uint256 amountOut) {
        require(amountIn > 0, "Insufficient input amount");
        require(reserveIn > 0 && reserveOut > 0, "Insufficient liquidity");
        uint256 amountInWithFee = amountIn * (FEE_DENOMINATOR - FEE_PERCENT);
        amountOut = (amountInWithFee * reserveOut) / (reserveIn * FEE_DENOMINATOR + amountInWithFee);
    }

    function getPoolInfo(uint256 poolId)
        external
        view
        poolExists(poolId)
        returns (address token0, address token1, uint256 reserve0, uint256 reserve1, uint256 totalLPTokens)
    {
        Pool memory pool = pools[poolId];
        return (pool.token0, pool.token1, pool.reserve0, pool.reserve1, pool.totalLPTokens);
    }

    function getUserPosition(uint256 poolId, address user)
        external
        view
        poolExists(poolId)
        returns (uint256 lpTokens, uint256 token0Deposited, uint256 token1Deposited)
    {
        LPPosition memory position = lpPositions[poolId][user];
        return (position.lpTokens, position.token0Deposited, position.token1Deposited);
    }

    function getPoolId(address token0, address token1) external view returns (uint256) {
        uint256 stored = pairToPoolId[token0][token1];
        if (stored == 0) {
            stored = pairToPoolId[token1][token0];
        }
        // Note: Returns 0 both when pool not found AND when pool ID is 0
        // Use hasPool() to check if a pool actually exists
        if (stored == 0) {
            return 0;
        }
        return stored - 1;
    }

    /**
     * @notice Check if a pool exists for a token pair
     * @param token0 First token address
     * @param token1 Second token address
     * @return exists True if pool exists, false otherwise
     */
    function hasPool(address token0, address token1) external view returns (bool exists) {
        uint256 stored = pairToPoolId[token0][token1];
        if (stored == 0) {
            stored = pairToPoolId[token1][token0];
        }
        return stored > 0;
    }

    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function min(uint256 x, uint256 y) internal pure returns (uint256) {
        return x < y ? x : y;
    }
}

contract TestERC20Token is IERC20 {
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    uint256 private _totalSupply;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    constructor(string memory _name, string memory _symbol, uint256 initialSupply) {
        name = _name;
        symbol = _symbol;
        _totalSupply = initialSupply * 10 ** decimals;
        _balances[msg.sender] = _totalSupply;
        emit Transfer(address(0), msg.sender, _totalSupply);
    }

    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view override returns (uint256) {
        return _balances[account];
    }

    function transfer(address recipient, uint256 amount) external override returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    function allowance(address owner, address spender) external view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) external override returns (bool) {
        _transfer(sender, recipient, amount);
        uint256 currentAllowance = _allowances[sender][msg.sender];
        require(currentAllowance >= amount, "Transfer amount exceeds allowance");
        unchecked {
            _approve(sender, msg.sender, currentAllowance - amount);
        }
        return true;
    }

    function mint(address to, uint256 amount) external {
        _totalSupply += amount;
        _balances[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function _transfer(address sender, address recipient, uint256 amount) internal {
        require(sender != address(0), "Transfer from zero address");
        require(recipient != address(0), "Transfer to zero address");
        require(_balances[sender] >= amount, "Transfer amount exceeds balance");
        unchecked {
            _balances[sender] -= amount;
            _balances[recipient] += amount;
        }
        emit Transfer(sender, recipient, amount);
    }

    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "Approve from zero address");
        require(spender != address(0), "Approve to zero address");
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
}
