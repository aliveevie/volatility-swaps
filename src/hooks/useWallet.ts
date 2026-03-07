import { useState, useEffect, useCallback } from "react";
import { modal } from "@/lib/web3modal";

interface WalletState {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
}

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    isConnected: false,
    chainId: null,
  });

  const updateState = useCallback(() => {
    const address = modal.getAddress();
    const isConnected = modal.getIsConnected();
    const chainId = modal.getChainId();
    setWallet({
      address: address ?? null,
      isConnected: !!isConnected,
      chainId: chainId ? Number(chainId) : null,
    });
  }, []);

  useEffect(() => {
    updateState();

    const unsub = modal.subscribeEvents(() => {
      // Small delay to let web3modal internal state settle
      setTimeout(updateState, 100);
    });

    // Also poll briefly since events can be unreliable
    const interval = setInterval(updateState, 2000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [updateState]);

  const connect = useCallback(() => {
    modal.open();
  }, []);

  const disconnect = useCallback(() => {
    modal.close();
    // Reset state
    setWallet({ address: null, isConnected: false, chainId: null });
  }, []);

  const shortenedAddress = wallet.address
    ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
    : null;

  return {
    ...wallet,
    shortenedAddress,
    connect,
    disconnect,
  };
}
