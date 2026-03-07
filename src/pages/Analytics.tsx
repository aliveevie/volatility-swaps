import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

const feeData = Array.from({ length: 24 }, (_, i) => {
  const r = Math.random();
  const fee = r < 0.5 ? 0.05 : r < 0.8 ? 0.3 : 1.0;
  return { hour: `${i}:00`, fee };
});

const volData = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i}:00`,
  volatility: +(1 + Math.random() * 5).toFixed(2),
}));

const Analytics = () => {
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

        {/* RSC Status */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl px-5 py-3 mb-8 flex items-center gap-3 w-fit"
        >
          <CheckCircle className="w-4 h-4 text-success" />
          <span className="text-sm text-foreground font-medium">Last RSC Push</span>
          <span className="text-xs text-muted-foreground">Reactive Network → Sepolia — 8s ago ✅</span>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Fee Tier Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-strong rounded-2xl p-5"
          >
            <h3 className="text-sm font-bold text-foreground mb-4">Fee Tier History (24h)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={feeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(228 20% 18%)" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "hsl(220 10% 55%)" }} interval={5} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(220 10% 55%)" }} domain={[0, 1.1]} ticks={[0.05, 0.3, 1.0]} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(228 28% 10% / 0.9)",
                    border: "1px solid hsl(228 20% 18%)",
                    borderRadius: "8px",
                    fontSize: 12,
                    color: "hsl(220 20% 90%)",
                  }}
                />
                <ReferenceLine y={0.05} stroke="hsl(142 71% 45%)" strokeDasharray="3 3" label={{ value: "LOW", fill: "hsl(142 71% 45%)", fontSize: 10, position: "left" }} />
                <ReferenceLine y={0.3} stroke="hsl(38 92% 50%)" strokeDasharray="3 3" label={{ value: "MED", fill: "hsl(38 92% 50%)", fontSize: 10, position: "left" }} />
                <ReferenceLine y={1.0} stroke="hsl(0 84% 60%)" strokeDasharray="3 3" label={{ value: "HIGH", fill: "hsl(0 84% 60%)", fontSize: 10, position: "left" }} />
                <Line
                  type="stepAfter"
                  dataKey="fee"
                  stroke="hsl(228 90% 64%)"
                  strokeWidth={2}
                  dot={false}
                  filter="drop-shadow(0 0 6px hsl(228 90% 64% / 0.6))"
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Volatility Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-strong rounded-2xl p-5"
          >
            <h3 className="text-sm font-bold text-foreground mb-4">Volatility Score (24h)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={volData}>
                <defs>
                  <linearGradient id="volGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(228 90% 64%)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(263 84% 58%)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(228 20% 18%)" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "hsl(220 10% 55%)" }} interval={5} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(220 10% 55%)" }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(228 28% 10% / 0.9)",
                    border: "1px solid hsl(228 20% 18%)",
                    borderRadius: "8px",
                    fontSize: 12,
                    color: "hsl(220 20% 90%)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="volatility"
                  stroke="hsl(263 84% 58%)"
                  strokeWidth={2}
                  fill="url(#volGradient)"
                  filter="drop-shadow(0 0 6px hsl(263 84% 58% / 0.5))"
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
