import { useAccount, useNetwork, useSwitchNetwork } from "wagmi";
import { useState } from "react";
import { POOLS_ADDRESS, POOLS_ABI, TOKEN_ADDRESSES, ERC20_ABI } from "../config";
import { parseUnits, formatUnits } from "viem";

export default function AddLiquidity() {
  const { address } = useAccount();
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();

  const [poolId, setPoolId] = useState("0");
  const [amount0, setAmount0] = useState("100");
  const [amount1, setAmount1] = useState("100");
  const [amount0Min, setAmount0Min] = useState("0");
  const [amount1Min, setAmount1Min] = useState("0");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleAddLiquidity = async () => {
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

      const amount0Wei = parseUnits(amount0, 18);
      const amount1Wei = parseUnits(amount1, 18);
      const amount0MinWei = parseUnits(amount0Min, 18);
      const amount1MinWei = parseUnits(amount1Min, 18);

      const response = await fetch(window.CONTRACT_CALL_API || "/api/add-liquidity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poolsAddress: POOLS_ADDRESS,
          poolId: parseInt(poolId),
          amount0Desired: amount0Wei.toString(),
          amount1Desired: amount1Wei.toString(),
          amount0Min: amount0MinWei.toString(),
          amount1Min: amount1MinWei.toString(),
          userAddress: address,
        }),
      });

      if (!response.ok) throw new Error("Add liquidity failed");
      const data = await response.json();
      setResult(`Liquidity added! LP tokens: ${data.lpTokens}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.card}>
      <h3>Add Liquidity</h3>
      <div style={styles.form}>
        <label>Pool ID:</label>
        <input
          type="number"
          value={poolId}
          onChange={(e) => setPoolId(e.target.value)}
          style={styles.input}
          placeholder="0"
        />

        <label>Amount Token 0:</label>
        <input
          type="number"
          value={amount0}
          onChange={(e) => setAmount0(e.target.value)}
          style={styles.input}
          placeholder="100"
        />

        <label>Amount Token 1:</label>
        <input
          type="number"
          value={amount1}
          onChange={(e) => setAmount1(e.target.value)}
          style={styles.input}
          placeholder="100"
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

        <button onClick={handleAddLiquidity} disabled={loading} style={styles.button}>
          {loading ? "Adding..." : "Add Liquidity"}
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
