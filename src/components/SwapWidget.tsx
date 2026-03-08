import { useState, useEffect } from "react";
import { ArrowDownUp, ChevronDown, Loader2, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import VolatilityMeter from "./VolatilityMeter";
import { useVolSwapHook, feeBpsToTier, formatLastFeeUpdate } from "@/hooks/useVolSwapHook";
import { useWallet } from "@/hooks/useWallet";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useSwap } from "@/hooks/useSwap";
import { useChainlinkPrice } from "@/hooks/useChainlinkPrice";
import { TOKENS, getToken, SEPOLIA_CHAIN_ID_NUMBER, SWAP_ROUTER_ADDRESS } from "@/lib/contracts";
import { toast } from "sonner";

const FEE_CONFIG = {
  LOW: { label: "LOW", color: "text-success", emoji: "🟢", value: "0.05%" },
  MEDIUM: { label: "MEDIUM", color: "text-warning", emoji: "🟡", value: "0.30%" },
  HIGH: { label: "HIGH", color: "text-destructive", emoji: "🔴", value: "1.00%" },
} as const;

const SwapWidget = () => {
  const [tokenInSymbol, setTokenInSymbol] = useState("ETH");
  const [tokenOutSymbol, setTokenOutSymbol] = useState("USDC");
  const [amountIn, setAmountIn] = useState("");
  const { isConnected, chainId, connect } = useWallet();
  const { cachedFee, lastFeeUpdate, loading: hookLoading, isLiveData } = useVolSwapHook();
  const { price: ethPrice } = useChainlinkPrice();
  const { executeSwap, status: swapStatus, txHash, error: swapError, reset: resetSwap } = useSwap();

  const tokenIn = getToken(tokenInSymbol);
  const tokenOut = getToken(tokenOutSymbol);
  const balanceIn = useTokenBalance(tokenIn?.address || "");
  const balanceOut = useTokenBalance(tokenOut?.address || "");

  const tier = isLiveData ? feeBpsToTier(cachedFee) : null;
  const fee = tier ? FEE_CONFIG[tier.label] : null;
  const volatilityScore = tier ? (tier.label === "LOW" ? 20 : tier.label === "MEDIUM" ? 50 : 85) : 0;
  const percentageStr = fee ? fee.value : "--";
  const lastUpdateStr = isLiveData ? formatLastFeeUpdate(lastFeeUpdate) : "--";
  const isSepolia = chainId === SEPOLIA_CHAIN_ID_NUMBER;

  // Estimate output using Chainlink ETH/USD price and the dynamic fee
  const estimatedOutput = (() => {
    if (!amountIn || isNaN(Number(amountIn)) || Number(amountIn) <= 0) return "";
    if (!isLiveData || ethPrice <= 0) return "";

    const amt = Number(amountIn);
    const feeRatio = cachedFee / 1_000_000; // bps → decimal ratio
    const sellingEth = tokenInSymbol === "ETH";

    if (sellingEth) {
      // ETH → USDC: multiply by price, subtract fee
      const out = amt * ethPrice * (1 - feeRatio);
      return out.toFixed(2);
    } else {
      // USDC → ETH: divide by price, subtract fee
      const out = (amt / ethPrice) * (1 - feeRatio);
      return out.toFixed(6);
    }
  })();

  // Show toast on swap result
  useEffect(() => {
    if (swapStatus === "success" && txHash) {
      toast.success("Swap successful!", {
        description: `Tx: ${txHash.slice(0, 10)}...`,
        action: {
          label: "View",
          onClick: () =>
            window.open(`https://sepolia.etherscan.io/tx/${txHash}`, "_blank"),
        },
      });
      setAmountIn("");
      resetSwap();
    }
    if (swapStatus === "error" && swapError) {
      toast.error("Swap failed", { description: swapError.slice(0, 120) });
      resetSwap();
    }
  }, [swapStatus, txHash, swapError, resetSwap]);

  const handleFlip = () => {
    setTokenInSymbol(tokenOutSymbol);
    setTokenOutSymbol(tokenInSymbol);
    setAmountIn("");
  };

  const handleSwap = async () => {
    if (!tokenIn || !tokenOut) return;
    if (!amountIn || Number(amountIn) <= 0) {
      toast.error("Enter an amount");
      return;
    }
    await executeSwap(tokenIn, tokenOut, amountIn);
  };

  const isSwapping = swapStatus === "approving" || swapStatus === "swapping";

  // Button label and state
  const getButtonConfig = () => {
    if (!isConnected) return { label: "Connect Wallet", onClick: connect, disabled: false };
    if (!isSepolia) return { label: "Switch to Sepolia", onClick: () => {}, disabled: true };
    if (!SWAP_ROUTER_ADDRESS)
      return { label: "Router Not Deployed", onClick: () => {}, disabled: true };
    if (isSwapping)
      return {
        label: swapStatus === "approving" ? "Approving..." : "Swapping...",
        onClick: () => {},
        disabled: true,
      };
    if (!amountIn || Number(amountIn) <= 0)
      return { label: "Enter Amount", onClick: () => {}, disabled: true };
    return { label: "SWAP", onClick: handleSwap, disabled: false };
  };

  const btn = getButtonConfig();
  const availableTokens = TOKENS.filter(
    (t) => t.symbol !== tokenOutSymbol && t.address
  ).map((t) => t.symbol);
  const availableTokensOut = TOKENS.filter(
    (t) => t.symbol !== tokenInSymbol && t.address
  ).map((t) => t.symbol);

  return (
    <div className="w-full max-w-md mx-auto">
      {isConnected && !isSepolia && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 rounded-xl glass border border-warning/50 flex items-center justify-between gap-3"
        >
          <span className="text-sm text-muted-foreground">
            Switch to Sepolia to use VolSwap
          </span>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-2xl p-6 glow-blue"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-foreground">Swap</h2>
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full glass text-xs font-semibold ${
              fee ? fee.color : "text-muted-foreground"
            }`}
          >
            {hookLoading
              ? "..."
              : fee
              ? (
                  <>
                    {fee.emoji} {fee.label} {fee.value}
                  </>
                )
              : "Connect on Sepolia"}
          </div>
        </div>

        {/* Chainlink price */}
        {ethPrice > 0 && (
          <div className="text-xs text-muted-foreground mb-4 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            ETH/USD: ${ethPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            <span className="text-[10px]">(Chainlink)</span>
          </div>
        )}

        {/* Token In */}
        <div className="bg-muted/50 rounded-xl p-4 mb-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-muted-foreground">You pay</span>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => {
                if (balanceIn.formatted !== "0.0") setAmountIn(balanceIn.formatted);
              }}
            >
              Balance: {isConnected && isSepolia ? balanceIn.formatted : "--"}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              inputMode="decimal"
              value={amountIn}
              onChange={(e) => {
                const v = e.target.value;
                if (/^[0-9]*\.?[0-9]*$/.test(v)) setAmountIn(v);
              }}
              placeholder="0.0"
              className="flex-1 bg-transparent text-2xl font-bold text-foreground outline-none placeholder:text-muted-foreground/50"
            />
            <TokenSelector
              value={tokenInSymbol}
              onChange={setTokenInSymbol}
              tokens={availableTokens}
            />
          </div>
        </div>

        {/* Flip */}
        <div className="flex justify-center -my-2 relative z-10">
          <button
            onClick={handleFlip}
            className="p-2 rounded-xl bg-muted border-4 border-background hover:bg-primary/20 transition-colors"
          >
            <ArrowDownUp className="w-4 h-4 text-primary" />
          </button>
        </div>

        {/* Token Out */}
        <div className="bg-muted/50 rounded-xl p-4 mt-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-muted-foreground">You receive</span>
            <span className="text-xs text-muted-foreground">
              Balance: {isConnected && isSepolia ? balanceOut.formatted : "--"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={estimatedOutput}
              readOnly
              placeholder="0.0"
              className="flex-1 bg-transparent text-2xl font-bold text-foreground outline-none placeholder:text-muted-foreground/50"
            />
            <TokenSelector
              value={tokenOutSymbol}
              onChange={setTokenOutSymbol}
              tokens={availableTokensOut}
            />
          </div>
        </div>

        {/* Fee breakdown */}
        {amountIn && estimatedOutput && isLiveData && (
          <div className="mt-3 px-2 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Rate</span>
              <span>1 ETH = ${ethPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Dynamic fee</span>
              <span>{percentageStr}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Fee source</span>
              <span>Reactive Network</span>
            </div>
          </div>
        )}

        {/* Swap Button */}
        <button
          onClick={btn.onClick}
          disabled={btn.disabled}
          className={`w-full mt-6 py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
            btn.disabled
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] glow-blue"
          }`}
        >
          {isSwapping && <Loader2 className="w-5 h-5 animate-spin" />}
          {btn.label}
        </button>

        {/* Tx link */}
        {txHash && (
          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 mt-3 text-xs text-primary hover:underline"
          >
            View transaction <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </motion.div>

      <VolatilityMeter
        score={volatilityScore}
        percentage={percentageStr}
        lastUpdate={lastUpdateStr}
      />
    </div>
  );
};

const TokenSelector = ({
  value,
  onChange,
  tokens,
}: {
  value: string;
  onChange: (v: string) => void;
  tokens: string[];
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-background/80 hover:bg-background transition-colors text-sm font-semibold"
      >
        {value}
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute right-0 top-full mt-1 glass-strong rounded-xl p-2 min-w-[120px] z-20"
        >
          {tokens.map((t) => (
            <button
              key={t}
              onClick={() => {
                onChange(t);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                t === value
                  ? "bg-primary/20 text-primary"
                  : "hover:bg-muted/50 text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default SwapWidget;
