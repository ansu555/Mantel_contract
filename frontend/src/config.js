// Contract addresses (update after deployment)
export const POOLS_ADDRESS = "0x5FbDB2315678afccb333f8a9c21881ea45fcac11e"; // Replace with your deployed address
export const TOKEN_ADDRESSES = {
  tUSDC: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  tUSDT: "0x9fE46736679d2D6a7aE0D512b3D38a56572605d5",
  tDAI: "0xCf7Ed3AccA5a467e9e704C703E8D87F634Fb0Fc9",
  tWETH: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
  tWBTC: "0x5FC8d32690cc91D4c39d9d3abcDAC4eda4B8f915",
  tLINK: "0x0165878A594ca255338adfa4d0221Ac926f738bF",
  tUNI: "0xa513E6E4b8Fffa85F75cEFa6D5d329139aEcE9c9",
  tAAVE: "0x2279B7a0a67DB372996a5FaB50D91eAA73d2eBe6",
  tCRV: "0x8f39AcaB32bE957fb5642Ec0E19e1e2f0e573008",
  tMKR: "0x610178dA211FEF7D417dC0F022F30d18f5803C8E",
};

// Pool ABI (minimal, covers key functions)
export const POOLS_ABI = [
  {
    inputs: [
      { internalType: "address", name: "token0", type: "address" },
      { internalType: "address", name: "token1", type: "address" },
    ],
    name: "createPool",
    outputs: [{ internalType: "uint256", name: "poolId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "poolId", type: "uint256" }],
    name: "getPoolInfo",
    outputs: [
      { internalType: "address", name: "token0", type: "address" },
      { internalType: "address", name: "token1", type: "address" },
      { internalType: "uint256", name: "reserve0", type: "uint256" },
      { internalType: "uint256", name: "reserve1", type: "uint256" },
      { internalType: "uint256", name: "totalLPTokens", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "poolId", type: "uint256" },
      { internalType: "address", name: "token0", type: "address" },
      { internalType: "address", name: "token1", type: "address" },
    ],
    name: "addLiquidity",
    outputs: [
      { internalType: "uint256", name: "amount0", type: "uint256" },
      { internalType: "uint256", name: "amount1", type: "uint256" },
      { internalType: "uint256", name: "lpTokens", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "poolId", type: "uint256" },
      { internalType: "uint256", name: "lpTokens", type: "uint256" },
      { internalType: "uint256", name: "amount0Min", type: "uint256" },
      { internalType: "uint256", name: "amount1Min", type: "uint256" },
    ],
    name: "removeLiquidity",
    outputs: [
      { internalType: "uint256", name: "amount0", type: "uint256" },
      { internalType: "uint256", name: "amount1", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "poolId", type: "uint256" },
      { internalType: "address", name: "tokenIn", type: "address" },
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "uint256", name: "amountOutMin", type: "uint256" },
    ],
    name: "swap",
    outputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "poolId", type: "uint256" },
      { internalType: "address", name: "user", type: "address" },
    ],
    name: "getUserPosition",
    outputs: [
      { internalType: "uint256", name: "lpTokens", type: "uint256" },
      { internalType: "uint256", name: "token0Deposited", type: "uint256" },
      { internalType: "uint256", name: "token1Deposited", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token0", type: "address" },
      { internalType: "address", name: "token1", type: "address" },
    ],
    name: "getPoolId",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "poolCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

// ERC20 ABI (minimal)
export const ERC20_ABI = [
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "spender", type: "address" }, { internalType: "uint256", name: "amount", type: "uint256" }],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
];

export const MANTLE_SEPOLIA = {
  id: 5003,
  name: "Mantle Sepolia",
  network: "mantle-sepolia",
  nativeCurrency: { name: "MNT", symbol: "MNT", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://rpc.sepolia.mantle.xyz"],
    },
    public: {
      http: ["https://rpc.sepolia.mantle.xyz"],
    },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://explorer.sepolia.mantle.xyz" },
  },
};
