import { useConnect, useAccount, useDisconnect, useNetwork, useSwitchNetwork } from "wagmi";
import { injected } from "wagmi/connectors";

export default function WalletConnect() {
  const { connect, isLoading } = useConnect({
    connector: injected(),
  });
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();

  return (
    <div style={styles.container}>
      {!isConnected ? (
        <button onClick={() => connect()} disabled={isLoading} style={styles.connectBtn}>
          {isLoading ? "Connecting..." : "Connect Wallet"}
        </button>
      ) : (
        <div style={styles.connected}>
          <p style={styles.text}>
            <strong>Connected:</strong> {address?.substring(0, 6)}...{address?.substring(address.length - 4)}
          </p>
          <p style={styles.text}>
            <strong>Network:</strong> {chain?.name || "Unknown"}
          </p>
          {chain?.id !== 5003 && (
            <button onClick={() => switchNetwork?.(5003)} style={styles.switchBtn}>
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
