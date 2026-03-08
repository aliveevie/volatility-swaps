# VolSwap

**Dynamic fee swaps powered by volatility.**

VolSwap is a [Uniswap v4](https://github.com/Uniswap/v4-core) hook that sets **volatility-based swap fees** in real time. Fees are updated off the critical path by [Reactive Network](https://reactive.network) from [Chainlink](https://chain.link) price events—no oracle calls during swaps, no keepers, and full transparency for traders and LPs.

---

## Links

| | |
|---|---|
| **Live app** | [**https://volswap.ibxlab.com/**](https://volswap.ibxlab.com/) |
| **Demo video** | [**Watch on YouTube**](https://youtu.be/nqqz2GRha0I) |
| **Repository** | [**github.com/aliveevie/volatility-swaps**](https://github.com/aliveevie/volatility-swaps) |

---

## Overview

Static LP fees don’t match market reality: in calm markets they overcharge; in volatile markets they undercharge for risk. VolSwap replaces a single fixed fee with a **cached dynamic fee** that adapts to current volatility:

- **beforeSwap** — The hook returns a pre-cached fee from storage (no Chainlink call in the swap path).
- **Fee updates** — Reactive Smart Contracts (RSCs) subscribe to Chainlink `AnswerUpdated` events, compute a volatility-based tier, and push it to the hook via a callback contract.
- **Tiers** — LOW / MEDIUM / HIGH map to configurable basis points (e.g. 0.05%, 0.30%, 1.00%).

Traders get predictable execution cost; LPs get better compensation when volatility is high; and the UI shows the live fee tier and last update timestamp from chain.

---

## Architecture

End-to-end flow: **Chainlink → Reactive Network → VolSwap Hook → Uniswap v4 Pool Manager**.

```mermaid
flowchart TB
    subgraph Frontend[" "]
        UI[React App]
    end

    subgraph Uniswap["Uniswap v4"]
        PM[Pool Manager]
    end

    subgraph VolSwap["VolSwap"]
        Hook[VolSwapHook]
        Cache[("cachedFee")]
        Hook --> Cache
    end

    subgraph Reactive["Reactive Network"]
        RSC[Reactive Smart Contract]
        Callback[VolSwapCallback]
        RSC --> Callback
    end

    subgraph Oracles["Chainlink"]
        Feed[ETH/USD Price Feed]
    end

    UI <-->|swap / add liquidity| PM
    PM -->|beforeSwap()| Hook
    Hook -->|return fee| PM
    Feed -->|AnswerUpdated| RSC
    Callback -->|updateFee()| Hook
    Hook --> Cache
```

**Layers:**

| Layer | Role |
|-------|------|
| **Uniswap v4** | Pool Manager; calls hook `beforeSwap()` for dynamic fee. |
| **VolSwapHook** | Returns `cachedFee` in `beforeSwap()`; accepts `updateFee()` only from Reactive callback. |
| **VolSwapCallback** | Receives Reactive callbacks and calls `hook.updateFee()`. |
| **Chainlink** | Price feed events as the volatility signal source. |
| **Reactive Network** | RSC subscribes to Chainlink, computes fee tier, triggers cross-chain callback to the hook. |
| **React frontend** | Reads `cachedFee` and `lastFeeUpdate` from the hook; shows live fee and “last update” (no mocks). |

For more detail, see [Architecture.md](./Architecture.md).

---

## Tech stack

| Area | Stack |
|------|--------|
| **Contracts** | Solidity, Foundry, Uniswap v4 (core + periphery) |
| **Frontend** | React, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| **Web3** | Wagmi, viem, Web3Modal (WalletConnect) |
| **Data** | Chainlink Data Feeds, Reactive Network |

---

## Quick start

**Prerequisites:** Node.js 18+, npm or bun.

```bash
# Clone the repository
git clone https://github.com/aliveevie/volatility-swaps.git
cd volatility-swaps

# Install dependencies
npm install

# Configure environment (see .env.example)
cp .env.example .env
# Set VITE_VOLSWAP_HOOK_ADDRESS and VITE_VOLSWAP_CALLBACK_ADDRESS for Sepolia

# Run the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), connect a wallet, and switch to **Sepolia** to see the live fee from the deployed hook.

**Contracts (Foundry):**

```bash
cd contracts
forge install
forge test
# Deploy (Sepolia): FOUNDRY_PROFILE=deploy forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC --broadcast
```

See [contracts/README.md](./contracts/README.md) for deploy steps and env vars.

---

## Project structure

```
volatility-swaps/
├── src/                    # React frontend
│   ├── components/         # SwapWidget, pool, analytics UI
│   ├── hooks/              # useVolSwapHook (cachedFee, lastFeeUpdate)
│   └── lib/                # wagmi, contracts config
├── contracts/              # Solidity (Foundry)
│   ├── src/
│   │   ├── VolSwapHook.sol
│   │   └── VolSwapCallback.sol
│   └── script/Deploy.s.sol
├── Architecture.md         # Detailed architecture and flows
└── SLIDES.md               # Presentation outline
```

---

## Deployed (Sepolia)

| Contract | Address |
|----------|---------|
| VolSwapHook | `0x749f402499B619016954a89fa352c89987D967db` |
| VolSwapCallback | `0x4DcD780bB70C5A87406133De1FFd51a0c0CCFB24` |

---

## License & credits

Built for the **Uniswap Hook Incubator (UHI) Hookathon — Specialized Markets** track.

**Partners:** Uniswap v4 · Chainlink · Reactive Network.
