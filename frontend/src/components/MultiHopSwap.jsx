import { useAccount, useChainId, useSwitchChain, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { useState, useEffect } from "react";
import { POOLS_ADDRESS, POOLS_ABI, ROUTER_ADDRESS, ROUTER_ABI, TOKEN_ADDRESSES, ERC20_ABI } from "../config";
import { parseUnits, formatUnits } from "viem";

export default function MultiHopSwap() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const [tokenIn, setTokenIn] = useState("tUSDC");
  const [tokenOut, setTokenOut] = useState("tMKR");
  const [amountIn, setAmountIn] = useState("");
  const [amountOutMin, setAmountOutMin] = useState("");
  const [estimatedOut, setEstimatedOut] = useState(null);
  const [step, setStep] = useState("approve");
  const [loading, setLoading] = useState(false);
  const [routeType, setRouteType] = useState("auto"); // auto, direct, 2hop, 3hop
  const [intermediate1, setIntermediate1] = useState("tDAI");
  const [intermediate2, setIntermediate2] = useState("tWETH");
  const [bestRoute, setBestRoute] = useState(null);

  const DEFAULT_GAS_LIMIT = 800_000n;
  const tokenList = Object.keys(TOKEN_ADDRESSES);

  // Get direct pool ID
  const { data: directPoolId } = useReadContract({
    address: POOLS_ADDRESS,
    abi: POOLS_ABI,
    functionName: "getPoolId",
    args: [TOKEN_ADDRESSES[tokenIn], TOKEN_ADDRESSES[tokenOut]],
    query: { enabled: !!tokenIn && !!tokenOut && tokenIn !== tokenOut },
  });

  // Get direct pool info
  const { data: directPoolInfo } = useReadContract({
    address: POOLS_ADDRESS,
    abi: POOLS_ABI,
    functionName: "getPoolInfo",
    args: [directPoolId],
    query: { enabled: directPoolId !== undefined && directPoolId > 0n },
  });

  // Find best route automatically
  useEffect(() => {
    if (!amountIn || !tokenIn || !tokenOut || tokenIn === tokenOut) {
      setBestRoute(null);
      setEstimatedOut(null);
      return;
    }

    const findBestRoute = async () => {
      try {
        const routes = [];

        // Check direct route
        if (directPoolId && directPoolId > 0n && directPoolInfo) {
          const [token0, token1, reserve0, reserve1] = directPoolInfo;
          const isToken0 = TOKEN_ADDRESSES[tokenIn].toLowerCase() === token0.toLowerCase();
          const reserveIn = isToken0 ? reserve0 : reserve1;
          const reserveOut = isToken0 ? reserve1 : reserve0;
          
          const amountInParsed = parseUnits(amountIn, 18);
          const amountInWithFee = amountInParsed * 997n;
          const numerator = amountInWithFee * reserveOut;
          const denominator = reserveIn * 1000n + amountInWithFee;
          const output = numerator / denominator;

          routes.push({
            type: "direct",
            path: [tokenIn, tokenOut],
            output: output,
            displayOutput: formatUnits(output, 18),
          });
        }

        // Check 2-hop routes through common intermediates
        const commonIntermediates = ["tUSDC", "tUSDT", "tDAI", "tWETH"];
        for (const inter of commonIntermediates) {
          if (inter === tokenIn || inter === tokenOut) continue;

          try {
            // This would call getAmountOutTwoHop on the router if ROUTER_ADDRESS is set
            // For now, we'll estimate manually
            const pool1Id = await getPoolIdHelper(tokenIn, inter);
            const pool2Id = await getPoolIdHelper(inter, tokenOut);

            if (pool1Id > 0n && pool2Id > 0n) {
              const output = await estimate2Hop(tokenIn, inter, tokenOut, amountIn);
              if (output > 0n) {
                routes.push({
                  type: "2hop",
                  path: [tokenIn, inter, tokenOut],
                  output: output,
                  displayOutput: formatUnits(output, 18),
                  intermediate1: inter,
                });
              }
            }
          } catch (err) {
            // Skip this route
          }
        }

        // Select best route
        if (routes.length > 0) {
          const best = routes.reduce((prev, curr) => 
            curr.output > prev.output ? curr : prev
          );
          setBestRoute(best);
          setEstimatedOut(best.displayOutput);
          
          if (best.type === "2hop" && routeType === "auto") {
            setIntermediate1(best.intermediate1);
          }
        } else {
          setBestRoute(null);
          setEstimatedOut(null);
        }
      } catch (err) {
        console.error("Error finding route:", err);
      }
    };

    findBestRoute();
  }, [amountIn, tokenIn, tokenOut, directPoolId, directPoolInfo, routeType]);

  // Helper to get pool ID
  const getPoolIdHelper = async (token0, token1) => {
    // This is a simplified version - in production use useReadContract
    return 1n; // Placeholder
  };

  // Helper to estimate 2-hop output
  const estimate2Hop = async (tokenIn, inter, tokenOut, amount) => {
    // Simplified estimation - in production, call contract methods
    return parseUnits("0", 18);
  };

  // Get token balance
  const { data: tokenBalance } = useReadContract({
    address: TOKEN_ADDRESSES[tokenIn],
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address],
    query: { enabled: isConnected && address },
  });

  // Get token allowance (check router approval if using multi-hop, otherwise pool)
  const approvalTarget = bestRoute?.type === "direct" ? POOLS_ADDRESS : ROUTER_ADDRESS;
  const { data: allowance } = useReadContract({
    address: TOKEN_ADDRESSES[tokenIn],
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address, approvalTarget],
    query: { enabled: isConnected && address && !!bestRoute },
  });

  const handleApprove = async () => {
    if (!isConnected || !bestRoute) {
      alert("Connect wallet and select valid tokens");
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
          args: [approvalTarget, amount],
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
    if (!isConnected || !bestRoute) {
      alert("Connect wallet and ensure route exists");
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
      if (bestRoute.type === "direct") {
        // Use direct swap via pool contract
        writeContract(
          {
            address: POOLS_ADDRESS,
            abi: POOLS_ABI,
            functionName: "swap",
            args: [directPoolId, TOKEN_ADDRESSES[tokenIn], amountInParsed, minOut],
            gas: DEFAULT_GAS_LIMIT,
          },
          {
            onSuccess: () => handleSwapSuccess(),
            onError: () => setLoading(false),
          }
        );
      } else if (bestRoute.type === "2hop") {
        // Use 2-hop router
        writeContract(
          {
            address: ROUTER_ADDRESS,
            abi: ROUTER_ABI,
            functionName: "swapTwoHop",
            args: [
              TOKEN_ADDRESSES[tokenIn],
              TOKEN_ADDRESSES[intermediate1],
              TOKEN_ADDRESSES[tokenOut],
              amountInParsed,
              minOut,
              address
            ],
            gas: DEFAULT_GAS_LIMIT,
          },
          {
            onSuccess: () => handleSwapSuccess(),
            onError: () => setLoading(false),
          }
        );
      } else if (bestRoute.type === "3hop") {
        // Use 3-hop router
        writeContract(
          {
            address: ROUTER_ADDRESS,
            abi: ROUTER_ABI,
            functionName: "swapThreeHop",
            args: [
              TOKEN_ADDRESSES[tokenIn],
              TOKEN_ADDRESSES[intermediate1],
              TOKEN_ADDRESSES[intermediate2],
              TOKEN_ADDRESSES[tokenOut],
              amountInParsed,
              minOut,
              address
            ],
            gas: DEFAULT_GAS_LIMIT,
          },
          {
            onSuccess: () => handleSwapSuccess(),
            onError: () => setLoading(false),
          }
        );
      }
    } catch (err) {
      console.error("Swap error:", err);
      setLoading(false);
    }
  };

  const handleSwapSuccess = () => {
    setStep("approve");
    setAmountIn("");
    setAmountOutMin("");
    setEstimatedOut(null);
    setBestRoute(null);
    setLoading(false);
    alert("Swap completed successfully!");
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

  const isRouterDeployed = ROUTER_ADDRESS !== "0x0000000000000000000000000000000000000000";

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Router Status Warning */}
        {!isRouterDeployed && (
          <div style={styles.warning}>
            ⚠️ Router not deployed yet. Please deploy MultiHopSwapRouter and update ROUTER_ADDRESS in config.js
          </div>
        )}

        {/* Network Warning */}
        {isConnected && chainId !== 5003 && (
          <div style={styles.warning}>
            ⚠️ Wrong network. Switch to Mantle Sepolia.
            <button onClick={() => switchChain({ chainId: 5003 })} style={styles.buttonSmall}>
              Switch
            </button>
          </div>
        )}

        {/* Route Display */}
        {bestRoute && (
          <div style={styles.routeDisplay}>
            <div style={styles.routeHeader}>
              <span>🛣️ Best Route: <strong>{bestRoute.type.toUpperCase()}</strong></span>
              <span style={styles.routeOutput}>
                Est. Output: {parseFloat(bestRoute.displayOutput).toFixed(4)} {tokenOut}
              </span>
            </div>
            <div style={styles.routePath}>
              {bestRoute.path.map((token, i) => (
                <span key={i}>
                  {token}
                  {i < bestRoute.path.length - 1 && " → "}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Swap Interface */}
        <div style={styles.swapBox}>
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
                {tokenList.map((token) => (
                  <option key={token} value={token} disabled={token === tokenOut}>
                    {token}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button onClick={handleSwapTokens} style={styles.swapButton} title="Swap tokens">
            ⇅
          </button>

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
                {tokenList.map((token) => (
                  <option key={token} value={token} disabled={token === tokenIn}>
                    {token}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Manual Route Selection */}
        {isRouterDeployed && (
          <div style={styles.formGroup}>
            <label style={styles.label}>Route Type (Manual Override)</label>
            <select value={routeType} onChange={(e) => setRouteType(e.target.value)} style={styles.select}>
              <option value="auto">Auto (Best Route)</option>
              <option value="direct">Direct Only</option>
              <option value="2hop">2-Hop</option>
              <option value="3hop">3-Hop</option>
            </select>
          </div>
        )}

        {/* Intermediate Token Selection for Manual Routes */}
        {routeType === "2hop" && (
          <div style={styles.formGroup}>
            <label style={styles.label}>Intermediate Token</label>
            <select value={intermediate1} onChange={(e) => setIntermediate1(e.target.value)} style={styles.select}>
              {tokenList.filter(t => t !== tokenIn && t !== tokenOut).map((token) => (
                <option key={token} value={token}>{token}</option>
              ))}
            </select>
          </div>
        )}

        {routeType === "3hop" && (
          <>
            <div style={styles.formGroup}>
              <label style={styles.label}>Intermediate Token 1</label>
              <select value={intermediate1} onChange={(e) => setIntermediate1(e.target.value)} style={styles.select}>
                {tokenList.filter(t => t !== tokenIn && t !== tokenOut && t !== intermediate2).map((token) => (
                  <option key={token} value={token}>{token}</option>
                ))}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Intermediate Token 2</label>
              <select value={intermediate2} onChange={(e) => setIntermediate2(e.target.value)} style={styles.select}>
                {tokenList.filter(t => t !== tokenIn && t !== tokenOut && t !== intermediate1).map((token) => (
                  <option key={token} value={token}>{token}</option>
                ))}
              </select>
            </div>
          </>
        )}

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
          <small style={styles.hint}>Recommended: Set to 95-99% of estimated output</small>
        </div>

        {/* Status Messages */}
        {writeError && <div style={styles.error}>Error: {writeError.message}</div>}
        {isConfirmed && <div style={styles.success}>✅ Transaction confirmed!</div>}
        {isConfirming && <div style={styles.pending}>⏳ Confirming transaction...</div>}

        {/* Action Buttons */}
        <div style={styles.buttonGroup}>
          {!hasEnoughAllowance && step === "approve" ? (
            <button
              onClick={handleApprove}
              disabled={loading || !isConnected || !amountIn || !bestRoute}
              style={{
                ...styles.button,
                ...(loading || !isConnected || !amountIn || !bestRoute ? styles.buttonDisabled : {}),
              }}
            >
              {loading ? "Approving..." : `Approve ${tokenIn}`}
            </button>
          ) : null}

          {(hasEnoughAllowance || step === "swap") && (
            <button
              onClick={handleSwap}
              disabled={loading || !isConnected || !amountIn || !bestRoute || !isRouterDeployed}
              style={{
                ...styles.button,
                ...(loading || !isConnected || !amountIn || !bestRoute || !isRouterDeployed ? styles.buttonDisabled : {}),
              }}
            >
              {loading ? "Swapping..." : bestRoute ? `Swap via ${bestRoute.type}` : "Swap"}
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
          <h4>ℹ️ Multi-Hop Swap Guide</h4>
          <ul>
            <li><strong>Auto Mode:</strong> Finds best route automatically (direct, 2-hop, or 3-hop)</li>
            <li><strong>Direct:</strong> Swaps when pool exists for token pair (lowest fees)</li>
            <li><strong>2-Hop:</strong> Routes through 1 intermediate token (e.g., USDC → DAI → WETH)</li>
            <li><strong>3-Hop:</strong> Routes through 2 intermediate tokens (highest fees)</li>
            <li>Each hop adds ~0.3% fee, so fewer hops = better rates</li>
            <li>Set slippage protection to avoid unfavorable rates</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: "100%",
    maxWidth: "700px",
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
  routeDisplay: {
    backgroundColor: "#e7f3ff",
    border: "2px solid #007bff",
    borderRadius: "8px",
    padding: "12px",
    marginBottom: "16px",
  },
  routeHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
    fontSize: "14px",
    fontWeight: "600",
  },
  routeOutput: {
    color: "#28a745",
  },
  routePath: {
    fontSize: "13px",
    color: "#555",
    fontFamily: "monospace",
    padding: "8px",
    backgroundColor: "#fff",
    borderRadius: "4px",
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
    minWidth: "100px",
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
    zIndex: 1,
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
