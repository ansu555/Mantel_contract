import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import WalletConnect from "./components/WalletConnect";
import PoolInfo from "./components/PoolInfo";
import AddLiquidity from "./components/AddLiquidity";
import Swap from "./components/Swap";
import MultiHopSwap from "./components/MultiHopSwap";
import { config } from "./wagmi";

const queryClient = new QueryClient();

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <div style={styles.container}>
        <header style={styles.header}>
          <h1>🌊 Mantle DEX Test UI</h1>
          <WalletConnect />
        </header>

        <main style={styles.main}>
          <div style={styles.notice}>
            <strong>ℹ️ Testing Interface:</strong> This UI is for testing pool creation, liquidity management, and swaps on Mantle Sepolia testnet.
          </div>

          <section style={styles.section}>
            <h2>Pool Information</h2>
            <PoolInfo />
          </section>

          <section style={styles.section}>
            <h2>Add Liquidity</h2>
            <AddLiquidity />
          </section>

          <section style={styles.section}>
            <h2>Swap Tokens (Direct)</h2>
            <Swap />
          </section>

          <section style={styles.section}>
            <h2>Multi-Hop Swap (Advanced)</h2>
            <MultiHopSwap />
          </section>

          <section style={styles.section}>
            <h2>Instructions</h2>
            <div style={styles.instructions}>
              <ol>
                <li>Connect your wallet (MetaMask) to Mantle Sepolia</li>
                <li>Get testnet MNT from the faucet: <a href="https://faucet.sepolia.mantle.xyz" target="_blank" rel="noreferrer">https://faucet.sepolia.mantle.xyz</a></li>
                <li>Deploy test tokens and pools using Hardhat from the root directory</li>
                <li>Update contract addresses in <code>frontend/src/config.js</code></li>
                <li>Use the forms above to test pool operations</li>
              </ol>
            </div>
          </section>

          <footer style={styles.footer}>
            <p>
              <strong>Network:</strong> Mantle Sepolia (Chain ID: 5003) |
              <strong> RPC:</strong> https://rpc.sepolia.mantle.xyz |
              <strong> Explorer:</strong> <a href="https://explorer.sepolia.mantle.xyz" target="_blank" rel="noreferrer">https://explorer.sepolia.mantle.xyz</a>
            </p>
          </footer>
        </main>
      </div>
      </QueryClientProvider>
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
  notice: {
    padding: "1rem",
    backgroundColor: "#e3f2fd",
    border: "1px solid #90caf9",
    borderRadius: "4px",
    marginBottom: "2rem",
  },
  section: {
    marginBottom: "3rem",
  },
  instructions: {
    padding: "1rem",
    backgroundColor: "#f5f5f5",
    borderRadius: "4px",
    lineHeight: 1.6,
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

