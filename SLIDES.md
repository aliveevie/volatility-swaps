# VolSwap — Volatility-Aware Dynamic Fees on Uniswap v4

---

## Try the app — live demo

**[https://volswap.ibxlab.com/](https://volswap.ibxlab.com/)**

Connect your wallet, switch to **Sepolia**, and see the **live fee tier** and last update from the deployed VolSwap hook. No mocks — real on-chain data.

---

## The problem we're solving

**Static fees don't match market reality.**

- In calm markets, high fixed fees overcharge traders and push volume elsewhere.
- In volatile markets, low fixed fees undercharge for risk and leave LPs exposed to impermanent loss.
- LPs and traders want fees that adapt to **current volatility**, not a single number set at pool creation.

---

## What we want

- **Dynamic fees** that respond to live market volatility.
- **No manual keepers** — updates should be automatic and event-driven.
- **Low latency** — swap execution must not wait on oracle calls or off-chain jobs.
- **Transparent** — traders and LPs see the current fee tier and when it was last updated.

---

## Why Uniswap v4 hooks?

Uniswap v4 hooks let pools customize behavior at key lifecycle points:

- **beforeSwap** — can return a **dynamic LP fee** for this swap (e.g. from volatility).
- **afterSwap** — can emit events or update state after the swap.

We use the **dynamic fee** hook pattern: the pool is created with a “dynamic fee” flag, and our hook returns the actual fee in `beforeSwap()`.

---

## How our hook works (high level)

1. **Fee is pre-cached** — an authorized “Reactive” callback contract pushes the current fee tier into the hook (`updateFee(newFee)`).
2. **On every swap**, the Pool Manager calls our hook’s `beforeSwap()`.
3. **We return the cached fee** — no oracle call in the swap path, so swaps stay fast and cheap.
4. **Fee updates** happen off the critical path: Chainlink price updates → Reactive Network → callback → `updateFee()`.

---

## VolSwap hook: core flow

```
User swaps  →  Pool Manager  →  beforeSwap()  →  return cachedFee  →  swap executes with that fee
                    ↑
              afterSwap()  →  emit FeeApplied (for UI/analytics)
```

- **beforeSwap()** — returns `cachedFee` (with Uniswap’s override flag so the pool uses it).
- **afterSwap()** — emits `FeeApplied(fee, sender)` for the UI and analytics.
- **updateFee(uint24)** — only callable by the Reactive callback contract; clamps fee to min/max and updates `cachedFee` and `lastFeeUpdate`.

---

## Where does the fee come from?

We don’t read oracles inside the hook. Instead:

1. **Chainlink** publishes new ETH/USD rounds and emits `AnswerUpdated` on-chain.
2. A **Reactive Smart Contract (RSC)** on Reactive Network subscribes to that event.
3. The RSC computes a volatility measure (e.g. price delta vs previous round) and maps it to a fee tier (e.g. LOW 0.05%, MED 0.30%, HIGH 1.00%).
4. The RSC triggers a **callback** to the destination chain; the **VolSwapCallback** contract receives it and calls `hook.updateFee(newFee)`.

So: **event-driven updates, no polling, no keeper transactions** for normal operation.

---

## Fee tiers (on-chain logic)

| Volatility (e.g. price delta) | Fee tier | Fee (bps) |
|-------------------------------|----------|-----------|
| Low (e.g. &lt; 1%)            | LOW      | 500 (0.05%) |
| Medium (e.g. 1–5%)           | MEDIUM   | 3000 (0.30%) |
| High (e.g. &gt; 5%)          | HIGH     | 10000 (1.00%) |

Bounds are enforced in the hook: min 100 bps, max 10 000 bps. The RSC (or callback) can only set fees within this range.

---

## Security and robustness

- **Only the Reactive callback** can call `updateFee()` — no arbitrary address can change the fee.
- **Fee bounds** — hook reverts if fee is below 100 or above 10 000 bps.
- **No oracle in swap path** — no extra latency or failure mode during the swap.
- **Stale fee** — if the RSC stops updating, the pool keeps using the last `cachedFee`; optional staleness checks can fall back to a default tier later.

---

## How it compares to existing solutions

**Static-fee pools (Uniswap v3/v4 default)**  
- One fee for the life of the pool.  
- VolSwap: fee changes with volatility, so LPs get more fee in volatile times and traders pay less in calm times.

**Dynamic fees via in-hook oracle reads**  
- Hook calls Chainlink (or another oracle) inside `beforeSwap()`.  
- VolSwap: no oracle call in the swap path; we only read from storage (`cachedFee`). Cheaper and faster, and no oracle failure during the swap.

**Keeper-based fee updates**  
- Off-chain keeper watches volatility and sends `updateFee` transactions.  
- VolSwap: Reactive Network reacts to Chainlink events and triggers the callback; no separate keeper infra or gas paid by the protocol for periodic updates.

**Other hook projects (e.g. fee-taking hooks)**  
- Many hooks take a cut or change routing; fewer focus on **volatility-based LP fee**.  
- VolSwap: specializes in “fee tier from volatility” with a clear Chainlink → Reactive → hook pipeline and a live UI for the current tier.

---

## Tech stack (summary)

| Layer | Role |
|-------|------|
| **Uniswap v4** | Pool Manager + hook interface (beforeSwap / afterSwap, dynamic fee flag). |
| **VolSwapHook** | Returns cached fee in beforeSwap; accepts updates only from Reactive callback. |
| **VolSwapCallback** | Receives Reactive callbacks and calls `hook.updateFee()`. |
| **Chainlink** | Price feed events (AnswerUpdated) as the volatility signal source. |
| **Reactive Network** | RSC subscribes to Chainlink, computes fee tier, triggers cross-chain callback. |
| **React frontend** | Reads `cachedFee` and `lastFeeUpdate` from the hook; shows live fee tier and “last update” (no mocks). |

---

## Summary

- **Problem:** Static fees don’t adapt to volatility; we want dynamic, volatility-aware LP fees.
- **Solution:** A Uniswap v4 hook that returns a **cached** fee in `beforeSwap()`, updated off the critical path by Reactive Network from Chainlink events.
- **Benefits:** No oracle call in the swap path, event-driven updates, optional cross-chain sync, and a transparent UI for the current fee tier and last update.

**Live demo:** [https://volswap.ibxlab.com/](https://volswap.ibxlab.com/) — connect on Sepolia to see the real hook in action.

*Built for the Uniswap Hook Incubator (UHI) Hookathon — Specialized Markets track.  
Partners: Uniswap v4 · Chainlink · Reactive Network.*
