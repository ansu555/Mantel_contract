import { useConnect, useAccount, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { injected } from "wagmi/connectors";

export default function WalletConnect() {
  const { connectors, connect, isLoading } = useConnect();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const injectedConnector = connectors.find((c) => c.id === "injected");

  return (
    <div style={styles.container}>
      {!isConnected ? (
        <button
          onClick={() => injectedConnector && connect({ connector: injectedConnector })}
          disabled={isLoading}
          style={styles.connectBtn}
        >
          {isLoading ? "Connecting..." : "Connect Wallet"}
        </button>
      ) : (
        <div style={styles.connected}>
          <p style={styles.text}>
            <strong>Connected:</strong> {address?.substring(0, 6)}...{address?.substring(address.length - 4)}
          </p>
          <p style={styles.text}>
            <strong>Network:</strong> {chainId === 5003 ? "Mantle Sepolia" : `Chain ${chainId}`}
          </p>
          {chainId !== 5003 && (
            <button onClick={() => switchChain?.({ chainId: 5003 })} style={styles.switchBtn}>
              Switch to Mantle Sepolia
            </button>
          )}
          <button onClick={() => disconnect()} style={styles.disconnectBtn}>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "flex-end",
    padding: "1rem",
    backgroundColor: "#f0f0f0",
    borderBottom: "1px solid #ddd",
  },
  connectBtn: {
    padding: "0.75rem 1.5rem",
    backgroundColor: "#0070f3",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "1rem",
    fontWeight: "bold",
  },
  connected: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  text: {
    margin: "0",
    fontSize: "0.95rem",
  },
  switchBtn: {
    padding: "0.5rem 1rem",
    backgroundColor: "#ff9500",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  disconnectBtn: {
    padding: "0.5rem 1rem",
    backgroundColor: "#f3333a",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
};
