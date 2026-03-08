import { useState, useEffect, useCallback } from "react";
import { BrowserProvider, Contract, formatUnits } from "ethers";
import { modal } from "@/lib/web3modal";
import {
  ERC20_ABI,
  ADDRESS_ZERO,
  SEPOLIA_CHAIN_ID_NUMBER,
} from "@/lib/contracts";

export interface TokenBalance {
  raw: bigint;
  formatted: string;
  decimals: number;
}

const ZERO_BALANCE: TokenBalance = { raw: 0n, formatted: "0.0", decimals: 18 };

export function useTokenBalance(tokenAddress: string): TokenBalance {
  const [balance, setBalance] = useState<TokenBalance>(ZERO_BALANCE);

  const fetchBalance = useCallback(async () => {
    const walletProvider = modal.getWalletProvider();
    const address = modal.getAddress();
    const chainId = modal.getChainId();

    if (!walletProvider || !address || Number(chainId) !== SEPOLIA_CHAIN_ID_NUMBER) {
      setBalance(ZERO_BALANCE);
      return;
    }

    try {
      const provider = new BrowserProvider(walletProvider);

      if (!tokenAddress || tokenAddress === ADDRESS_ZERO) {
        const bal = await provider.getBalance(address);
        setBalance({
          raw: bal,
          formatted: Number(formatUnits(bal, 18)).toFixed(4),
          decimals: 18,
        });
      } else {
        const token = new Contract(tokenAddress, ERC20_ABI, provider);
        const [bal, decimals] = await Promise.all([
          token.balanceOf(address) as Promise<bigint>,
          token.decimals() as Promise<bigint>,
        ]);
        const dec = Number(decimals);
        setBalance({
          raw: bal,
          formatted: Number(formatUnits(bal, dec)).toFixed(4),
          decimals: dec,
        });
      }
    } catch {
      setBalance(ZERO_BALANCE);
    }
  }, [tokenAddress]);

  useEffect(() => {
    fetchBalance();

    // Re-fetch on wallet events
    const unsub = modal.subscribeEvents(() => {
      setTimeout(fetchBalance, 200);
    });

    const interval = setInterval(fetchBalance, 15_000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [fetchBalance]);

  return balance;
}
