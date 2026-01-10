import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { useState } from "react";
import { POOLS_ADDRESS, POOLS_ABI, TOKEN_ADDRESSES } from "../config";
import { formatUnits } from "viem";
import { publicClient } from "../viem";

export default function PoolInfo() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const [poolId, setPoolId] = useState("0");
  const [poolInfo, setPoolInfo] = useState(null);
  const [userPosition, setUserPosition] = useState(null);
  const [poolCount, setPoolCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPoolCount = async () => {
    if (chainId !== 5003) {
      switchChain?.({ chainId: 5003 });
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const count = await publicClient.readContract({
        address: POOLS_ADDRESS,
        abi: POOLS_ABI,
        functionName: "poolCount",
      });

      setPoolCount(Number(count));
    } catch (err) {
      setError(err.message || "Failed to fetch pool count");
    } finally {
      setLoading(false);
    }
  };

  const fetchPoolInfo = async () => {
    if (!address) {
      setError("Connect wallet first");
      return;
    }

    if (chainId !== 5003) {
      switchChain?.({ chainId: 5003 });
      setError("Switched to Mantle Sepolia");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const info = await publicClient.readContract({
        address: POOLS_ADDRESS,
        abi: POOLS_ABI,
        functionName: "getPoolInfo",
        args: [BigInt(poolId)],
      });

      setPoolInfo({
        token0: info[0],
        token1: info[1],
        reserve0: info[2],
        reserve1: info[3],
        totalLPTokens: info[4],
      });

      const position = await publicClient.readContract({
        address: POOLS_ADDRESS,
        abi: POOLS_ABI,
        functionName: "getUserPosition",
        args: [BigInt(poolId), address],
      });

      setUserPosition({
        lpTokens: position[0],
        token0Deposited: position[1],
        token1Deposited: position[2],
      });
    } catch (err) {
      setError(err.message || "Failed to fetch pool info");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.card}>
      <h3>Pool Information</h3>
      <div style={styles.form}>
        <button onClick={fetchPoolCount} disabled={loading} style={styles.button}>
          {loading ? "Loading..." : "Get Total Pools"}
        </button>

        {poolCount !== null && (
          <p style={{ color: "blue", marginTop: "0.5rem" }}>
            <strong>Total Pools:</strong> {poolCount}
          </p>
        )}

        <hr style={{ margin: "1rem 0" }} />

        <label>Pool ID:</label>
        <input
          type="number"
          value={poolId}
          onChange={(e) => setPoolId(e.target.value)}
          style={styles.input}
          placeholder="0"
          min="0"
        />

        <button onClick={fetchPoolInfo} disabled={loading} style={styles.button}>
          {loading ? "Loading..." : "Get Pool Info"}
        </button>

        {poolInfo && (
          <div style={styles.infoBox}>
            <p><strong>Token 0:</strong> {poolInfo.token0.substring(0, 10)}...</p>
            <p><strong>Token 1:</strong> {poolInfo.token1.substring(0, 10)}...</p>
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

        {error && <p style={{ color: "red", marginTop: "0.5rem" }}>{error}</p>}
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
