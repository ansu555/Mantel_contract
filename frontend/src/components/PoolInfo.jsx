import { useAccount, useNetwork, useSwitchNetwork } from "wagmi";
import { useState, useEffect } from "react";
import { POOLS_ADDRESS, POOLS_ABI } from "../config";
import { formatUnits } from "viem";

export default function PoolInfo() {
  const { address } = useAccount();
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();

  const [poolId, setPoolId] = useState("0");
  const [poolInfo, setPoolInfo] = useState(null);
  const [userPosition, setUserPosition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPoolInfo = async () => {
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

      // Fetch pool info
      const poolResponse = await fetch(window.CONTRACT_CALL_API || "/api/pool-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poolsAddress: POOLS_ADDRESS,
          poolId: parseInt(poolId),
        }),
      });

      if (!poolResponse.ok) throw new Error("Failed to fetch pool info");
      const pool = await poolResponse.json();
      setPoolInfo(pool);

      // Fetch user position
      const userResponse = await fetch(window.CONTRACT_CALL_API || "/api/user-position", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poolsAddress: POOLS_ADDRESS,
          poolId: parseInt(poolId),
          userAddress: address,
        }),
      });

      if (userResponse.ok) {
        const position = await userResponse.json();
        setUserPosition(position);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.card}>
      <h3>Pool Info</h3>
      <div style={styles.form}>
        <label>Pool ID:</label>
        <input
          type="number"
          value={poolId}
          onChange={(e) => setPoolId(e.target.value)}
          style={styles.input}
          placeholder="0"
        />

        <button onClick={fetchPoolInfo} disabled={loading} style={styles.button}>
          {loading ? "Loading..." : "Get Pool Info"}
        </button>

        {poolInfo && (
          <div style={styles.infoBox}>
            <p><strong>Token 0:</strong> {poolInfo.token0}</p>
            <p><strong>Token 1:</strong> {poolInfo.token1}</p>
            <p><strong>Reserve 0:</strong> {formatUnits(poolInfo.reserve0, 18)}</p>
            <p><strong>Reserve 1:</strong> {formatUnits(poolInfo.reserve1, 18)}</p>
            <p><strong>Total LP Tokens:</strong> {formatUnits(poolInfo.totalLPTokens, 18)}</p>
          </div>
        )}

        {userPosition && (
          <div style={styles.infoBox}>
            <h4>Your Position</h4>
            <p><strong>LP Tokens:</strong> {formatUnits(userPosition.lpTokens, 18)}</p>
            <p><strong>Token 0 Deposited:</strong> {formatUnits(userPosition.token0Deposited, 18)}</p>
            <p><strong>Token 1 Deposited:</strong> {formatUnits(userPosition.token1Deposited, 18)}</p>
          </div>
        )}

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
  infoBox: {
    marginTop: "1rem",
    padding: "0.75rem",
    backgroundColor: "#e8f0ff",
    borderRadius: "4px",
    fontSize: "0.9rem",
  },
};
