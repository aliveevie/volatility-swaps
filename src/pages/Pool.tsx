import { useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import AddLiquidityModal from "@/components/AddLiquidityModal";
import { useVolSwapHook, feeBpsToTier, formatLastFeeUpdate } from "@/hooks/useVolSwapHook";
import { useChainlinkPrice } from "@/hooks/useChainlinkPrice";
import { useWallet } from "@/hooks/useWallet";
import { SEPOLIA_CHAIN_ID_NUMBER, VOLSWAP_HOOK_ADDRESS, LIQUIDITY_ROUTER_ADDRESS } from "@/lib/contracts";

const Pool = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const { cachedFee, lastFeeUpdate, isLiveData, stalenessThreshold } = useVolSwapHook();
  const { price: ethPrice } = useChainlinkPrice();
  const { isConnected, chainId } = useWallet();
  const tier = isLiveData ? feeBpsToTier(cachedFee) : null;
  const activeFeeTier = tier ? `${tier.label} (${tier.value})` : "--";
  const lastUpdateStr = isLiveData ? formatLastFeeUpdate(lastFeeUpdate) : "--";
  const isSepolia = chainId === SEPOLIA_CHAIN_ID_NUMBER;

  const stats = [
    { label: "Active Fee Tier", value: activeFeeTier },
    { label: "Fee (bps)", value: isLiveData ? `${cachedFee}` : "--" },
    { label: "Last Fee Update", value: lastUpdateStr },
    {
      label: "ETH/USD",
      value: ethPrice > 0 ? `$${ethPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "--",
    },
  ];

  return (
    <div className="min-h-screen animated-bg pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-5xl">
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-3xl font-bold gradient-text mb-8"
        >
          Pool Dashboard
        </motion.h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-xl p-4 text-center"
            >
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className="text-xl font-bold text-foreground">{s.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Hook info */}
        {isLiveData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass rounded-xl p-4 mb-8"
          >
            <h3 className="text-sm font-bold text-foreground mb-3">Hook Contract</h3>
            <div className="grid md:grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div>
                <span className="text-foreground font-medium">Address: </span>
                <a
                  href={`https://sepolia.etherscan.io/address/${VOLSWAP_HOOK_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {VOLSWAP_HOOK_ADDRESS.slice(0, 10)}...{VOLSWAP_HOOK_ADDRESS.slice(-8)}
                </a>
              </div>
              <div>
                <span className="text-foreground font-medium">Staleness threshold: </span>
                {stalenessThreshold > 0 ? `${stalenessThreshold}s` : "--"}
              </div>
            </div>
          </motion.div>
        )}

        {/* Positions */}
        <div className="glass-strong rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-border/50">
            <h2 className="text-lg font-bold text-foreground">Your Positions</h2>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-semibold transition-all hover:opacity-90"
            >
              <Plus className="w-4 h-4" /> Add Liquidity
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/30">
                  {["Pair", "Liquidity", "Fees Earned", "Est. IL"].map((h) => (
                    <th
                      key={h}
                      className="text-left text-xs text-muted-foreground font-medium px-5 py-3"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-8 text-center text-sm text-muted-foreground"
                  >
                    {!isConnected
                      ? "Connect wallet to view positions."
                      : !isSepolia
                      ? "Switch to Sepolia to view positions."
                      : !LIQUIDITY_ROUTER_ADDRESS
                      ? "Deploy the liquidity router to manage positions."
                      : "No positions found. Add liquidity to get started."}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AddLiquidityModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
};

export default Pool;
