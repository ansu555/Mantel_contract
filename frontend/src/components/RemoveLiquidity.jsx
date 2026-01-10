import { useAccount, useNetwork, useSwitchNetwork } from "wagmi";
import { useState } from "react";
import { POOLS_ADDRESS, POOLS_ABI, TOKEN_ADDRESSES } from "../config";
import { parseUnits, formatUnits } from "viem";

export default function RemoveLiquidity() {
  const { address } = useAccount();
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();

  const [poolId, setPoolId] = useState("0");
  const [lpTokens, setLpTokens] = useState("10");
  const [amount0Min, setAmount0Min] = useState("0");
  const [amount1Min, setAmount1Min] = useState("0");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleRemoveLiquidity = async () => {
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

      const lpTokensWei = parseUnits(lpTokens, 18);
      const amount0MinWei = parseUnits(amount0Min, 18);
      const amount1MinWei = parseUnits(amount1Min, 18);

      const response = await fetch(window.CONTRACT_CALL_API || "/api/remove-liquidity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poolsAddress: POOLS_ADDRESS,
          poolId: parseInt(poolId),
          lpTokens: lpTokensWei.toString(),
          amount0Min: amount0MinWei.toString(),
          amount1Min: amount1MinWei.toString(),
          userAddress: address,
        }),
      });

      if (!response.ok) throw new Error("Remove liquidity failed");
      const data = await response.json();
      setResult(`Liquidity removed! Got ${formatUnits(data.amount0, 18)} token0 and ${formatUnits(data.amount1, 18)} token1`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.card}>
      <h3>Remove Liquidity</h3>
      <div style={styles.form}>
        <label>Pool ID:</label>
        <input
          type="number"
          value={poolId}
          onChange={(e) => setPoolId(e.target.value)}
          style={styles.input}
          placeholder="0"
        />

        <label>LP Tokens to Burn:</label>
        <input
          type="number"
          value={lpTokens}
          onChange={(e) => setLpTokens(e.target.value)}
          style={styles.input}
          placeholder="10"
        />

        <label>Min Amount Token 0:</label>
        <input
          type="number"
          value={amount0Min}
          onChange={(e) => setAmount0Min(e.target.value)}
          style={styles.input}
          placeholder="0"
        />

        <label>Min Amount Token 1:</label>
        <input
          type="number"
          value={amount1Min}
          onChange={(e) => setAmount1Min(e.target.value)}
          style={styles.input}
          placeholder="0"
        />

        <button onClick={handleRemoveLiquidity} disabled={loading} style={styles.button}>
          {loading ? "Removing..." : "Remove Liquidity"}
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
