import { useState, useCallback } from "react";
import { BrowserProvider, Contract, parseUnits, formatUnits, MaxUint256 } from "ethers";
import { modal } from "@/lib/web3modal";
import {
  SWAP_ROUTER_ADDRESS,
  POOL_SWAP_TEST_ABI,
  ERC20_ABI,
  SEPOLIA_CHAIN_ID_NUMBER,
  MIN_SQRT_PRICE_LIMIT,
  MAX_SQRT_PRICE_LIMIT,
  getPoolKey,
  type TokenConfig,
} from "@/lib/contracts";

export type SwapStatus = "idle" | "approving" | "swapping" | "success" | "error";

export interface SwapState {
  status: SwapStatus;
  txHash: string | null;
  error: string | null;
}

/** Known Uniswap v4 revert selectors */
const REVERT_SELECTORS: Record<string, string> = {
  "0x2229d0b4": "PoolNotInitialized — pool key may not match the deployed pool",
  "0xdc98354e": "HookNotImplemented — hook address flags mismatch",
  "0x3a2f5962": "PriceLimitAlreadyExceeded",
  "0x584f9719": "InvalidSqrtPrice",
  "0x1a783b8d": "SwapAmountCannotBeZero",
  "0x849eaf98": "CurrencyNotSettled — router failed to settle tokens",
};

function decodeRevertReason(data: string): string | null {
  if (!data || data.length < 10) return null;
  const selector = data.slice(0, 10).toLowerCase();
  return REVERT_SELECTORS[selector] || null;
}

export function useSwap() {
  const [state, setState] = useState<SwapState>({
    status: "idle",
    txHash: null,
    error: null,
  });

  const executeSwap = useCallback(
    async (tokenIn: TokenConfig, tokenOut: TokenConfig, amountIn: string) => {
      const walletProvider = modal.getWalletProvider();
      const address = modal.getAddress();
      const chainId = Number(modal.getChainId());

      if (!walletProvider || !address || chainId !== SEPOLIA_CHAIN_ID_NUMBER) {
        setState({ status: "error", txHash: null, error: "Connect wallet on Sepolia" });
        return;
      }
      if (!SWAP_ROUTER_ADDRESS) {
        setState({
          status: "error",
          txHash: null,
          error: "Swap router not deployed. Set VITE_SWAP_ROUTER_ADDRESS in .env",
        });
        return;
      }

      const poolKey = getPoolKey();
      if (!poolKey) {
        setState({ status: "error", txHash: null, error: "Pool not configured" });
        return;
      }

      try {
        const provider = new BrowserProvider(walletProvider);
        const signer = await provider.getSigner();
        const amountWei = parseUnits(amountIn, tokenIn.decimals);

        // Check wallet balance before attempting swap
        if (tokenIn.isNative) {
          const ethBalance = await provider.getBalance(address);
          // Need amountWei + some gas buffer (~0.005 ETH)
          const gasBuffer = parseUnits("0.005", 18);
          if (ethBalance < amountWei + gasBuffer) {
            const bal = formatUnits(ethBalance, 18);
            setState({
              status: "error",
              txHash: null,
              error: `Insufficient ETH. Balance: ${Number(bal).toFixed(4)} ETH. Need ${amountIn} ETH + gas.`,
            });
            return;
          }
        } else {
          const tokenContract = new Contract(tokenIn.address, ERC20_ABI, provider);
          const tokenBalance = (await tokenContract.balanceOf(address)) as bigint;
          if (tokenBalance < amountWei) {
            const bal = formatUnits(tokenBalance, tokenIn.decimals);
            setState({
              status: "error",
              txHash: null,
              error: `Insufficient ${tokenIn.symbol}. Balance: ${bal}. You can mint test tokens from the Pool page.`,
            });
            return;
          }
        }

        // Determine swap direction: zeroForOne means selling currency0 for currency1
        const inIsCurrency0 =
          tokenIn.address.toLowerCase() === poolKey.currency0.toLowerCase();
        const zeroForOne = inIsCurrency0;

        // Approve ERC20 if input is not native ETH
        if (!tokenIn.isNative) {
          setState({ status: "approving", txHash: null, error: null });
          const tokenContract = new Contract(tokenIn.address, ERC20_ABI, signer);
          const currentAllowance = (await tokenContract.allowance(
            address,
            SWAP_ROUTER_ADDRESS
          )) as bigint;
          if (currentAllowance < amountWei) {
            const approveTx = await tokenContract.approve(SWAP_ROUTER_ADDRESS, MaxUint256);
            await approveTx.wait();
          }
        }

        setState({ status: "swapping", txHash: null, error: null });

        const router = new Contract(SWAP_ROUTER_ADDRESS, POOL_SWAP_TEST_ABI, signer);
        const swapParams = {
          zeroForOne,
          amountSpecified: -amountWei, // negative = exact input
          sqrtPriceLimitX96: zeroForOne ? MIN_SQRT_PRICE_LIMIT : MAX_SQRT_PRICE_LIMIT,
        };
        const testSettings = { takeClaims: false, settleUsingBurn: false };
        const txOverrides = {
          value: tokenIn.isNative ? amountWei : 0n,
        };

        // Pre-flight static call to get real revert reason
        try {
          await router.swap.staticCall(poolKey, swapParams, testSettings, "0x", txOverrides);
        } catch (simErr: any) {
          // Extract revert data
          const revertData = simErr?.data || simErr?.error?.data || "";
          const decoded = decodeRevertReason(revertData);
          const reason =
            decoded ||
            simErr?.reason ||
            (typeof revertData === "string" && revertData.length > 2
              ? `Contract reverted: ${revertData.slice(0, 66)}...`
              : "Swap simulation failed — the pool may lack liquidity or the amount is too large");
          setState({ status: "error", txHash: null, error: reason });
          return;
        }

        const tx = await router.swap(poolKey, swapParams, testSettings, "0x", txOverrides);
        const receipt = await tx.wait();

        setState({ status: "success", txHash: receipt.hash, error: null });
      } catch (err: any) {
        // Parse the error for better messages
        const errData = err?.data || err?.error?.data || "";
        const decoded = decodeRevertReason(errData);
        const reason =
          decoded ||
          err?.reason ||
          (err?.message?.includes("insufficient funds")
            ? "Insufficient ETH for gas + swap amount. Get more Sepolia ETH from a faucet."
            : err?.message?.slice(0, 150) || "Swap failed");
        setState({ status: "error", txHash: null, error: reason });
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState({ status: "idle", txHash: null, error: null });
  }, []);

  return { ...state, executeSwap, reset };
}
