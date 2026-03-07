import { createWeb3Modal, defaultConfig } from "@web3modal/ethers";

const projectId = "2c36ad052ffbb4d42ea115856c0fa089";

const mainnet = {
  chainId: 1,
  name: "Ethereum",
  currency: "ETH",
  explorerUrl: "https://etherscan.io",
  rpcUrl: "https://eth.llamarpc.com",
};

const sepolia = {
  chainId: 11155111,
  name: "Sepolia",
  currency: "ETH",
  explorerUrl: "https://sepolia.etherscan.io",
  rpcUrl: "https://rpc.sepolia.org",
};

const metadata = {
  name: "VolSwap",
  description: "Dynamic Fee Swaps powered by Chainlink & Reactive Network",
  url: window.location.origin,
  icons: [`${window.location.origin}/favicon.png`],
};

const ethersConfig = defaultConfig({
  metadata,
  enableEIP6963: true,
  enableInjected: true,
  enableCoinbase: true,
});

export const modal = createWeb3Modal({
  ethersConfig,
  chains: [mainnet, sepolia],
  projectId,
  enableAnalytics: false,
  themeMode: "dark",
  themeVariables: {
    "--w3m-accent": "#4F6EF7",
    "--w3m-border-radius-master": "2px",
  },
});
