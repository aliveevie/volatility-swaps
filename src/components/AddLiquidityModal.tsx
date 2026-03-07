import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AddLiquidityModalProps {
  open: boolean;
  onClose: () => void;
}

const AddLiquidityModal = ({ open, onClose }: AddLiquidityModalProps) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong rounded-2xl p-6 w-full max-w-md glow-violet"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-foreground">Add Liquidity</h3>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted/50 transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-muted/50 rounded-xl p-4">
                <label className="text-xs text-muted-foreground mb-2 block">Token A</label>
                <div className="flex items-center gap-3">
                  <input placeholder="0.0" className="flex-1 bg-transparent text-xl font-bold text-foreground outline-none placeholder:text-muted-foreground/50" />
                  <span className="px-3 py-1.5 rounded-lg bg-background/80 text-sm font-semibold">ETH</span>
                </div>
              </div>
              <div className="bg-muted/50 rounded-xl p-4">
                <label className="text-xs text-muted-foreground mb-2 block">Token B</label>
                <div className="flex items-center gap-3">
                  <input placeholder="0.0" className="flex-1 bg-transparent text-xl font-bold text-foreground outline-none placeholder:text-muted-foreground/50" />
                  <span className="px-3 py-1.5 rounded-lg bg-background/80 text-sm font-semibold">USDC</span>
                </div>
              </div>
              <button className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold transition-all hover:opacity-90 glow-violet">
                Add Liquidity
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddLiquidityModal;
