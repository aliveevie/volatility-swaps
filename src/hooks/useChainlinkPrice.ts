import { useState, useEffect, useCallback } from "react";
import { BrowserProvider, Contract } from "ethers";
import { modal } from "@/lib/web3modal";
import {
  CHAINLINK_ETH_USD_FEED,
  CHAINLINK_ABI,
  SEPOLIA_CHAIN_ID_NUMBER,
} from "@/lib/contracts";

export interface ChainlinkPriceState {
  price: number; // USD price (e.g. 2345.67)
  updatedAt: number; // unix timestamp
  loading: boolean;
  error: string | null;
}

const DEFAULT: ChainlinkPriceState = {
  price: 0,
  updatedAt: 0,
  loading: false,
  error: null,
};

export function useChainlinkPrice(): ChainlinkPriceState {
  const [state, setState] = useState<ChainlinkPriceState>(DEFAULT);

  const fetchPrice = useCallback(async () => {
    const walletProvider = modal.getWalletProvider();
    const chainId = Number(modal.getChainId());

    if (!walletProvider || chainId !== SEPOLIA_CHAIN_ID_NUMBER || !CHAINLINK_ETH_USD_FEED) {
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    try {
      const provider = new BrowserProvider(walletProvider);
      const feed = new Contract(CHAINLINK_ETH_USD_FEED, CHAINLINK_ABI, provider);
      const [, answer, , updatedAt] = await feed.latestRoundData();
      const decimals = await feed.decimals();
      const price = Number(answer) / 10 ** Number(decimals);
      setState({ price, updatedAt: Number(updatedAt), loading: false, error: null });
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to read Chainlink feed",
      }));
    }
  }, []);

  useEffect(() => {
    fetchPrice();

    const unsub = modal.subscribeEvents(() => {
      setTimeout(fetchPrice, 200);
    });

    const interval = setInterval(fetchPrice, 30_000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [fetchPrice]);

  return state;
}
