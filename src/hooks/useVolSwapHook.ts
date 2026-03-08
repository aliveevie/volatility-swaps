import { useState, useEffect, useCallback, useRef } from "react";
import { BrowserProvider, Contract } from "ethers";
import { modal } from "@/lib/web3modal";
import {
  VOLSWAP_HOOK_ADDRESS,
  VOLSWAP_HOOK_ABI,
  SEPOLIA_CHAIN_ID_NUMBER,
} from "@/lib/contracts";

export interface FeeHistoryEntry {
  time: string;
  fee: number; // percentage, e.g. 0.05
  bps: number; // raw bps
  timestamp: number;
}

export interface VolSwapHookState {
  cachedFee: number;
  lastFeeUpdate: number;
  stalenessThreshold: number;
  loading: boolean;
  error: string | null;
  isLiveData: boolean;
  feeHistory: FeeHistoryEntry[];
}

const DEFAULT_STATE: VolSwapHookState = {
  cachedFee: 0,
  lastFeeUpdate: 0,
  stalenessThreshold: 0,
  loading: false,
  error: null,
  isLiveData: false,
  feeHistory: [],
};

const MAX_HISTORY = 50;

export function useVolSwapHook(): VolSwapHookState {
  const [state, setState] = useState<VolSwapHookState>(DEFAULT_STATE);
  const historyRef = useRef<FeeHistoryEntry[]>([]);

  const fetchHookState = useCallback(async () => {
    const walletProvider = modal.getWalletProvider();
    const chainId = Number(modal.getChainId());
    const isConnected = modal.getIsConnected();

    if (
      !walletProvider ||
      !VOLSWAP_HOOK_ADDRESS ||
      chainId !== SEPOLIA_CHAIN_ID_NUMBER
    ) {
      setState((s) => ({ ...s, ...DEFAULT_STATE, loading: false }));
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const provider = new BrowserProvider(walletProvider);
      const contract = new Contract(
        VOLSWAP_HOOK_ADDRESS,
        VOLSWAP_HOOK_ABI,
        provider
      );
      const [cachedFee, lastFeeUpdate, stalenessThreshold] = await Promise.all([
        contract.cachedFee() as Promise<bigint>,
        contract.lastFeeUpdate() as Promise<bigint>,
        contract.stalenessThreshold() as Promise<bigint>,
      ]);

      const feeBps = Number(cachedFee);
      const tier = feeBpsToTier(feeBps);
      const feePct = parseFloat(tier.value.replace("%", ""));

      // Add to history if fee changed or first entry
      const history = historyRef.current;
      const lastEntry = history[history.length - 1];
      const now = Date.now();
      const timeStr = new Date(now).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      if (!lastEntry || lastEntry.bps !== feeBps || now - lastEntry.timestamp > 60_000) {
        const entry: FeeHistoryEntry = {
          time: timeStr,
          fee: feePct,
          bps: feeBps,
          timestamp: now,
        };
        const updated = [...history, entry].slice(-MAX_HISTORY);
        historyRef.current = updated;
      }

      setState({
        cachedFee: feeBps,
        lastFeeUpdate: Number(lastFeeUpdate),
        stalenessThreshold: Number(stalenessThreshold),
        loading: false,
        error: null,
        isLiveData: true,
        feeHistory: historyRef.current,
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        isLiveData: false,
        error: err instanceof Error ? err.message : "Failed to read hook",
      }));
    }
  }, []);

  useEffect(() => {
    fetchHookState();

    const unsub = modal.subscribeEvents(() => {
      setTimeout(fetchHookState, 200);
    });

    if (!VOLSWAP_HOOK_ADDRESS) return unsub;
    const interval = setInterval(fetchHookState, 15_000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [fetchHookState]);

  return state;
}

/** Map bps to fee tier label and percentage string */
export function feeBpsToTier(bps: number): { label: "LOW" | "MEDIUM" | "HIGH"; value: string } {
  if (bps <= 500) return { label: "LOW", value: "0.05%" };
  if (bps <= 3000) return { label: "MEDIUM", value: "0.30%" };
  return { label: "HIGH", value: "1.00%" };
}

/** Format lastFeeUpdate timestamp as "X min ago" or similar */
export function formatLastFeeUpdate(ts: number): string {
  if (!ts) return "--";
  const sec = Math.max(0, Math.floor(Date.now() / 1000 - ts));
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  return `${Math.floor(sec / 3600)} h ago`;
}
