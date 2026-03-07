import { useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import AddLiquidityModal from "@/components/AddLiquidityModal";

const stats = [
  { label: "TVL", value: "$12.4M" },
  { label: "24h Volume", value: "$3.2M" },
  { label: "Current APR", value: "18.7%" },
  { label: "Active Fee Tier", value: "0.05%" },
];

const positions = [
  { pair: "ETH / USDC", liquidity: "$24,500", fees: "$1,230", il: "-0.8%" },
  { pair: "WBTC / ETH", liquidity: "$18,200", fees: "$890", il: "-1.2%" },
  { pair: "UNI / ETH", liquidity: "$8,900", fees: "$420", il: "-0.3%" },
];

const Pool = () => {
  const [modalOpen, setModalOpen] = useState(false);

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
                    <th key={h} className="text-left text-xs text-muted-foreground font-medium px-5 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr key={p.pair} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-4 text-sm font-semibold text-foreground">{p.pair}</td>
                    <td className="px-5 py-4 text-sm text-foreground">{p.liquidity}</td>
                    <td className="px-5 py-4 text-sm text-success font-medium">{p.fees}</td>
                    <td className="px-5 py-4 text-sm text-destructive font-medium">{p.il}</td>
                  </tr>
                ))}
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
