import { useState } from "react";
import { ArrowDownUp, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import VolatilityMeter from "./VolatilityMeter";

const tokens = ["ETH", "USDC", "WBTC", "DAI", "UNI", "LINK"];

type FeeState = "low" | "medium" | "high";

const feeConfig: Record<FeeState, { label: string; color: string; emoji: string; value: string }> = {
  low: { label: "LOW", color: "text-success", emoji: "🟢", value: "0.05%" },
  medium: { label: "MEDIUM", color: "text-warning", emoji: "🟡", value: "0.30%" },
  high: { label: "HIGH", color: "text-destructive", emoji: "🔴", value: "1.00%" },
};

const SwapWidget = () => {
  const [tokenIn, setTokenIn] = useState("ETH");
  const [tokenOut, setTokenOut] = useState("USDC");
  const [amountIn, setAmountIn] = useState("");
  const [feeState] = useState<FeeState>("low");
  const [volatilityScore] = useState(24);

  const fee = feeConfig[feeState];

  const handleFlip = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-2xl p-6 glow-blue"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-foreground">Swap</h2>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full glass text-xs font-semibold ${fee.color}`}>
            {fee.emoji} {fee.label} {fee.value}
          </div>
        </div>

        {/* Token In */}
        <div className="bg-muted/50 rounded-xl p-4 mb-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-muted-foreground">You pay</span>
            <span className="text-xs text-muted-foreground">Balance: 4.2</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              placeholder="0.0"
              className="flex-1 bg-transparent text-2xl font-bold text-foreground outline-none placeholder:text-muted-foreground/50"
            />
            <TokenSelector value={tokenIn} onChange={setTokenIn} tokens={tokens} />
          </div>
        </div>

        {/* Flip Button */}
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
            <span className="text-xs text-muted-foreground">Balance: 12,450</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={amountIn ? (parseFloat(amountIn) * 2450.5).toFixed(2) : ""}
              readOnly
              placeholder="0.0"
              className="flex-1 bg-transparent text-2xl font-bold text-foreground outline-none placeholder:text-muted-foreground/50"
            />
            <TokenSelector value={tokenOut} onChange={setTokenOut} tokens={tokens} />
          </div>
        </div>

        {/* Swap Button */}
        <button className="w-full mt-6 py-4 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold text-lg transition-all hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] glow-blue">
          SWAP
        </button>
      </motion.div>

      <VolatilityMeter score={volatilityScore} percentage="2.4%" />
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
              onClick={() => { onChange(t); setOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                t === value ? "bg-primary/20 text-primary" : "hover:bg-muted/50 text-foreground"
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
