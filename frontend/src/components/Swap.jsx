import { useAccount, useChainId, useSwitchChain, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { useState, useEffect } from "react";
import { POOLS_ADDRESS, POOLS_ABI, TOKEN_ADDRESSES, ERC20_ABI } from "../config";
import { parseUnits, formatUnits } from "viem";

export default function Swap() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const [poolId, setPoolId] = useState("0");
  const [tokenIn, setTokenIn] = useState("tUSDC");
  const [tokenOut, setTokenOut] = useState("tUSDT");
  const [amountIn, setAmountIn] = useState("");
  const [amountOutMin, setAmountOutMin] = useState("");
  const [estimatedOut, setEstimatedOut] = useState(null);
  const [step, setStep] = useState("approve"); // approve, swap
  const [loading, setLoading] = useState(false);

  // Token prices for realistic simulation
  const tokenPrices = {
    tUSDC: 1,
    tUSDT: 1,
    tDAI: 1,
    tWETH: 3,
    tWBTC: 20,
    tLINK: 0.5,
    tUNI: 0.3,
    tAAVE: 2,
    tCRV: 0.1,
    tMKR: 5,
  };

  const DEFAULT_GAS_LIMIT = 500_000n;
  const tokenList = Object.keys(TOKEN_ADDRESSES);

  // Pool token pairs (same as AddLiquidity)
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

  // Get available token pairs for selected pool
  const getPoolTokens = (pId) => {
    const pool = poolTokenPairs.find((p) => p.id === parseInt(pId));
    return pool ? [pool.token0, pool.token1] : ["tUSDC", "tUSDT"];
  };

  const availableTokens = getPoolTokens(poolId);

  // Auto-update tokenOut if not available in new pool
  useEffect(() => {
    const tokens = getPoolTokens(poolId);
    if (!tokens.includes(tokenOut)) {
      setTokenOut(tokens[1] || tokens[0]);
    }
    if (!tokens.includes(tokenIn)) {
      setTokenIn(tokens[0]);
    }
  }, [poolId]);

  // Estimate output amount (simple constant product formula: x*y=k)
  useEffect(() => {
    if (!amountIn || amountIn === "0") {
      setEstimatedOut(null);
      return;
    }

    // This is a rough estimation based on token prices
    // Actual output will depend on pool reserves
    const inPrice = tokenPrices[tokenIn] || 1;
    const outPrice = tokenPrices[tokenOut] || 1;
    const ratio = inPrice / outPrice;
    const estimated = (parseFloat(amountIn) * ratio * 0.997).toFixed(6); // 0.3% fee
    setEstimatedOut(estimated);
  }, [amountIn, tokenIn, tokenOut]);

  // Get token balance
  const { data: tokenBalance } = useReadContract({
    address: TOKEN_ADDRESSES[tokenIn],
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address],
    query: { enabled: isConnected && address },
  });

  // Get token allowance
  const { data: allowance } = useReadContract({
    address: TOKEN_ADDRESSES[tokenIn],
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address, POOLS_ADDRESS],
    query: { enabled: isConnected && address },
  });

  const handleApprove = async () => {
    if (!isConnected) {
      alert("Connect your wallet first");
      return;
    }

    if (!amountIn || amountIn === "0") {
      alert("Enter a valid amount");
      return;
    }

    const amount = parseUnits(amountIn, 18);

    setLoading(true);
    try {
      writeContract(
        {
          address: TOKEN_ADDRESSES[tokenIn],
          abi: ERC20_ABI,
          functionName: "approve",
          args: [POOLS_ADDRESS, amount],
          gas: DEFAULT_GAS_LIMIT,
        },
        {
          onSuccess: () => {
            setStep("swap");
            setLoading(false);
          },
          onError: () => {
            setLoading(false);
          },
        }
      );
    } catch (err) {
      console.error("Approve error:", err);
      setLoading(false);
    }
  };

  const handleSwap = async () => {
    if (!isConnected) {
      alert("Connect your wallet first");
      return;
    }

    if (!amountIn || amountIn === "0") {
      alert("Enter a valid amount");
      return;
    }

    const amountInParsed = parseUnits(amountIn, 18);
    const minOut = parseUnits(amountOutMin || "0", 18);

    setLoading(true);
    try {
      writeContract(
        {
          address: POOLS_ADDRESS,
          abi: POOLS_ABI,
          functionName: "swap",
          args: [BigInt(poolId), TOKEN_ADDRESSES[tokenIn], amountInParsed, minOut],
          gas: DEFAULT_GAS_LIMIT,
        },
        {
          onSuccess: () => {
            setStep("approve");
            setAmountIn("");
            setAmountOutMin("");
            setEstimatedOut(null);
            setLoading(false);
            alert("Swap completed successfully!");
          },
          onError: () => {
            setLoading(false);
          },
        }
      );
    } catch (err) {
      console.error("Swap error:", err);
      setLoading(false);
    }
  };

  const handleSwapTokens = () => {
    const temp = tokenIn;
    setTokenIn(tokenOut);
    setTokenOut(temp);
    setAmountIn("");
    setAmountOutMin("");
    setEstimatedOut(null);
  };

  const parsedBalance = tokenBalance ? formatUnits(tokenBalance, 18) : "0";
  const parsedAllowance = allowance ? formatUnits(allowance, 18) : "0";
  const hasEnoughAllowance = parseFloat(parsedAllowance) >= parseFloat(amountIn || "0");

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Network Warning */}
        {isConnected && chainId !== 5003 && (
          <div style={styles.warning}>
            ⚠️ Connected to wrong network. Please switch to Mantle Sepolia.
            <button onClick={() => switchChain({ chainId: 5003 })} style={styles.buttonSmall}>
              Switch Network
            </button>
          </div>
        )}

        {/* Pool Selection */}
        <div style={styles.formGroup}>
          <label style={styles.label}>Select Pool</label>
          <select value={poolId} onChange={(e) => setPoolId(e.target.value)} style={styles.select}>
            {poolTokenPairs.map((pool) => (
              <option key={pool.id} value={pool.id}>
                Pool {pool.id}: {pool.token0} ↔ {pool.token1}
              </option>
            ))}
          </select>
        </div>

        {/* Swap Interface */}
        <div style={styles.swapBox}>
          {/* Token In */}
          <div style={styles.tokenBox}>
            <div style={styles.tokenHeader}>
              <label style={styles.label}>From</label>
              <span style={styles.balance}>Balance: {parseFloat(parsedBalance).toFixed(4)} {tokenIn}</span>
            </div>
            <div style={styles.inputGroup}>
              <input
                type="number"
                placeholder="0.0"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                style={styles.input}
              />
              <select value={tokenIn} onChange={(e) => setTokenIn(e.target.value)} style={styles.tokenSelect}>
                {availableTokens.map((token) => (
                  <option key={token} value={token}>
                    {token}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Swap Direction Button */}
          <button onClick={handleSwapTokens} style={styles.swapButton} title="Swap tokens">
            ⇅
          </button>

          {/* Token Out */}
          <div style={styles.tokenBox}>
            <div style={styles.tokenHeader}>
              <label style={styles.label}>To</label>
              <span style={styles.balance}>
                Est: {estimatedOut ? parseFloat(estimatedOut).toFixed(4) : "0.0"} {tokenOut}
              </span>
            </div>
            <div style={styles.inputGroup}>
              <input type="text" placeholder="0.0" value={estimatedOut || ""} disabled style={styles.input} />
              <select value={tokenOut} onChange={(e) => setTokenOut(e.target.value)} style={styles.tokenSelect}>
                {availableTokens.map((token) => (
                  <option key={token} value={token}>
                    {token}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Min Output */}
        <div style={styles.formGroup}>
          <label style={styles.label}>Min Output (Slippage Protection)</label>
          <input
            type="number"
            placeholder="Minimum amount to receive"
            value={amountOutMin}
            onChange={(e) => setAmountOutMin(e.target.value)}
            style={styles.input}
          />
          <small style={styles.hint}>Default: 0 (no slippage protection)</small>
        </div>

        {/* Price Impact Info */}
        {amountIn && estimatedOut && (
          <div style={styles.priceInfo}>
            <p>Price: 1 {tokenIn} = {(parseFloat(estimatedOut) / parseFloat(amountIn)).toFixed(6)} {tokenOut}</p>
            <p>Fee: ~0.3% included in estimate</p>
          </div>
        )}

        {/* Status Messages */}
        {writeError && <div style={styles.error}>Error: {writeError.message}</div>}
        {isConfirmed && <div style={styles.success}>✅ Transaction confirmed!</div>}
        {isConfirming && <div style={styles.pending}>⏳ Confirming transaction...</div>}

        {/* Action Buttons */}
        <div style={styles.buttonGroup}>
          {!hasEnoughAllowance && step === "approve" ? (
            <button
              onClick={handleApprove}
              disabled={loading || !isConnected || !amountIn}
              style={{
                ...styles.button,
                ...(loading || !isConnected || !amountIn ? styles.buttonDisabled : {}),
              }}
            >
              {loading ? "Approving..." : `Approve ${tokenIn}`}
            </button>
          ) : null}

          {(hasEnoughAllowance || step === "swap") && (
            <button
              onClick={handleSwap}
              disabled={loading || !isConnected || !amountIn}
              style={{
                ...styles.button,
                ...(loading || !isConnected || !amountIn ? styles.buttonDisabled : {}),
              }}
            >
              {loading ? "Swapping..." : "Swap"}
            </button>
          )}
        </div>

        {/* Transaction Hash */}
        {hash && (
          <div style={styles.txInfo}>
            <a href={`https://explorer.sepolia.mantle.xyz/tx/${hash}`} target="_blank" rel="noreferrer">
              View Transaction →
            </a>
          </div>
        )}

        {/* Info Section */}
        <div style={styles.info}>
          <h4>ℹ️ Swap Guide</h4>
          <ul>
            <li>Select a pool with two tokens</li>
            <li>Enter the amount of token you want to swap</li>
            <li>Review the estimated output (includes 0.3% fee)</li>
            <li>Set min output for slippage protection (optional)</li>
            <li>Click Approve to authorize the swap</li>
            <li>Click Swap to execute the transaction</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: "100%",
    maxWidth: "600px",
    margin: "0 auto",
    padding: "20px",
  },
  card: {
    backgroundColor: "#f8f9fa",
    border: "1px solid #dee2e6",
    borderRadius: "8px",
    padding: "20px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  warning: {
    backgroundColor: "#fff3cd",
    border: "1px solid #ffc107",
    color: "#856404",
    padding: "12px",
    borderRadius: "4px",
    marginBottom: "16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  formGroup: {
    marginBottom: "16px",
  },
  label: {
    display: "block",
    marginBottom: "6px",
    fontWeight: "600",
    fontSize: "14px",
    color: "#333",
  },
  select: {
    width: "100%",
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "14px",
    fontFamily: "inherit",
  },
  swapBox: {
    backgroundColor: "#fff",
    border: "1px solid #dee2e6",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "16px",
    position: "relative",
  },
  tokenBox: {
    marginBottom: "16px",
  },
  tokenHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  balance: {
    fontSize: "12px",
    color: "#666",
  },
  inputGroup: {
    display: "flex",
    gap: "8px",
  },
  input: {
    flex: 1,
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "14px",
    fontFamily: "inherit",
  },
  tokenSelect: {
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "14px",
    fontFamily: "inherit",
    minWidth: "80px",
  },
  swapButton: {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: "50%",
    width: "40px",
    height: "40px",
    fontSize: "20px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.3s",
  },
  priceInfo: {
    backgroundColor: "#e7f3ff",
    border: "1px solid #b3d9ff",
    borderRadius: "4px",
    padding: "10px",
    marginBottom: "16px",
    fontSize: "12px",
    color: "#004085",
  },
  buttonGroup: {
    display: "flex",
    gap: "10px",
    marginBottom: "16px",
  },
  button: {
    flex: 1,
    padding: "12px",
    backgroundColor: "#28a745",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.3s",
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
    cursor: "not-allowed",
  },
  buttonSmall: {
    padding: "6px 12px",
    backgroundColor: "#ffc107",
    color: "#000",
    border: "none",
    borderRadius: "4px",
    fontSize: "12px",
    cursor: "pointer",
  },
  txInfo: {
    marginBottom: "16px",
    padding: "10px",
    backgroundColor: "#d4edda",
    border: "1px solid #c3e6cb",
    borderRadius: "4px",
    color: "#155724",
    fontSize: "12px",
  },
  txInfo_a: {
    color: "#155724",
    textDecoration: "none",
  },
  success: {
    backgroundColor: "#d4edda",
    color: "#155724",
    padding: "10px",
    borderRadius: "4px",
    marginBottom: "10px",
    fontSize: "12px",
  },
  error: {
    backgroundColor: "#f8d7da",
    color: "#721c24",
    padding: "10px",
    borderRadius: "4px",
    marginBottom: "10px",
    fontSize: "12px",
  },
  pending: {
    backgroundColor: "#fff3cd",
    color: "#856404",
    padding: "10px",
    borderRadius: "4px",
    marginBottom: "10px",
    fontSize: "12px",
  },
  hint: {
    display: "block",
    marginTop: "4px",
    color: "#666",
    fontSize: "12px",
  },
  info: {
    backgroundColor: "#e7f3ff",
    border: "1px solid #b3d9ff",
    borderRadius: "4px",
    padding: "12px",
    fontSize: "12px",
    color: "#004085",
  },
};
