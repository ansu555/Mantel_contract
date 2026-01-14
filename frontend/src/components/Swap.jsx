import { useAccount, useChainId, useSwitchChain, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { useState, useEffect } from "react";
import { POOLS_ADDRESS, POOLS_ABI, ROUTER_ADDRESS, ROUTER_ABI, TOKEN_ADDRESSES, ERC20_ABI } from "../config";
import { publicClient, getWalletClient } from "../viem";
import { parseUnits, formatUnits, encodeFunctionData } from "viem";

export default function Swap() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const [tokenIn, setTokenIn] = useState("tUSDC");
  const [tokenOut, setTokenOut] = useState("tUSDT");
  const [amountIn, setAmountIn] = useState("");
  const [amountOutMin, setAmountOutMin] = useState("");
  const [estimatedOut, setEstimatedOut] = useState(null);
  const [estimatedOutBig, setEstimatedOutBig] = useState(0n);
  const [step, setStep] = useState("approve");
  const [loading, setLoading] = useState(false);
  const [poolId, setPoolId] = useState(null);
  const [bestRoute, setBestRoute] = useState(null);

  // Mantle Sepolia requires much higher gas limits than typical EVM chains
  // The sequencer reported minimum needed: 68990976
  const DEFAULT_GAS_LIMIT = 100_000_000n; // 100M gas for Mantle
  const tokenList = Object.keys(TOKEN_ADDRESSES);

  // Get pool ID for the selected token pair
  const { data: poolIdData, isLoading: isLoadingPoolId } = useReadContract({
    address: POOLS_ADDRESS,
    abi: POOLS_ABI,
    functionName: "getPoolId",
    args: [TOKEN_ADDRESSES[tokenIn], TOKEN_ADDRESSES[tokenOut]],
    query: { enabled: !!tokenIn && !!tokenOut && tokenIn !== tokenOut },
  });

  // Update poolId when token pair changes
  useEffect(() => {
    if (poolIdData !== undefined) {
      setPoolId(poolIdData);
    }
  }, [poolIdData]);

  // Get pool info for reserve calculations
  const { data: poolInfo, error: poolInfoError } = useReadContract({
    address: POOLS_ADDRESS,
    abi: POOLS_ABI,
    functionName: "getPoolInfo",
    args: [poolId],
    query: { enabled: poolId !== null && poolId !== undefined },
  });

  // Get token decimals (for accurate unit parsing)
  const { data: tokenInDecimals } = useReadContract({
    address: TOKEN_ADDRESSES[tokenIn],
    abi: ERC20_ABI,
    functionName: "decimals",
    args: [],
    query: { enabled: !!tokenIn },
  });

  const { data: tokenOutDecimals } = useReadContract({
    address: TOKEN_ADDRESSES[tokenOut],
    abi: ERC20_ABI,
    functionName: "decimals",
    args: [],
    query: { enabled: !!tokenOut },
  });

  // Estimate output amount using actual pool reserves
  useEffect(() => {
    if (!amountIn || amountIn === "0" || !poolInfo) {
      setEstimatedOut(null);
      setEstimatedOutBig(0n);
      return;
    }

    try {
      const [token0, token1, reserve0, reserve1] = poolInfo;
      const decIn = typeof tokenInDecimals === "number" ? tokenInDecimals : 18;
      const decOut = typeof tokenOutDecimals === "number" ? tokenOutDecimals : 18;
      const amountInParsed = parseUnits(amountIn, decIn);
      
      // Determine which reserve is for tokenIn
      const isToken0 = TOKEN_ADDRESSES[tokenIn].toLowerCase() === token0.toLowerCase();
      const reserveIn = isToken0 ? reserve0 : reserve1;
      const reserveOut = isToken0 ? reserve1 : reserve0;

      // Calculate output with 0.3% fee
      const amountInWithFee = amountInParsed * 997n;
      const numerator = amountInWithFee * reserveOut;
      const denominator = reserveIn * 1000n + amountInWithFee;
      const amountOut = numerator / denominator;

      setEstimatedOut(formatUnits(amountOut, decOut));
      setEstimatedOutBig(amountOut);
    } catch (err) {
      console.error("Error estimating output:", err);
      setEstimatedOut(null);
      setEstimatedOutBig(0n);
    }
  }, [amountIn, tokenIn, tokenOut, poolInfo, tokenInDecimals, tokenOutDecimals]);

  // Get token balance
  const { data: tokenBalance } = useReadContract({
    address: TOKEN_ADDRESSES[tokenIn],
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address],
    query: { enabled: isConnected && address },
  });

  // Dynamic approval target based on route: pool for direct, router for multi-hop
  const approvalTarget = bestRoute?.type === "direct" ? POOLS_ADDRESS : ROUTER_ADDRESS;
  const { data: allowance } = useReadContract({
    address: TOKEN_ADDRESSES[tokenIn],
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address, approvalTarget],
    query: { enabled: isConnected && address && !!bestRoute },
  });

  const handleApprove = async () => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    if (!bestRoute) {
      alert("No route available. Please select different tokens.");
      return;
    }

    if (!amountIn || parseFloat(amountIn) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    const decIn = typeof tokenInDecimals === "number" ? tokenInDecimals : 18;
    const amount = parseUnits(amountIn, decIn);

    // Determine correct approval target based on route type
    const approvalTarget = bestRoute.type === "direct" ? POOLS_ADDRESS : ROUTER_ADDRESS;
    
    console.log("🔐 Approval Details:", {
      token: tokenIn,
      tokenAddress: TOKEN_ADDRESSES[tokenIn],
      approvalTarget,
      targetName: bestRoute.type === "direct" ? "POOLS" : "ROUTER",
      amount: amount.toString(),
      amountFormatted: amountIn,
      routeType: bestRoute.type,
    });

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
          onSuccess: (hash) => {
            console.log("✅ Approval transaction sent:", hash);
            setStep("swap");
            setLoading(false);
          },
          onError: (err) => {
            console.error("❌ Approve error:", err);
            alert(`Approval failed: ${err.message}`);
            setLoading(false);
          },
        }
      );
    } catch (err) {
      console.error("❌ Approve error:", err);
      alert(`Approval failed: ${err.message}`);
      setLoading(false);
    }
  };

  const handleSwap = async () => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    if (!bestRoute) {
      alert("No route available for this token pair");
      return;
    }

    if (!amountIn || parseFloat(amountIn) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    const decIn = typeof tokenInDecimals === "number" ? tokenInDecimals : 18;
    const decOut = typeof tokenOutDecimals === "number" ? tokenOutDecimals : 18;
    const amountInParsed = parseUnits(amountIn, decIn);
    const minOut = amountOutMin && parseFloat(amountOutMin) > 0 
      ? parseUnits(amountOutMin, decOut) 
      : 0n;

    console.log("💱 Swap Parameters:", {
      routeType: bestRoute.type,
      path: bestRoute.path.join(" → "),
      tokenIn,
      tokenOut,
    tokenInAddress: TOKEN_ADDRESSES[tokenIn],
    tokenOutAddress: TOKEN_ADDRESSES[tokenOut],
    amountIn: amountInParsed.toString(),
    amountInFormatted: amountIn,
    minOut: minOut.toString(),
    minOutFormatted: amountOutMin || "0",
    estimatedOut: estimatedOut,
    poolId: poolId,
    poolIdType: typeof poolId,
  });

  setLoading(true);

  try {
    if (bestRoute.type === "direct") {
        // ===== DIRECT SWAP =====
        if (poolId === null || poolId === undefined) {
          alert("Pool not found for this token pair");
          setLoading(false);
          return;
        }

        // ✅ CRITICAL FIX: Verify pool actually exists
        // poolId = 0 could mean "first pool" OR "no pool exists"
        // We need to check if the pool data is valid
        if (!poolInfo || !poolInfo[0] || !poolInfo[1]) {
          alert("❌ Pool does not exist for this token pair.\n\nPlease:\n1. Create a pool first, or\n2. Use multi-hop routing if available");
          setLoading(false);
          return;
        }

        // Verify the pool actually contains our tokens
        const pool0Lower = poolInfo[0].toLowerCase();
        const pool1Lower = poolInfo[1].toLowerCase();
        const tokenInLower = TOKEN_ADDRESSES[tokenIn].toLowerCase();
        const tokenOutLower = TOKEN_ADDRESSES[tokenOut].toLowerCase();
        
        const poolHasTokens = 
          (pool0Lower === tokenInLower && pool1Lower === tokenOutLower) ||
          (pool0Lower === tokenOutLower && pool1Lower === tokenInLower);
        
        if (!poolHasTokens) {
          alert(`❌ Pool ${poolId} exists but doesn't contain the selected token pair.\n\nPool tokens: ${tokenIn} / ${tokenOut}\nActual pool tokens: ${poolInfo[0]} / ${poolInfo[1]}`);
          setLoading(false);
          return;
        }

        // Pre-flight checks
        console.log("🔍 Running pre-flight checks...");

        const [balance, allowance] = await Promise.all([
          publicClient.readContract({
            address: TOKEN_ADDRESSES[tokenIn],
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [address],
          }),
          publicClient.readContract({
            address: TOKEN_ADDRESSES[tokenIn],
            abi: ERC20_ABI,
            functionName: "allowance",
            args: [address, POOLS_ADDRESS],
          })
        ]);

        console.log("📊 Pre-swap Status:", {
          yourBalance: formatUnits(balance, decIn),
          requiredAmount: amountIn,
          hasEnoughBalance: balance >= amountInParsed,
          allowance: formatUnits(allowance, decIn),
          hasEnoughAllowance: allowance >= amountInParsed,
          poolReserve0: poolInfo ? formatUnits(poolInfo[2], 18) : "N/A",
          poolReserve1: poolInfo ? formatUnits(poolInfo[3], 18) : "N/A",
        });

        // Check balance
        if (balance < amountInParsed) {
          const shortfall = formatUnits(amountInParsed - balance, decIn);
          alert(`Insufficient ${tokenIn} balance.\nYou have: ${formatUnits(balance, decIn)}\nYou need: ${amountIn}\nShortfall: ${shortfall}`);
          setLoading(false);
          return;
        }

        // Check allowance
        if (allowance < amountInParsed) {
          alert(`Insufficient allowance for pool contract.\nPlease approve ${tokenIn} first.\nCurrent allowance: ${formatUnits(allowance, decIn)}\nRequired: ${amountIn}`);
          setStep("approve");
          setLoading(false);
          return;
        }

        // Check pool liquidity
        if (poolInfo) {
          const [token0, token1, reserve0, reserve1] = poolInfo;
          const isToken0 = TOKEN_ADDRESSES[tokenIn].toLowerCase() === token0.toLowerCase();
          const reserveOut = isToken0 ? reserve1 : reserve0;
          
          if (estimatedOutBig >= reserveOut) {
            alert(`Insufficient pool liquidity.\nPool has: ${formatUnits(reserveOut, decOut)} ${tokenOut}\nYou need: ${estimatedOut}\n\nTry a smaller amount.`);
            setLoading(false);
            return;
          }

          // Warn if using >5% of pool
          const percentOfPool = (estimatedOutBig * 100n) / reserveOut;
          if (percentOfPool > 5n) {
            const shouldContinue = window.confirm(
              `⚠️ Large Trade Warning\n\n` +
              `This trade uses ${percentOfPool}% of the pool's liquidity.\n` +
              `You may experience significant price impact.\n\n` +
              `Continue anyway?`
            );
            if (!shouldContinue) {
              setLoading(false);
              return;
            }
          }
        }

        console.log("✅ All pre-flight checks passed. Executing swap...");
      // Log exact contract call parameters
      console.log("📞 Contract Call Args:", {
        contractAddress: POOLS_ADDRESS,
        functionName: "swap",
        arg_poolId: poolId,
        arg_poolId_type: typeof poolId,
        arg_tokenIn: TOKEN_ADDRESSES[tokenIn],
        arg_amountIn: amountInParsed.toString(),
        arg_minOut: minOut.toString(),
      });

        // 🔥 SIMULATE FIRST to get exact revert reason
        try {
          console.log("🧪 Simulating swap transaction...");
          
          // Extra debug: Log the exact pool tokens vs our selected tokens
          console.log("🔬 Token Address Comparison:");
          console.log("   Pool Token0:", poolInfo[0]);
          console.log("   Pool Token1:", poolInfo[1]);
          console.log("   Our tokenIn (", tokenIn, "):", TOKEN_ADDRESSES[tokenIn]);
          console.log("   Our tokenOut (", tokenOut, "):", TOKEN_ADDRESSES[tokenOut]);
          console.log("   Match check - tokenIn in pool:", 
            poolInfo[0].toLowerCase() === TOKEN_ADDRESSES[tokenIn].toLowerCase() || 
            poolInfo[1].toLowerCase() === TOKEN_ADDRESSES[tokenIn].toLowerCase()
          );
          
          const { request } = await publicClient.simulateContract({
            address: POOLS_ADDRESS,
            abi: POOLS_ABI,
            functionName: "swap",
            args: [poolId, TOKEN_ADDRESSES[tokenIn], amountInParsed, minOut],
            account: address,
          });
          console.log("✅ Simulation passed!", request);
          
          // Use raw eth_sendTransaction via MetaMask directly
          console.log("📤 Sending transaction via raw eth_sendTransaction...");
          
          // Encode the function call data manually
          const callData = encodeFunctionData({
            abi: POOLS_ABI,
            functionName: "swap",
            args: [poolId, TOKEN_ADDRESSES[tokenIn], amountInParsed, minOut],
          });
          
          console.log("📦 Encoded call data:", callData);

          try {
            // Send raw transaction via MetaMask
            const txHash = await window.ethereum.request({
              method: "eth_sendTransaction",
              params: [{
                from: address,
                to: POOLS_ADDRESS,
                data: callData,
                gas: "0x7A120", // 500,000 in hex
              }],
            });
            
            console.log("✅ Transaction sent:", txHash);
            alert(`Transaction sent! Hash: ${txHash}\n\nWaiting for confirmation...`);
            
            // Wait for confirmation
            const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
            console.log("✅ Transaction confirmed:", receipt);
            
            if (receipt.status === "success") {
              handleSwapSuccess();
            } else {
              alert("Transaction failed on-chain. Check explorer for details:\nhttps://explorer.sepolia.mantle.xyz/tx/" + txHash);
              setLoading(false);
            }
          } catch (txError) {
            console.error("❌ Transaction error:", txError);
            
            if (txError.code === 4001 || txError.message?.includes("User rejected") || txError.message?.includes("user rejected")) {
              alert("Transaction was rejected in wallet.");
            } else {
              alert(`Transaction failed: ${txError.message || JSON.stringify(txError)}`);
            }
            setLoading(false);
          }
          return;
          
        } catch (simError) {
          console.error("❌ Simulation failed:", simError);
          
          // Extract the actual revert reason
          let revertReason = "Unknown error";
          if (simError?.cause?.reason) {
            revertReason = simError.cause.reason;
          } else if (simError?.shortMessage) {
            revertReason = simError.shortMessage;
          } else if (simError?.message) {
            // Try to extract revert reason from message
            const match = simError.message.match(/reason:\s*(.+?)(?:\n|$)/);
            revertReason = match ? match[1] : simError.message.slice(0, 200);
          }
          
          alert(
            `❌ Swap Simulation Failed\n\n` +
            `Reason: ${revertReason}\n\n` +
            `This error was caught BEFORE sending the transaction.\n\n` +
            `Possible causes:\n` +
            `• Token not approved for pool contract\n` +
            `• Pool reserves changed\n` +
            `• Token address mismatch\n` +
            `• Insufficient liquidity\n\n` +
            `Check console for full error details.`
          );
          setLoading(false);
          return;
        }

      } else if (bestRoute.type === "2hop") {
        // ===== TWO-HOP SWAP =====
        const intermediate = bestRoute.path[1];

        console.log("🔍 Two-hop swap pre-flight checks...");

        // Check allowance for router
        const allowance = await publicClient.readContract({
          address: TOKEN_ADDRESSES[tokenIn],
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, ROUTER_ADDRESS],
        });

        if (allowance < amountInParsed) {
          alert(`Insufficient allowance for router contract.\nPlease approve ${tokenIn} for router first.`);
          setStep("approve");
          setLoading(false);
          return;
        }

        console.log("✅ Router allowance OK. Executing 2-hop swap...");

        writeContract(
          {
            address: ROUTER_ADDRESS,
            abi: ROUTER_ABI,
            functionName: "swapTwoHop",
            args: [
              TOKEN_ADDRESSES[tokenIn],
              TOKEN_ADDRESSES[intermediate],
              TOKEN_ADDRESSES[tokenOut],
              amountInParsed,
              minOut,
              address,
            ],
            gas: DEFAULT_GAS_LIMIT,
          },
          {
            onSuccess: (hash) => {
              console.log("✅ 2-hop swap transaction sent:", hash);
              handleSwapSuccess();
            },
            onError: (err) => {
              console.error("❌ 2-hop swap failed:", err);
              alert(`2-hop swap failed: ${err.message}`);
              setLoading(false);
            },
          }
        );

      } else if (bestRoute.type === "3hop") {
        // ===== THREE-HOP SWAP =====
        const intermediate1 = bestRoute.path[1];
        const intermediate2 = bestRoute.path[2];

        console.log("🔍 Three-hop swap pre-flight checks...");

        const allowance = await publicClient.readContract({
          address: TOKEN_ADDRESSES[tokenIn],
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, ROUTER_ADDRESS],
        });

        if (allowance < amountInParsed) {
          alert(`Insufficient allowance for router contract.\nPlease approve ${tokenIn} for router first.`);
          setStep("approve");
          setLoading(false);
          return;
        }

        console.log("✅ Router allowance OK. Executing 3-hop swap...");

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
              address,
            ],
            gas: DEFAULT_GAS_LIMIT,
          },
          {
            onSuccess: (hash) => {
              console.log("✅ 3-hop swap transaction sent:", hash);
              handleSwapSuccess();
            },
            onError: (err) => {
              console.error("❌ 3-hop swap failed:", err);
              alert(`3-hop swap failed: ${err.message}`);
              setLoading(false);
            },
          }
        );
      }
    } catch (err) {
      console.error("❌ Unexpected swap error:", err);
      alert(`Unexpected error: ${err.message}`);
      setLoading(false);
    }
  };

  const handleSwapSuccess = () => {
    setStep("approve");
    setAmountIn("");
    setAmountOutMin("");
    setEstimatedOut(null);
    setEstimatedOutBig(0n);
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

  const decIn = typeof tokenInDecimals === "number" ? tokenInDecimals : 18;
  const parsedBalance = tokenBalance ? formatUnits(tokenBalance, decIn) : "0";
  const parsedAllowance = allowance ? formatUnits(allowance, decIn) : "0";
  const hasEnoughAllowance = parseFloat(parsedAllowance) >= parseFloat(amountIn || "0");

  // Determine if the fetched pool actually matches the selected token pair
  const tokenInAddr = TOKEN_ADDRESSES[tokenIn]?.toLowerCase();
  const tokenOutAddr = TOKEN_ADDRESSES[tokenOut]?.toLowerCase();
  const poolTokensMatch = poolInfo
    ? (
        poolInfo[0].toLowerCase() === tokenInAddr && poolInfo[1].toLowerCase() === tokenOutAddr
      ) || (
        poolInfo[0].toLowerCase() === tokenOutAddr && poolInfo[1].toLowerCase() === tokenInAddr
      )
    : false;
  const poolExistsForPair = !!poolInfo && poolTokensMatch;

  // Auto-route discovery using router view functions
  useEffect(() => {
    const computeBestRoute = async () => {
      try {
        if (!amountIn || !tokenIn || !tokenOut || tokenIn === tokenOut) {
          setBestRoute(null);
          return;
        }

        const decIn = typeof tokenInDecimals === "number" ? tokenInDecimals : 18;
        const decOut = typeof tokenOutDecimals === "number" ? tokenOutDecimals : 18;
        const amountInParsed = parseUnits(amountIn, decIn);
        const routes = [];

        console.log("Route computation:", { poolExistsForPair, estimatedOutBig: estimatedOutBig.toString(), estimatedOut });

        // Direct route if pool matches
        if (poolExistsForPair && estimatedOutBig > 0n) {
          routes.push({
            type: "direct",
            path: [tokenIn, tokenOut],
            output: estimatedOutBig,
            displayOutput: estimatedOut,
          });
          console.log("Added direct route:", routes[0]);
        }

        // 2-hop via common intermediates
        const commonIntermediates = ["tUSDC", "tUSDT", "tDAI", "tWETH"];
        for (const inter of commonIntermediates) {
          if (inter === tokenIn || inter === tokenOut) continue;
          try {
            const twoHopOut = await publicClient.readContract({
              address: ROUTER_ADDRESS,
              abi: ROUTER_ABI,
              functionName: "getAmountOutTwoHop",
              args: [
                TOKEN_ADDRESSES[tokenIn],
                TOKEN_ADDRESSES[inter],
                TOKEN_ADDRESSES[tokenOut],
                amountInParsed,
              ],
            });
            if (twoHopOut && twoHopOut > 0n) {
              routes.push({
                type: "2hop",
                path: [tokenIn, inter, tokenOut],
                output: twoHopOut,
                displayOutput: formatUnits(twoHopOut, decOut),
              });
            }
          } catch (_) {
            // ignore failing route
          }
        }

        // 3-hop via limited combinations
        for (let i = 0; i < commonIntermediates.length; i++) {
          for (let j = i + 1; j < commonIntermediates.length; j++) {
            const i1 = commonIntermediates[i];
            const i2 = commonIntermediates[j];
            if ([i1, i2].includes(tokenIn) || [i1, i2].includes(tokenOut)) continue;
            try {
              const threeHopOut = await publicClient.readContract({
                address: ROUTER_ADDRESS,
                abi: ROUTER_ABI,
                functionName: "getAmountOutThreeHop",
                args: [
                  TOKEN_ADDRESSES[tokenIn],
                  TOKEN_ADDRESSES[i1],
                  TOKEN_ADDRESSES[i2],
                  TOKEN_ADDRESSES[tokenOut],
                  amountInParsed,
                ],
              });
              if (threeHopOut && threeHopOut > 0n) {
                routes.push({
                  type: "3hop",
                  path: [tokenIn, i1, i2, tokenOut],
                  output: threeHopOut,
                  displayOutput: formatUnits(threeHopOut, decOut),
                });
              }
            } catch (_) {
              // ignore failing route
            }
          }
        }

        if (routes.length > 0) {
          const best = routes.reduce((prev, curr) => (curr.output > prev.output ? curr : prev));
          setBestRoute(best);
          // Only update estimatedOut if it's from multi-hop (direct already set it)
          if (best.type !== "direct") {
            setEstimatedOut(best.displayOutput);
          }
        } else {
          setBestRoute(null);
          // keep estimatedOut from direct calc if any
        }
      } catch (err) {
        console.error("route computation error", err);
      }
    };

    computeBestRoute();
  }, [amountIn, tokenIn, tokenOut, poolExistsForPair, estimatedOutBig, tokenInDecimals, tokenOutDecimals]);

  // Debug function to diagnose swap issues
  const runDiagnostic = async () => {
    console.log("\n========== SWAP DIAGNOSTIC ==========\n");
    console.log("📋 CONFIG TOKEN ADDRESSES:");
    console.log("   tokenIn (", tokenIn, "):", TOKEN_ADDRESSES[tokenIn]);
    console.log("   tokenOut (", tokenOut, "):", TOKEN_ADDRESSES[tokenOut]);
    
    console.log("\n📦 POOL INFO (Pool ID:", poolId?.toString(), "):");
    if (poolInfo) {
      console.log("   Pool Token0:", poolInfo[0]);
      console.log("   Pool Token1:", poolInfo[1]);
      console.log("   Reserve0:", poolInfo[2]?.toString());
      console.log("   Reserve1:", poolInfo[3]?.toString());
    } else {
      console.log("   ❌ No pool info available!");
    }

    console.log("\n🔍 ADDRESS MATCH CHECK:");
    const configIn = TOKEN_ADDRESSES[tokenIn]?.toLowerCase();
    const configOut = TOKEN_ADDRESSES[tokenOut]?.toLowerCase();
    const pool0 = poolInfo?.[0]?.toLowerCase();
    const pool1 = poolInfo?.[1]?.toLowerCase();
    
    const tokenInMatchesPool0 = configIn === pool0;
    const tokenInMatchesPool1 = configIn === pool1;
    const tokenOutMatchesPool0 = configOut === pool0;
    const tokenOutMatchesPool1 = configOut === pool1;
    
    console.log("   tokenIn matches Pool Token0:", tokenInMatchesPool0);
    console.log("   tokenIn matches Pool Token1:", tokenInMatchesPool1);
    console.log("   tokenOut matches Pool Token0:", tokenOutMatchesPool0);
    console.log("   tokenOut matches Pool Token1:", tokenOutMatchesPool1);
    
    if (!tokenInMatchesPool0 && !tokenInMatchesPool1) {
      console.log("\n   ❌ PROBLEM: Your tokenIn address is NOT in this pool!");
      console.log("   Config has:", TOKEN_ADDRESSES[tokenIn]);
      console.log("   Pool has:", poolInfo?.[0], "and", poolInfo?.[1]);
    }
    
    if (!tokenOutMatchesPool0 && !tokenOutMatchesPool1) {
      console.log("\n   ❌ PROBLEM: Your tokenOut address is NOT in this pool!");
    }

    // Check allowance directly
    console.log("\n💰 CHECKING ALLOWANCE TO POOL CONTRACT...");
    try {
      const currentAllowance = await publicClient.readContract({
        address: TOKEN_ADDRESSES[tokenIn],
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, POOLS_ADDRESS],
      });
      console.log("   Allowance:", currentAllowance.toString());
    } catch (e) {
      console.log("   ❌ Error checking allowance:", e.message);
    }
    
    console.log("\n=====================================\n");
    alert("Check browser console (F12) for diagnostic results!");
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Debug Button */}
        <button 
          onClick={runDiagnostic} 
          style={{ marginBottom: "10px", padding: "8px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
        >
          🔍 Run Diagnostic
        </button>

        {/* Network Warning */}
        {isConnected && chainId !== 5003 && (
          <div style={styles.warning}>
            ⚠️ Connected to wrong network. Please switch to Mantle Sepolia.
            <button onClick={() => switchChain({ chainId: 5003 })} style={styles.buttonSmall}>
              Switch Network
            </button>
          </div>
        )}

        {/* Pool Info Display */}
        {poolExistsForPair && (
          <div style={styles.poolInfo}>
            <span>Pool ID: {poolId.toString()}</span>
            {poolInfo && (
              <span style={styles.reserves}>
                Reserves: {parseFloat(formatUnits(poolInfo[2], 18)).toFixed(2)} {tokenIn} / {parseFloat(formatUnits(poolInfo[3], 18)).toFixed(2)} {tokenOut}
              </span>
            )}
          </div>
        )}

        {isLoadingPoolId && <div style={styles.pending}>🔍 Finding pool...</div>}
        
        {!isLoadingPoolId && tokenIn !== tokenOut && !poolExistsForPair && (
          <div style={styles.warning}>⚠️ No direct pool for this pair. Auto-routing will try multi-hop if available.</div>
        )}
        {/* Best Route Display */}
        {bestRoute && (
          <div style={styles.poolInfo}>
            <span>🛣️ Route: <strong>{bestRoute.type.toUpperCase()}</strong></span>
            <span style={styles.reserves}>{bestRoute.path.join(" → ")}</span>
          </div>
        )}

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
                {tokenList.map((token) => (
                  <option key={token} value={token} disabled={token === tokenOut}>
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
                {tokenList.map((token) => (
                  <option key={token} value={token} disabled={token === tokenIn}>
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
            <p>Fee: ~0.3% per hop included in estimate</p>
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
              disabled={loading || !isConnected || !amountIn || !bestRoute}
              style={{
                ...styles.button,
                ...(loading || !isConnected || !amountIn || !bestRoute ? styles.buttonDisabled : {}),
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
          <h4>ℹ️ Swap Guide</h4>
          <ul>
            <li>Select tokens to swap (pool auto-detected)</li>
            <li>Enter the amount you want to swap</li>
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
  poolInfo: {
    backgroundColor: "#f0f0f0",
    border: "1px solid #ddd",
    borderRadius: "4px",
    padding: "10px",
    marginBottom: "16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "12px",
    fontWeight: "600",
  },
  reserves: {
    color: "#666",
    fontSize: "11px",
  },
};
