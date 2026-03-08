import { motion } from "framer-motion";
import { CheckCircle, Activity, TrendingUp } from "lucide-react";
import { useVolSwapHook, feeBpsToTier, formatLastFeeUpdate } from "@/hooks/useVolSwapHook";
import { useChainlinkPrice } from "@/hooks/useChainlinkPrice";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const Analytics = () => {
  const { cachedFee, lastFeeUpdate, isLiveData, feeHistory } = useVolSwapHook();
  const { price: ethPrice, updatedAt: priceUpdatedAt } = useChainlinkPrice();
  const tier = isLiveData ? feeBpsToTier(cachedFee) : null;
  const lastUpdateStr = formatLastFeeUpdate(lastFeeUpdate);
  const priceUpdateStr = formatLastFeeUpdate(priceUpdatedAt);

  // Use accumulated fee history, or single point as fallback
  const chartData =
    feeHistory.length > 0
      ? feeHistory
      : isLiveData
      ? [{ time: "now", fee: parseFloat((tier?.value || "0").replace("%", "")), bps: cachedFee, timestamp: Date.now() }]
      : [];

  return (
    <div className="min-h-screen animated-bg pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-5xl">
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-3xl font-bold gradient-text mb-8"
        >
          Analytics
        </motion.h1>

        {/* Status bar */}
        <div className="flex flex-wrap gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-xl px-5 py-3 flex items-center gap-3"
          >
            <CheckCircle className="w-4 h-4 text-success" />
            <span className="text-sm text-foreground font-medium">Hook fee update</span>
            <span className="text-xs text-muted-foreground">
              {isLiveData ? lastUpdateStr : "Connect on Sepolia"}
            </span>
          </motion.div>

          {ethPrice > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="glass rounded-xl px-5 py-3 flex items-center gap-3"
            >
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground font-medium">
                ETH/USD ${ethPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-muted-foreground">
                Chainlink ({priceUpdateStr})
              </span>
            </motion.div>
          )}

          {isLiveData && tier && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-xl px-5 py-3 flex items-center gap-3"
            >
              <Activity className="w-4 h-4 text-accent" />
              <span className="text-sm text-foreground font-medium">
                Current tier: {tier.label} ({tier.value})
              </span>
              <span className="text-xs text-muted-foreground">
                {cachedFee} bps
              </span>
            </motion.div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Fee history chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-strong rounded-2xl p-5"
          >
            <h3 className="text-sm font-bold text-foreground mb-4">
              Fee History (live session)
            </h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(228 20% 18%)"
                  />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10, fill: "hsl(220 10% 55%)" }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(220 10% 55%)" }}
                    domain={[0, 1.1]}
                    ticks={[0.05, 0.3, 1.0]}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(228 28% 10% / 0.9)",
                      border: "1px solid hsl(228 20% 18%)",
                      borderRadius: "8px",
                      fontSize: 12,
                      color: "hsl(220 20% 90%)",
                    }}
                    formatter={(value: number) => [`${value}%`, "Fee"]}
                  />
                  <ReferenceLine
                    y={0.05}
                    stroke="hsl(142 71% 45%)"
                    strokeDasharray="3 3"
                    label={{ value: "LOW", fill: "hsl(142 71% 45%)", fontSize: 10 }}
                  />
                  <ReferenceLine
                    y={0.3}
                    stroke="hsl(38 92% 50%)"
                    strokeDasharray="3 3"
                    label={{ value: "MED", fill: "hsl(38 92% 50%)", fontSize: 10 }}
                  />
                  <ReferenceLine
                    y={1.0}
                    stroke="hsl(0 84% 60%)"
                    strokeDasharray="3 3"
                    label={{ value: "HIGH", fill: "hsl(0 84% 60%)", fontSize: 10 }}
                  />
                  <Line
                    type="stepAfter"
                    dataKey="fee"
                    stroke="hsl(228 90% 64%)"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "hsl(228 90% 64%)" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Connect wallet on Sepolia to stream live fee data from the VolSwap
                hook.
              </p>
            )}
            {chartData.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-2 text-center">
                Polls every 15s. Fee data accumulates during this browser session.
              </p>
            )}
          </motion.div>

          {/* Volatility / architecture info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-strong rounded-2xl p-5"
          >
            <h3 className="text-sm font-bold text-foreground mb-4">
              How VolSwap Works
            </h3>
            <div className="space-y-4 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <span className="text-primary font-bold shrink-0">1.</span>
                <p>
                  <strong className="text-foreground">Chainlink</strong> publishes
                  ETH/USD price via AnswerUpdated events.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-primary font-bold shrink-0">2.</span>
                <p>
                  <strong className="text-foreground">Reactive Network</strong> RSC
                  listens to the event, computes volatility delta, and maps it to a
                  fee tier.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-primary font-bold shrink-0">3.</span>
                <p>
                  RSC triggers a <strong className="text-foreground">callback</strong>{" "}
                  that pushes the new fee to the VolSwap hook on-chain.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-primary font-bold shrink-0">4.</span>
                <p>
                  <strong className="text-foreground">beforeSwap()</strong> returns
                  the cached fee instantly -- no oracle call during swaps.
                </p>
              </div>
              <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs">
                <strong className="text-foreground">Fee tiers:</strong>
                <br />
                LOW (&le;1% delta) = 0.05% | MEDIUM (&le;5%) = 0.30% | HIGH (&gt;5%) =
                1.00%
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
