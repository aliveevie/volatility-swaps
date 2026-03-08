/**
 * Contract addresses, ABIs, token config, and pool key for VolSwap.
 * Addresses loaded from env (set after deploying to Sepolia).
 */

// ── Chain ────────────────────────────────────────────────────────────────────
export const SEPOLIA_CHAIN_ID_NUMBER = 11155111;

// ── Addresses (from .env) ────────────────────────────────────────────────────
export const VOLSWAP_HOOK_ADDRESS =
  (import.meta.env.VITE_VOLSWAP_HOOK_ADDRESS as string) || "";

export const VOLSWAP_CALLBACK_ADDRESS =
  (import.meta.env.VITE_VOLSWAP_CALLBACK_ADDRESS as string) || "";

export const POOL_MANAGER_ADDRESS =
  (import.meta.env.VITE_POOL_MANAGER_ADDRESS as string) ||
  "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";

export const SWAP_ROUTER_ADDRESS =
  (import.meta.env.VITE_SWAP_ROUTER_ADDRESS as string) || "";

export const LIQUIDITY_ROUTER_ADDRESS =
  (import.meta.env.VITE_LIQUIDITY_ROUTER_ADDRESS as string) || "";

export const CHAINLINK_ETH_USD_FEED =
  (import.meta.env.VITE_CHAINLINK_ETH_USD_FEED as string) ||
  "0x694AA1769357215DE4FAC081bf1f309aDC325306";

// ── Token addresses ──────────────────────────────────────────────────────────
const TOKEN1_ADDRESS = (import.meta.env.VITE_TOKEN1_ADDRESS as string) || "";

export const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";

export interface TokenConfig {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  isNative: boolean;
}

export const TOKENS: TokenConfig[] = [
  { symbol: "ETH", name: "Ether", address: ADDRESS_ZERO, decimals: 18, isNative: true },
  { symbol: "USDC", name: "Mock USDC", address: TOKEN1_ADDRESS, decimals: 6, isNative: false },
];

export function getToken(symbol: string): TokenConfig | undefined {
  return TOKENS.find((t) => t.symbol === symbol);
}

// ── Pool Key ─────────────────────────────────────────────────────────────────
export const DYNAMIC_FEE_FLAG = 0x800000;
export const POOL_TICK_SPACING = 60;

export function getPoolKey() {
  const token0 = ADDRESS_ZERO;
  const token1 = TOKEN1_ADDRESS;
  if (!token1) return null;
  return {
    currency0: token0,
    currency1: token1,
    fee: DYNAMIC_FEE_FLAG,
    tickSpacing: POOL_TICK_SPACING,
    hooks: VOLSWAP_HOOK_ADDRESS,
  };
}

// ── Price limits for swaps ───────────────────────────────────────────────────
export const MIN_SQRT_PRICE_LIMIT = BigInt("4295128740"); // MIN_SQRT_PRICE + 1
export const MAX_SQRT_PRICE_LIMIT = BigInt(
  "1461446703485210103287273052203988822378723970341"
); // MAX_SQRT_PRICE - 1

// ── ABIs ─────────────────────────────────────────────────────────────────────

/** VolSwapHook — read cached fee, last update, staleness, reactive callback */
export const VOLSWAP_HOOK_ABI = [
  {
    type: "function",
    name: "cachedFee",
    inputs: [],
    outputs: [{ name: "", type: "uint24" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "lastFeeUpdate",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "stalenessThreshold",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "reactiveCallback",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "FeeUpdated",
    inputs: [
      { name: "oldFee", type: "uint24", indexed: false },
      { name: "newFee", type: "uint24", indexed: false },
      { name: "updatedBy", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "FeeApplied",
    inputs: [
      { name: "fee", type: "uint24", indexed: false },
      { name: "sender", type: "address", indexed: true },
    ],
  },
] as const;

/** PoolSwapTest — swap() */
export const POOL_SWAP_TEST_ABI = [
  {
    type: "function",
    name: "swap",
    inputs: [
      {
        name: "key",
        type: "tuple",
        components: [
          { name: "currency0", type: "address" },
          { name: "currency1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
      },
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "zeroForOne", type: "bool" },
          { name: "amountSpecified", type: "int256" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
      {
        name: "testSettings",
        type: "tuple",
        components: [
          { name: "takeClaims", type: "bool" },
          { name: "settleUsingBurn", type: "bool" },
        ],
      },
      { name: "hookData", type: "bytes" },
    ],
    outputs: [{ name: "delta", type: "int256" }],
    stateMutability: "payable",
  },
] as const;

/** PoolModifyLiquidityTest — modifyLiquidity() */
export const POOL_MODIFY_LIQUIDITY_TEST_ABI = [
  {
    type: "function",
    name: "modifyLiquidity",
    inputs: [
      {
        name: "key",
        type: "tuple",
        components: [
          { name: "currency0", type: "address" },
          { name: "currency1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
      },
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tickLower", type: "int24" },
          { name: "tickUpper", type: "int24" },
          { name: "liquidityDelta", type: "int256" },
          { name: "salt", type: "bytes32" },
        ],
      },
      { name: "hookData", type: "bytes" },
    ],
    outputs: [{ name: "delta", type: "int256" }],
    stateMutability: "payable",
  },
] as const;

/** Minimal ERC-20 ABI */
export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
] as const;

/** Chainlink AggregatorV3 — latestRoundData + decimals */
export const CHAINLINK_ABI = [
  {
    type: "function",
    name: "latestRoundData",
    inputs: [],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
] as const;

/** PoolManager — initialize() for CreatePool script reference */
export const POOL_MANAGER_ABI = [
  {
    type: "function",
    name: "initialize",
    inputs: [
      {
        name: "key",
        type: "tuple",
        components: [
          { name: "currency0", type: "address" },
          { name: "currency1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
      },
      { name: "sqrtPriceX96", type: "uint160" },
    ],
    outputs: [{ name: "tick", type: "int24" }],
    stateMutability: "nonpayable",
  },
] as const;
