import { useAccount, useChainId, useSwitchChain, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useState } from "react";
import { POOLS_ADDRESS, POOLS_ABI, TOKEN_ADDRESSES, ERC20_ABI } from "../config";
import { parseUnits } from "viem";

export default function AddLiquidity() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const [poolId, setPoolId] = useState("0");
  const [amount0, setAmount0] = useState("");
  const [amount1, setAmount1] = useState("");
  const [step, setStep] = useState("mint"); // mint, approve0, approve1, add
  const [mintToken, setMintToken] = useState("tUSDC");
  const [mintAmount, setMintAmount] = useState("100");

  // Testnet-friendly token values (different ratios for realistic simulation)
  const tokenPrices = {
    tUSDC: 1,      // Base: 1 (stablecoin)
    tUSDT: 1,      // Base: 1 (stablecoin)
    tDAI: 1,       // Base: 1 (stablecoin)
    tWETH: 3,      // 3x stablecoins
    tWBTC: 20,     // 20x stablecoins (most valuable)
    tLINK: 0.5,    // 0.5x stablecoins
    tUNI: 0.3,     // 0.3x stablecoins
    tAAVE: 2,      // 2x stablecoins
    tCRV: 0.1,     // 0.1x stablecoins (cheapest)
    tMKR: 5,       // 5x stablecoins
  };

  const DEFAULT_GAS_LIMIT = 500_000n; // Gas limit for transactions

  const tokenList = Object.keys(TOKEN_ADDRESSES);

  // Get pool tokens for realistic liquidity calculations
  const poolTokenPairs = [
    { id: 0, token0: "tUSDC", token1: "tUSDT" },
    { id: 1, token0: "tWETH", token1: "tUSDC" },
    { id: 2, token0: "tWBTC", token1: "tWETH" },
    { id: 3, token0: "tLINK", token1: "tUSDC" },
    { id: 4, token0: "tUNI", token1: "tWETH" },
    { id: 5, token0: "tAAVE", token1: "tUSDC" },
    { id: 6, token0: "tCRV", token1: "tUSDC" },
    { id: 7, token0: "tMKR", token1: "tWETH" },
    { id: 8, token0: "tDAI", token1: "tUSDC" },
    { id: 9, token0: "tLINK", token1: "tWETH" },
  ];

  const currentPool = poolTokenPairs.find(p => p.id === parseInt(poolId)) || poolTokenPairs[0];

  // Calculate realistic amounts based on token prices
  const calculateRealisticAmount = (tokenSymbol, usdValue) => {
    const price = tokenPrices[tokenSymbol] || 1;
    return (usdValue / price).toFixed(6);
  };

  // Suggest realistic liquidity based on pool
  const getSuggestedLiquidity = () => {
    const usdValue = 100; // 100 units worth of liquidity (testnet-friendly)
    const amt0 = calculateRealisticAmount(currentPool.token0, usdValue / 2);
    const amt1 = calculateRealisticAmount(currentPool.token1, usdValue / 2);
    return { amt0, amt1 };
  };

  const handleMint = async () => {
    if (chainId !== 5003) {
      switchChain?.({ chainId: 5003 });
      return;
    }

    try {
      const tokenAddress = TOKEN_ADDRESSES[mintToken];
      const decimals = 18; // All test tokens use 18 decimals
      const amount = parseUnits(mintAmount, decimals);

      writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "mint",
        args: [address, amount],
      });
    } catch (err) {
      console.error("Mint error:", err);
    }
  };

  const handleApprove = async (tokenSymbol) => {
    if (chainId !== 5003) {
      switchChain?.({ chainId: 5003 });
      return;
    }

    try {
      const tokenAddress = TOKEN_ADDRESSES[tokenSymbol];
      const amount = parseUnits("999999999999", 18); // Approve large amount

      writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [POOLS_ADDRESS, amount],
      });
    } catch (err) {
      console.error("Approve error:", err);
    }
  };

  const handleAddLiquidity = async () => {
    if (chainId !== 5003) {
      switchChain?.({ chainId: 5003 });
      return;
    }

    try {
      const decimals = 18;
      const amt0 = parseUnits(amount0, decimals);
      const amt1 = parseUnits(amount1, decimals);
      const min0 = (amt0 * 95n) / 100n; // 5% slippage
      const min1 = (amt1 * 95n) / 100n;

      writeContract({
        address: POOLS_ADDRESS,
        abi: POOLS_ABI,
        functionName: "addLiquidity",
        args: [BigInt(poolId), amt0, amt1, min0, min1],
      });
    } catch (err) {
      console.error("Add liquidity error:", err);
    }
  };

  const useSuggestedAmounts = () => {
    const suggested = getSuggestedLiquidity();
    setAmount0(suggested.amt0);
    setAmount1(suggested.amt1);
  };

  if (!isConnected) {
    return <div style={styles.warning}>Connect wallet to add liquidity</div>;
  }

  if (chainId !== 5003) {
    return (
      <div style={styles.warning}>
        Please switch to Mantle Sepolia
        <button onClick={() => switchChain?.({ chainId: 5003 })} style={styles.button}>
          Switch Network
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.infoBox}>
        <h4>💡 Testnet-Friendly Token Values</h4>
        <p>Each token has a different value for realistic swap simulation:</p>
        <ul style={styles.priceList}>
          {Object.entries(tokenPrices).map(([token, price]) => (
            <li key={token}>
              <strong>{token}</strong>: {price}x
            </li>
          ))}
        </ul>
        <p style={{ fontSize: "12px", marginTop: "10px", color: "#666" }}>
          Example: 1 tWBTC (20x) = 20 tUSDC (1x) = 200 tCRV (0.1x)
        </p>
      </div>

      <div style={styles.steps}>
        <div style={{ ...styles.stepTab, ...(step === "mint" && styles.activeStep) }} onClick={() => setStep("mint")}>
          1. Mint Tokens
        </div>
        <div style={{ ...styles.stepTab, ...(step === "approve" && styles.activeStep) }} onClick={() => setStep("approve")}>
          2. Approve
        </div>
        <div style={{ ...styles.stepTab, ...(step === "add" && styles.activeStep) }} onClick={() => setStep("add")}>
          3. Add Liquidity
        </div>
      </div>

      {step === "mint" && (
        <div style={styles.form}>
          <h3>Step 1: Mint Test Tokens</h3>
          <p style={styles.hint}>Mint small amounts for testnet - different values per token</p>
          
          <div style={styles.field}>
            <label>Token:</label>
            <select value={mintToken} onChange={(e) => setMintToken(e.target.value)} style={styles.input}>
              {tokenList.map((token) => (
                <option key={token} value={token}>
                  {token} ({tokenPrices[token]}x value)
                </option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label>Amount:</label>
            <input
              type="text"
              value={mintAmount}
              onChange={(e) => setMintAmount(e.target.value)}
              placeholder="100"
              style={styles.input}
            />
            <small style={styles.hint}>
              Value: {(parseFloat(mintAmount || 0) * tokenPrices[mintToken]).toFixed(2)} units
            </small>
          </div>

          <button onClick={handleMint} disabled={isPending || isConfirming} style={styles.button}>
            {isPending ? "Confirming..." : isConfirming ? "Minting..." : "Mint Tokens"}
          </button>

          {isConfirmed && (
            <div style={styles.success}>
              <strong>✅ Tokens Minted Successfully!</strong>
              <div style={{ marginTop: "10px", fontSize: "13px" }}>
                <p style={{ margin: "5px 0" }}>
                  <strong>Your Address:</strong>{" "}
                  <a 
                    href={`https://explorer.sepolia.mantle.xyz/address/${address}`} 
                    target="_blank" 
                    rel="noreferrer"
                    style={styles.link}
                  >
                    {address}
                  </a>
                </p>
                <p style={{ margin: "5px 0" }}>
                  <strong>Token ({mintToken}):</strong>{" "}
                  <a 
                    href={`https://explorer.sepolia.mantle.xyz/address/${TOKEN_ADDRESSES[mintToken]}`} 
                    target="_blank" 
                    rel="noreferrer"
                    style={styles.link}
                  >
                    {TOKEN_ADDRESSES[mintToken]}
                  </a>
                </p>
                <p style={{ margin: "5px 0" }}>
                  <strong>Transaction:</strong>{" "}
                  <a 
                    href={`https://explorer.sepolia.mantle.xyz/tx/${hash}`} 
                    target="_blank" 
                    rel="noreferrer"
                    style={styles.link}
                  >
                    {hash}
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {step === "approve" && (
        <div style={styles.form}>
          <h3>Step 2: Approve Token Spending</h3>
          <p style={styles.hint}>Allow the pools contract to spend your tokens</p>
          
          <div style={styles.field}>
            <label>Select tokens to approve:</label>
            <div style={styles.tokenGrid}>
              {tokenList.map((token) => (
                <button
                  key={token}
                  onClick={() => handleApprove(token)}
                  disabled={isPending || isConfirming}
                  style={styles.tokenButton}
                >
                  Approve {token}
                </button>
              ))}
            </div>
          </div>

          {isConfirmed && (
            <div style={styles.success}>
              <strong>✅ Token Approved Successfully!</strong>
              <div style={{ marginTop: "10px", fontSize: "13px" }}>
                <p style={{ margin: "5px 0" }}>
                  <strong>Your Address:</strong>{" "}
                  <a 
                    href={`https://explorer.sepolia.mantle.xyz/address/${address}`} 
                    target="_blank" 
                    rel="noreferrer"
                    style={styles.link}
                  >
                    {address}
                  </a>
                </p>
                <p style={{ margin: "5px 0" }}>
                  <strong>Approved for Pool Contract:</strong>{" "}
                  <a 
                    href={`https://explorer.sepolia.mantle.xyz/address/${POOLS_ADDRESS}`} 
                    target="_blank" 
                    rel="noreferrer"
                    style={styles.link}
                  >
                    {POOLS_ADDRESS}
                  </a>
                </p>
                <p style={{ margin: "5px 0" }}>
                  <strong>Transaction:</strong>{" "}
                  <a 
                    href={`https://explorer.sepolia.mantle.xyz/tx/${hash}`} 
                    target="_blank" 
                    rel="noreferrer"
                    style={styles.link}
                  >
                    {hash}
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {step === "add" && (
        <div style={styles.form}>
          <h3>Step 3: Add Liquidity to Pool</h3>
          <p style={styles.hint}>Deposit tokens with matching value ratios for proper simulation</p>
          
          <div style={styles.field}>
            <label>Pool ID:</label>
            <select value={poolId} onChange={(e) => setPoolId(e.target.value)} style={styles.input}>
              {poolTokenPairs.map((pool) => (
                <option key={pool.id} value={pool.id}>
                  Pool {pool.id}: {pool.token0}/{pool.token1}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.realisticBox}>
            <strong>Selected Pool: {currentPool.token0}/{currentPool.token1}</strong>
            <p style={styles.hint}>
              Price Ratio: 1 {currentPool.token0} = {(tokenPrices[currentPool.token0] / tokenPrices[currentPool.token1]).toFixed(4)} {currentPool.token1}
            </p>
            <button onClick={useSuggestedAmounts} style={styles.suggestButton}>
              Use Suggested Amounts (100 units liquidity)
            </button>
          </div>

          <div style={styles.field}>
            <label>{currentPool.token0} Amount:</label>
            <input
              type="text"
              value={amount0}
              onChange={(e) => setAmount0(e.target.value)}
              placeholder="50"
              style={styles.input}
            />
            <small style={styles.hint}>
              Value: {(parseFloat(amount0 || 0) * tokenPrices[currentPool.token0]).toFixed(2)} units
            </small>
          </div>

          <div style={styles.field}>
            <label>{currentPool.token1} Amount:</label>
            <input
              type="text"
              value={amount1}
              onChange={(e) => setAmount1(e.target.value)}
              placeholder="50"
              style={styles.input}
            />
            <small style={styles.hint}>
              Value: {(parseFloat(amount1 || 0) * tokenPrices[currentPool.token1]).toFixed(2)} units
            </small>
          </div>

          <div style={styles.totalValue}>
            <strong>Total Liquidity Value: </strong>
            {((parseFloat(amount0 || 0) * tokenPrices[currentPool.token0]) + 
                (parseFloat(amount1 || 0) * tokenPrices[currentPool.token1])).toFixed(2)} units
          </div>

          <button onClick={handleAddLiquidity} disabled={isPending || isConfirming || !amount0 || !amount1} style={styles.button}>
            {isPending ? "Confirming..." : isConfirming ? "Adding Liquidity..." : "Add Liquidity"}
          </button>

          {isConfirmed && (
            <div style={styles.success}>
              <strong>✅ Liquidity Added Successfully!</strong>
              <div style={{ marginTop: "10px", fontSize: "13px" }}>
                <p style={{ margin: "5px 0" }}>
                  <strong>Your Address:</strong>{" "}
                  <a 
                    href={`https://explorer.sepolia.mantle.xyz/address/${address}`} 
                    target="_blank" 
                    rel="noreferrer"
                    style={styles.link}
                  >
                    {address}
                  </a>
                </p>
                <p style={{ margin: "5px 0" }}>
                  <strong>Pool Contract:</strong>{" "}
                  <a 
                    href={`https://explorer.sepolia.mantle.xyz/address/${POOLS_ADDRESS}`} 
                    target="_blank" 
                    rel="noreferrer"
                    style={styles.link}
                  >
                    {POOLS_ADDRESS}
                  </a>
                </p>
                <p style={{ margin: "5px 0" }}>
                  <strong>Pool ID:</strong> {poolId}
                </p>
                <p style={{ margin: "5px 0" }}>
                  <strong>Transaction:</strong>{" "}
                  <a 
                    href={`https://explorer.sepolia.mantle.xyz/tx/${hash}`} 
                    target="_blank" 
                    rel="noreferrer"
                    style={styles.link}
                  >
                    {hash}
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {writeError && (
        <div style={styles.error}>
          Error: {writeError.message?.slice(0, 150)}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "20px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    backgroundColor: "#fafafa",
  },
  infoBox: {
    padding: "15px",
    backgroundColor: "#e3f2fd",
    border: "1px solid #2196f3",
    borderRadius: "6px",
    marginBottom: "20px",
  },
  priceList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: "8px",
    fontSize: "13px",
    marginTop: "10px",
  },
  steps: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
  },
  stepTab: {
    flex: 1,
    padding: "10px",
    textAlign: "center",
    border: "1px solid #ccc",
    borderRadius: "4px",
    cursor: "pointer",
    backgroundColor: "#fff",
    transition: "all 0.3s",
  },
  activeStep: {
    backgroundColor: "#007bff",
    color: "white",
    fontWeight: "bold",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  input: {
    padding: "10px",
    fontSize: "14px",
    border: "1px solid #ccc",
    borderRadius: "4px",
  },
  button: {
    padding: "12px",
    fontSize: "16px",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  suggestButton: {
    padding: "8px 12px",
    fontSize: "14px",
    backgroundColor: "#17a2b8",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    marginTop: "8px",
  },
  tokenGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
    gap: "10px",
  },
  tokenButton: {
    padding: "10px",
    fontSize: "14px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  realisticBox: {
    padding: "12px",
    backgroundColor: "#fff3cd",
    border: "1px solid #ffc107",
    borderRadius: "4px",
  },
  totalValue: {
    padding: "10px",
    backgroundColor: "#d4edda",
    border: "1px solid #c3e6cb",
    borderRadius: "4px",
    fontSize: "16px",
  },
  warning: {
    padding: "15px",
    backgroundColor: "#fff3cd",
    border: "1px solid #ffc107",
    borderRadius: "4px",
    color: "#856404",
  },
  success: {
    padding: "10px",
    backgroundColor: "#d4edda",
    border: "1px solid #c3e6cb",
    borderRadius: "4px",
    color: "#155724",
    fontSize: "14px",
    wordBreak: "break-all",
  },
  link: {
    color: "#0056b3",
    textDecoration: "underline",
    fontSize: "13px",
  },
  error: {
    padding: "10px",
    backgroundColor: "#f8d7da",
    border: "1px solid #f5c6cb",
    borderRadius: "4px",
    color: "#721c24",
  },
  hint: {
    fontSize: "13px",
    color: "#666",
  },
};
