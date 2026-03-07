import { Wallet } from "lucide-react";
import { motion } from "framer-motion";

interface ConnectWalletOverlayProps {
  onConnect: () => void;
}

const ConnectWalletOverlay = ({ onConnect }: ConnectWalletOverlayProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-md"
      style={{ top: "64px" }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="glass-strong rounded-2xl p-8 max-w-sm w-full mx-4 text-center glow-blue"
      >
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-5">
          <Wallet className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Connect Your Wallet</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Please connect your wallet to interact with VolSwap — swap tokens, provide liquidity, and view analytics.
        </p>
        <button
          onClick={onConnect}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold text-sm transition-all hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] glow-blue"
        >
          Connect Wallet
        </button>
      </motion.div>
    </motion.div>
  );
};

export default ConnectWalletOverlay;
