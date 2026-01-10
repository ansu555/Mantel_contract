import { WagmiProvider } from "wagmi";
import WalletConnect from "./components/WalletConnect";
import CreatePool from "./components/CreatePool";
import AddLiquidity from "./components/AddLiquidity";
import RemoveLiquidity from "./components/RemoveLiquidity";
import Swap from "./components/Swap";
import PoolInfo from "./components/PoolInfo";
import { config } from "./wagmi";
import "./App.css";

export default function App() {
  return (
    <WagmiProvider config={config}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1>Mantle DEX Test UI</h1>
          <WalletConnect />
        </header>

        <main style={styles.main}>
          <section style={styles.section}>
            <h2>Pool Management</h2>
            <CreatePool />
            <PoolInfo />
          </section>

          <section style={styles.section}>
            <h2>Liquidity</h2>
            <AddLiquidity />
            <RemoveLiquidity />
          </section>

          <section style={styles.section}>
            <h2>Trading</h2>
            <Swap />
          </section>

          <footer style={styles.footer}>
            <p>
              <strong>Network:</strong> Mantle Sepolia (Chain ID: 5003)
            </p>
            <p>
              <strong>RPC:</strong> https://rpc.sepolia.mantle.xyz
            </p>
            <p>
              <strong>Faucet:</strong> <a href="https://faucet.sepolia.mantle.xyz" target="_blank" rel="noreferrer">https://faucet.sepolia.mantle.xyz</a>
            </p>
          </footer>
        </main>
      </div>
    </WagmiProvider>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#fff",
    fontFamily: "sans-serif",
  },
  header: {
    backgroundColor: "#003d99",
    color: "white",
    padding: "1.5rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  main: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "2rem",
  },
  section: {
    marginBottom: "3rem",
  },
  footer: {
    marginTop: "3rem",
    padding: "2rem",
    backgroundColor: "#f5f5f5",
    borderTop: "1px solid #ddd",
    textAlign: "center",
    fontSize: "0.9rem",
  },
};
