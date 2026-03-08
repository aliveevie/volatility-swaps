import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BrowserProvider, Contract, parseUnits, MaxUint256 } from "ethers";
import { modal } from "@/lib/web3modal";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import {
  LIQUIDITY_ROUTER_ADDRESS,
  POOL_MODIFY_LIQUIDITY_TEST_ABI,
  ERC20_ABI,
  ADDRESS_ZERO,
  SEPOLIA_CHAIN_ID_NUMBER,
  getPoolKey,
  getToken,
} from "@/lib/contracts";
import { toast } from "sonner";

interface AddLiquidityModalProps {
  open: boolean;
  onClose: () => void;
}

type LiqStatus = "idle" | "approving" | "adding" | "success" | "error";

const AddLiquidityModal = ({ open, onClose }: AddLiquidityModalProps) => {
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [status, setStatus] = useState<LiqStatus>("idle");

  const ethBalance = useTokenBalance(ADDRESS_ZERO);
  const token1 = getToken("USDC");
  const usdcBalance = useTokenBalance(token1?.address || "");

  const chainId = Number(modal.getChainId());
  const isSepolia = chainId === SEPOLIA_CHAIN_ID_NUMBER;

  useEffect(() => {
    if (!open) {
      setAmountA("");
      setAmountB("");
      setStatus("idle");
    }
  }, [open]);

  const handleAddLiquidity = async () => {
    const walletProvider = modal.getWalletProvider();
    const address = modal.getAddress();
    const currentChainId = Number(modal.getChainId());

    if (!walletProvider || !address || currentChainId !== SEPOLIA_CHAIN_ID_NUMBER) {
      toast.error("Connect wallet on Sepolia");
      return;
    }
    if (!LIQUIDITY_ROUTER_ADDRESS) {
      toast.error("Liquidity router not deployed. Set VITE_LIQUIDITY_ROUTER_ADDRESS in .env");
      return;
    }
    const poolKey = getPoolKey();
    if (!poolKey) {
      toast.error("Pool not configured. Set VITE_TOKEN1_ADDRESS in .env");
      return;
    }
    if (!amountA || !amountB || Number(amountA) <= 0 || Number(amountB) <= 0) {
      toast.error("Enter amounts for both tokens");
      return;
    }

    try {
      const provider = new BrowserProvider(walletProvider);
      const signer = await provider.getSigner();

      // Approve token B (USDC) if not native
      if (token1 && !token1.isNative) {
        setStatus("approving");
        const tokenContract = new Contract(token1.address, ERC20_ABI, signer);
        const allowance = (await tokenContract.allowance(
          address,
          LIQUIDITY_ROUTER_ADDRESS
        )) as bigint;
        const amountBWei = parseUnits(amountB, token1.decimals);
        if (allowance < amountBWei) {
          const tx = await tokenContract.approve(LIQUIDITY_ROUTER_ADDRESS, MaxUint256);
          await tx.wait();
        }
      }

      setStatus("adding");
      const router = new Contract(
        LIQUIDITY_ROUTER_ADDRESS,
        POOL_MODIFY_LIQUIDITY_TEST_ABI,
        signer
      );

      // Full-range liquidity: tickLower = -887220, tickUpper = 887220 (multiples of 60)
      const params = {
        tickLower: -887220,
        tickUpper: 887220,
        liquidityDelta: parseUnits(amountA, 18), // Use ETH amount as liquidity delta proxy
        salt: "0x0000000000000000000000000000000000000000000000000000000000000000",
      };

      const ethValue = parseUnits(amountA, 18);
      const tx = await router.modifyLiquidity(poolKey, params, "0x", {
        value: ethValue,
      });
      await tx.wait();

      setStatus("success");
      toast.success("Liquidity added successfully!");
      setTimeout(() => onClose(), 1500);
    } catch (err: any) {
      setStatus("error");
      toast.error("Failed to add liquidity", {
        description: (err?.reason || err?.message || "Unknown error").slice(0, 120),
      });
    }
  };

  const isWorking = status === "approving" || status === "adding";

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
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {!LIQUIDITY_ROUTER_ADDRESS && (
              <div className="mb-4 p-3 rounded-xl bg-warning/10 border border-warning/30 text-sm text-warning">
                Liquidity router not deployed yet. Deploy PoolModifyLiquidityTest and set
                VITE_LIQUIDITY_ROUTER_ADDRESS.
              </div>
            )}

            <div className="space-y-4">
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex justify-between mb-2">
                  <label className="text-xs text-muted-foreground">ETH</label>
                  <span className="text-xs text-muted-foreground">
                    Balance: {isSepolia ? ethBalance.formatted : "--"}
                  </span>
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.0"
                  value={amountA}
                  onChange={(e) => {
                    if (/^[0-9]*\.?[0-9]*$/.test(e.target.value)) setAmountA(e.target.value);
                  }}
                  className="w-full bg-transparent text-xl font-bold text-foreground outline-none placeholder:text-muted-foreground/50"
                />
              </div>

              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex justify-between mb-2">
                  <label className="text-xs text-muted-foreground">USDC</label>
                  <span className="text-xs text-muted-foreground">
                    Balance: {isSepolia ? usdcBalance.formatted : "--"}
                  </span>
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.0"
                  value={amountB}
                  onChange={(e) => {
                    if (/^[0-9]*\.?[0-9]*$/.test(e.target.value)) setAmountB(e.target.value);
                  }}
                  className="w-full bg-transparent text-xl font-bold text-foreground outline-none placeholder:text-muted-foreground/50"
                />
              </div>

              <div className="text-xs text-muted-foreground px-1">
                Full-range position. The VolSwap hook applies dynamic fees automatically.
              </div>

              <button
                onClick={handleAddLiquidity}
                disabled={isWorking || !LIQUIDITY_ROUTER_ADDRESS}
                className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  isWorking || !LIQUIDITY_ROUTER_ADDRESS
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 glow-violet"
                }`}
              >
                {isWorking && <Loader2 className="w-5 h-5 animate-spin" />}
                {status === "approving"
                  ? "Approving USDC..."
                  : status === "adding"
                  ? "Adding Liquidity..."
                  : "Add Liquidity"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddLiquidityModal;
