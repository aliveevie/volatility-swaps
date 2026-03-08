import { motion } from "framer-motion";

interface VolatilityMeterProps {
  score: number; // 0-100
  percentage: string;
  lastUpdate?: string;
}

const VolatilityMeter = ({ score, percentage, lastUpdate }: VolatilityMeterProps) => {
  const getColor = () => {
    if (score < 33) return "from-success to-success";
    if (score < 66) return "from-warning to-warning";
    return "from-destructive to-destructive";
  };

  return (
    <div className="glass rounded-xl p-5 mt-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-foreground">Volatility Meter</span>
        <span className="text-sm font-bold gradient-text">{percentage}</span>
      </div>
      <div className="relative h-3 rounded-full bg-muted overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-success via-warning to-destructive opacity-20 rounded-full" />
        <motion.div
          className={`absolute top-0 left-0 h-full rounded-full bg-gradient-to-r ${getColor()}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ boxShadow: "0 0 12px currentColor" }}
        />
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-[10px] text-success font-medium">LOW</span>
        <span className="text-[10px] text-warning font-medium">MEDIUM</span>
        <span className="text-[10px] text-destructive font-medium">HIGH</span>
      </div>
      <p className="text-[11px] text-muted-foreground mt-3 text-center">
        {lastUpdate ? `Last update: ${lastUpdate} · ` : ""}Powered by Chainlink + Reactive Network
      </p>
    </div>
  );
};

export default VolatilityMeter;
