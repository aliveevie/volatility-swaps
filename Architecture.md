# VolSwap Architecture v2
> Volatility-aware fees, automatically — now with Reactive Network & a full UI.

---

## Overview

VolSwap is a Uniswap v4 Hook that dynamically adjusts swap fees in real-time based on live market volatility data sourced from Chainlink Data Feeds. In v2, **Reactive Network replaces manual fee refresh logic** — Reactive Smart Contracts (RSCs) listen to on-chain Chainlink price update events and automatically push new fee tiers to VolSwap across one or multiple chains, without any manual triggers or keepers.

A **React frontend** gives traders and LPs full visibility into the live fee tier, volatility score, pool stats, and LP positions.

---

## High-Level System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          USER / TRADER                               │
│                        (React Frontend)                              │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ swap / add liquidity
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   UNISWAP V4 POOL MANAGER                            │
│                                                                      │
│   beforeSwap() ─────────────────────────────────────────────────►    │
│                                                                      │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ hook callback
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     VOLSWAP HOOK CONTRACT                            │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    FEE ENGINE (Core Logic)                   │    │
│  │                                                              │    │
│  │   1. Read cachedFee (pre-pushed by Reactive RSC)             │    │
│  │   2. Return dynamic fee to Pool Manager instantly            │    │
│  │   3. Emit FeeApplied event                                   │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                 FEE TIER CALCULATOR                          │    │
│  │                                                              │    │
│  │   LOW    volatility  →   500 bps  (0.05%)                    │    │
│  │   MEDIUM volatility  →  3000 bps  (0.30%)                    │    │
│  │   HIGH   volatility  →  10000 bps (1.00%)                    │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│   updateFee(newFee)  ◄── called by Reactive Callback Contract        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
          ▲                                        ▲
          │ reads cachedFee                        │ pushes new fee
          │                                        │
┌─────────┴──────────────┐          ┌──────────────┴───────────────────┐
│   CHAINLINK DATA FEEDS │          │       REACTIVE NETWORK           │
│                        │          │                                  │
│  • ETH/USD Price Feed  │          │  ┌────────────────────────────┐  │
│  • Emits AnswerUpdated │─────────►│  │  Reactive Smart Contract   │  │
│    event on each round │  listens │  │  (RSC)                     │  │
│                        │          │  │                            │  │
└────────────────────────┘          │  │  1. Subscribes to         │  │
                                    │  │     Chainlink events       │  │
                                    │  │  2. Computes volatility σ  │  │
                                    │  │  3. Maps σ → fee tier      │  │
                                    │  │  4. Triggers callback to   │  │
                                    │  │     VolSwap on dest chain  │  │
                                    │  └────────────────────────────┘  │
                                    │                                  │
                                    │  ┌────────────────────────────┐  │
                                    │  │  Reactive Callback Contract│  │
                                    │  │  (on destination chain)    │  │
                                    │  │                            │  │
                                    │  │  Calls updateFee() on      │  │
                                    │  │  VolSwapHook               │  │
                                    │  └────────────────────────────┘  │
                                    └──────────────────────────────────┘
                                                   │
                              ┌────────────────────┼────────────────────┐
                              │  Cross-chain sync  │  (optional)        │
                              ▼                    ▼                    ▼
                         Chain A               Chain B               Chain C
                       VolSwapHook           VolSwapHook           VolSwapHook
                      (Sepolia/Base)        (Arbitrum)            (Unichain)
```

---

## Components

### 1. VolSwapHook.sol (Core Contract)

Inherits Uniswap v4's `BaseHook`. In v2, `beforeSwap()` no longer queries Chainlink directly — it reads a **pre-cached fee** that the Reactive layer keeps fresh.

| Hook Callback | Purpose |
|---|---|
| `beforeSwap()` | Returns `cachedFee` instantly — no oracle call needed |
| `afterSwap()` | Emits `FeeApplied` event for UI and analytics |
| `updateFee()` | External function callable only by the Reactive Callback Contract |

**Key state variables:**

```solidity
uint24 public cachedFee;                  // Latest fee tier, pushed by RSC
address public reactiveCallback;          // Authorized Reactive callback address
uint256 public lastFeeUpdate;             // Timestamp of last RSC push
uint256 public stalenessThreshold;        // Fallback: revert if feed too old

