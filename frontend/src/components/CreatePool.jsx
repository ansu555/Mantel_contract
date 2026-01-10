import { useAccount, useContractRead, useContractWrite, useNetwork, useSwitchNetwork } from "wagmi";
import { useState, useEffect } from "react";
import { POOLS_ADDRESS, POOLS_ABI, TOKEN_ADDRESSES, ERC20_ABI } from "./config";
import { parseUnits, formatUnits } from "viem";

export default function CreatePool() {
  const { address } = useAccount();
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();
  const [token0, setToken0] = useState(TOKEN_ADDRESSES.tUSDC);
  const [token1, setToken1] = useState(TOKEN_ADDRESSES.tUSDT);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleCreatePool = async () => {
    if (!address) {
      setError("Connect wallet first");
      return;
    }

    if (chain?.id !== 5003) {
      switchNetwork?.(5003);
      setError("Switched to Mantle Sepolia");
      return;
    }

    if (!token0 || !token1) {
      setError("Select both tokens");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(window.CONTRACT_CALL_API || "/api/create-pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poolsAddress: POOLS_ADDRESS,
          token0,
          token1,
          userAddress: address,
        }),
      });

      if (!response.ok) throw new Error("Failed to create pool");
      const data = await response.json();
      setResult(`Pool created! ID: ${data.poolId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.card}>
      <h3>Create Pool</h3>
      <div style={styles.form}>
        <label>Token 0:</label>
        <select value={token0} onChange={(e) => setToken0(e.target.value)} style={styles.input}>
          {Object.entries(TOKEN_ADDRESSES).map(([key, addr]) => (
            <option key={key} value={addr}>
              {key}
            </option>
          ))}
        </select>

        <label>Token 1:</label>
        <select value={token1} onChange={(e) => setToken1(e.target.value)} style={styles.input}>
          {Object.entries(TOKEN_ADDRESSES).map(([key, addr]) => (
            <option key={key} value={addr}>
              {key}
            </option>
          ))}
        </select>

        <button onClick={handleCreatePool} disabled={loading} style={styles.button}>
          {loading ? "Creating..." : "Create Pool"}
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
