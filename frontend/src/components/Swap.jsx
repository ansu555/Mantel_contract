import { useAccount, useNetwork, useSwitchNetwork } from "wagmi";
import { useState } from "react";
import { POOLS_ADDRESS, POOLS_ABI, TOKEN_ADDRESSES, ERC20_ABI } from "../config";
import { parseUnits, formatUnits } from "viem";

export default function Swap() {
  const { address } = useAccount();
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();

  const [poolId, setPoolId] = useState("0");
  const [tokenIn, setTokenIn] = useState(TOKEN_ADDRESSES.tUSDC);
  const [amountIn, setAmountIn] = useState("100");
  const [amountOutMin, setAmountOutMin] = useState("0");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSwap = async () => {
    if (!address) {
      setError("Connect wallet first");
      return;
    }

    if (chain?.id !== 5003) {
      switchNetwork?.(5003);
      setError("Switched to Mantle Sepolia");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const amountInWei = parseUnits(amountIn, 18);
      const response = await fetch(window.CONTRACT_CALL_API || "/api/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poolsAddress: POOLS_ADDRESS,
          poolId: parseInt(poolId),
          tokenIn,
          amountIn: amountInWei.toString(),
          amountOutMin: parseUnits(amountOutMin, 18).toString(),
          userAddress: address,
        }),
      });

      if (!response.ok) throw new Error("Swap failed");
      const data = await response.json();
      setResult(`Swapped! Received: ${formatUnits(data.amountOut, 18)} tokens`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.card}>
      <h3>Swap Tokens</h3>
      <div style={styles.form}>
        <label>Pool ID:</label>
        <input
          type="number"
          value={poolId}
          onChange={(e) => setPoolId(e.target.value)}
          style={styles.input}
          placeholder="0"
        />

        <label>Token In:</label>
        <select value={tokenIn} onChange={(e) => setTokenIn(e.target.value)} style={styles.input}>
          {Object.entries(TOKEN_ADDRESSES).map(([key, addr]) => (
            <option key={key} value={addr}>
              {key}
            </option>
          ))}
        </select>

        <label>Amount In (18 decimals):</label>
        <input
          type="number"
          value={amountIn}
          onChange={(e) => setAmountIn(e.target.value)}
          style={styles.input}
          placeholder="100"
        />

        <label>Min Amount Out:</label>
        <input
          type="number"
          value={amountOutMin}
          onChange={(e) => setAmountOutMin(e.target.value)}
          style={styles.input}
          placeholder="0"
        />

        <button onClick={handleSwap} disabled={loading} style={styles.button}>
          {loading ? "Swapping..." : "Swap"}
        </button>

        {result && <p style={{ color: "green" }}>{result}</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}
      </div>
    </div>
  );
}

const styles = {
  card: {
    border: "1px solid #ccc",
    padding: "1rem",
    borderRadius: "8px",
    marginBottom: "1rem",
    backgroundColor: "#f9f9f9",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  input: {
    padding: "0.5rem",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "0.9rem",
  },
  button: {
    padding: "0.75rem",
    backgroundColor: "#0070f3",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "1rem",
    marginTop: "0.5rem",
  },
};