// Fee tier thresholds (configurable)
uint256 public lowVolThreshold;           // e.g. 1%  price delta
uint256 public highVolThreshold;          // e.g. 5%  price delta
```

---

### 2. Reactive Smart Contract (RSC) — on Reactive Network

The RSC is deployed on the **Reactive Network** and subscribes to Chainlink's `AnswerUpdated` event.

```solidity
// Pseudo-code RSC
contract VolSwapReactive is IReactive {

    // Subscribe to Chainlink ETH/USD AnswerUpdated events
    constructor() {
        subscribe(CHAINLINK_FEED_ADDRESS, ANSWER_UPDATED_TOPIC);
    }

    // Triggered automatically when Chainlink publishes a new price round
    function react(
        uint256 chainId,
        address emitter,
        bytes calldata data
    ) external override {
        int256 newPrice = abi.decode(data, (int256));
        uint24 newFee   = computeFee(newPrice, lastPrice);
        lastPrice       = newPrice;

        // Push new fee to VolSwap on destination chain
        emit Callback(DEST_CHAIN_ID, VOLSWAP_CALLBACK_ADDR,
                      abi.encodeWithSignature("updateFee(uint24)", newFee));
    }

    function computeFee(int256 newPrice, int256 oldPrice)
        internal pure returns (uint24)
    {
        uint256 delta = abs(newPrice - oldPrice) * 100 / abs(oldPrice);
        if (delta < LOW_THRESHOLD)  return 500;
        if (delta < HIGH_THRESHOLD) return 3000;
        return 10000;
    }
}
```

---

### 3. Reactive Callback Contract (on destination chain)

A lightweight contract on the same chain as the VolSwap pool. It receives the Reactive callback and calls `updateFee()` on the hook.

```solidity
contract VolSwapCallback {
    IVolSwapHook public hook;

    modifier onlyReactiveNetwork() {
        require(msg.sender == REACTIVE_NETWORK_ADDRESS, "Unauthorized");
        _;
    }

    function updateFee(uint24 newFee) external onlyReactiveNetwork {
        hook.updateFee(newFee);
    }
}
```

---

### 4. Chainlink Integration

Chainlink serves as the **event source** rather than a pull oracle in v2.

| Feed | Purpose |
|---|---|
| `ETH/USD AggregatorV3` | Emits `AnswerUpdated` on each new price round |
| `VolatilityFeed` (if available) | Direct volatility data as alternative signal |

The RSC subscribes to the `AnswerUpdated(int256 current, uint256 roundId, uint256 updatedAt)` event — no polling, no keepers, no Chainlink Automation needed.

---

### 5. Frontend (React UI)

A clean React dashboard giving traders and LPs real-time visibility into VolSwap pool state.

#### Pages & Components

```
volswap-ui/
├── pages/
│   ├── index.tsx              # Landing / swap interface
│   ├── pool.tsx               # Pool stats & LP dashboard
│   └── analytics.tsx          # Historical fee & volatility charts
├── components/
│   ├── SwapWidget.tsx          # Core swap UI (Wagmi + Uniswap SDK)
│   ├── FeeGauge.tsx            # Live fee tier indicator (Low/Med/High)
│   ├── VolatilityMeter.tsx     # Real-time volatility score bar
│   ├── PoolStats.tsx           # TVL, volume, fee revenue
│   ├── LPDashboard.tsx         # LP positions, earned fees, IL estimate
│   ├── FeeHistory.tsx          # Recharts line chart of fee over time
│   └── ReactiveStatus.tsx      # Shows last RSC push timestamp & chain
├── hooks/
│   ├── useVolSwapHook.ts       # Reads cachedFee, lastFeeUpdate from contract
│   ├── useChainlinkPrice.ts    # Subscribes to Chainlink events via WebSocket
│   └── useReactiveStatus.ts   # Polls Reactive callback for last update time
└── lib/
    ├── wagmi.config.ts         # Wagmi chain config
    └── contracts.ts            # ABI + deployed addresses
```

#### UI Flow

```
┌──────────────────────────────────────────────────────┐
│                  VOLSWAP DASHBOARD                   │
│                                                      │
│  ┌─────────────────┐   ┌────────────────────────┐   │
│  │   SWAP WIDGET   │   │      FEE GAUGE          │   │
│  │                 │   │                        │   │
│  │  Token In  ▼    │   │   ● LOW    0.05%        │   │
│  │  Token Out ▼    │   │   ○ MEDIUM 0.30%        │   │
│  │  Amount:        │   │   ○ HIGH   1.00%        │   │
│  │                 │   │                        │   │
│  │  Current Fee:   │   │  Volatility Score: 1.2%│   │
│  │  0.05% ✅       │   │  Last Update: 12s ago  │   │
│  │                 │   │  Source: Reactive RSC  │   │
│  │  [SWAP]         │   └────────────────────────┘   │
│  └─────────────────┘                                 │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │         FEE HISTORY (24h)                    │   │
│  │   1.00% ┤         ████                       │   │
│  │   0.30% ┤  ██  ██      ██  ██                │   │
│  │   0.05% ┤██  ██          ██  ██████          │   │
│  │         └────────────────────────────────    │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │         POOL STATS                           │   │
│  │  TVL: $2.4M   │  24h Vol: $840K  │ APR: 12%  │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

#### Tech Stack (Frontend)

