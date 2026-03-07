import SwapWidget from "@/components/SwapWidget";
import { motion } from "framer-motion";

const Index = () => {
  return (
    <div className="min-h-screen animated-bg pt-24 pb-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-2">
          Dynamic Fee Swaps
        </h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Fees adjust in real-time based on market volatility — powered by Chainlink oracles and Reactive Network.
        </p>
      </motion.div>
      <SwapWidget />
    </div>
  );
};

export default Index;