| Layer | Tool |
|---|---|
| Framework | React + Next.js |
| Wallet / Chain | Wagmi v2 + Viem |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Contract reads | Wagmi `useReadContract` |
| Live events | Viem `watchContractEvent` |
| State | Zustand |

---

## Data Flow (Full v2)

```
1.  Chainlink publishes new ETH/USD price round
            │
2.  AnswerUpdated event emitted on-chain
            │
3.  Reactive RSC detects event automatically
            │
4.  RSC computes volatility delta + maps to fee tier
            │
5.  RSC emits Callback → Reactive Network routes to dest chain
            │
6.  VolSwapCallback.updateFee() called on dest chain
            │
7.  VolSwapHook.cachedFee updated in storage
            │
8.  React UI reads new cachedFee via useVolSwapHook()
            │
9.  FeeGauge and FeeHistory update in real-time
            │
10. User initiates swap → beforeSwap() returns cachedFee instantly
            │
11. afterSwap() emits FeeApplied → UI confirms fee used
```

---

## Contract Structure

```
volswap/
├── src/
│   ├── VolSwapHook.sol              # Core v4 hook (reads cachedFee)
│   ├── VolSwapCallback.sol          # Reactive callback receiver
│   ├── FeeEngine.sol                # Fee tier calculation library
│   └── interfaces/
│       ├── IVolSwapHook.sol
│       └── IReactive.sol            # Reactive Network interface
├── reactive/
│   └── VolSwapReactive.sol          # RSC deployed on Reactive Network
├── test/
│   ├── VolSwapHook.t.sol
│   ├── FeeEngine.t.sol
│   ├── VolSwapCallback.t.sol
│   └── fork/
│       └── VolSwapFork.t.sol        # Mainnet fork tests
├── script/
│   ├── Deploy.s.sol                 # Deploy hook + callback
│   ├── DeployReactive.s.sol         # Deploy RSC on Reactive Network
│   └── CreatePool.s.sol
└── foundry.toml
```

---

## Security Considerations

| Risk | Mitigation |
|---|---|
| Stale cached fee | Check `lastFeeUpdate` timestamp in `beforeSwap()`; fallback to mid-tier fee if stale > threshold |
| Fake Reactive callback | `updateFee()` is gated to `onlyReactiveNetwork` modifier |
| Oracle manipulation via Chainlink | Chainlink aggregates 21+ nodes; single-source manipulation is not feasible |
| Fee griefing | Hard cap: max 10000 bps, min 100 bps, enforced in `updateFee()` |
| RSC failure / downtime | VolSwap falls back to `cachedFee` — pool continues operating, just without live updates |
| Reentrancy | `updateFee()` has no external calls; hook is stateless during swap execution |
| Admin key risk | Threshold updates behind a 48h timelock |

---

## Attack Vectors & PoC Tests (Foundry)

| Test | Description |
|---|---|
| `testOracleManipulation` | Simulate price spike, assert fee clamps at 10000 bps |
| `testSandwichAttack` | Verify high-fee regime during volatile blocks deters sandwich |
| `testStaleCache` | Simulate RSC downtime, assert fallback fee applied correctly |
| `testFakeCallback` | Call `updateFee()` from unauthorized address, assert revert |
| `testFeeBoundaries` | Assert fee never exceeds max or falls below min |
| `testCrossChainSync` | Mock Reactive callback, assert fee synced across two hook instances |
| `testForkLiveFeeds` | Fork mainnet, use real ETH/USD Chainlink feed, assert correct tier |

---

## Deployment Addresses (Testnet)

| Contract | Network | Address |
|---|---|---|
| VolSwapHook | Sepolia | `TBD` |
| VolSwapCallback | Sepolia | `TBD` |
| VolSwapReactive (RSC) | Reactive Network | `TBD` |
| PoolManager | Sepolia | Uniswap v4 official |
| ETH/USD Feed | Sepolia | `0x694AA1769357215DE4FAC081bf1f309aDC325306` |

---

## Roadmap

| Phase | Milestone |
|---|---|
| v0.1 | Core hook with static volatility thresholds |
| v0.2 | Chainlink price feed integration + 3-tier fee engine |
| v0.3 | Reactive RSC integration — event-driven fee updates |
| v0.4 | Cross-chain fee sync via Reactive (Sepolia → Arbitrum) |
| v0.5 | React frontend — swap UI + live fee gauge + LP dashboard |
| v0.6 | Circuit breaker: RSC triggers pool pause on extreme volatility |
| v1.0 | Audit + mainnet deployment on Unichain |

---

## Partner Summary

| Partner | Role |
|---|---|
| **Uniswap v4** | Hook framework + Pool Manager |
| **Chainlink** | Price feed event source (AnswerUpdated) |
| **Reactive Network** | Event-driven fee automation + cross-chain sync |

---

*Built for the Uniswap Hook Incubator (UHI) Hookathon — Specialized Markets track.*
*Eligible for: Unichain prize track · Chainlink prize track · Reactive Network prize track*