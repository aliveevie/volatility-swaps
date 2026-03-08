# VolSwap Contracts

Foundry project for VolSwap hook, callback, and supporting infrastructure (Uniswap v4).

## Setup

- Install [Foundry](https://book.getfoundry.sh/getting-started/installation).
- Submodules: from repo root run `git submodule update --init --recursive` if needed.

## Build & Test

```bash
cd contracts
forge build
forge test
```

## Deploy to Sepolia

Use environment variables only (never commit keys).

### Step 1: Deploy VolSwapHook + Callback

```bash
cd contracts
source ../.env 2>/dev/null || true
FOUNDRY_PROFILE=deploy forge script script/Deploy.s.sol \
  --rpc-url "$SEPOLIA_RPC_URL" --broadcast
```

Copy the printed addresses into `.env`:
- `VITE_VOLSWAP_HOOK_ADDRESS`
- `VITE_VOLSWAP_CALLBACK_ADDRESS`

### Step 2: Deploy Swap & Liquidity Routers

```bash
forge script script/DeployTestRouter.s.sol \
  --rpc-url "$SEPOLIA_RPC_URL" --broadcast
```

Copy the printed addresses into `.env`:
- `VITE_SWAP_ROUTER_ADDRESS`
- `VITE_LIQUIDITY_ROUTER_ADDRESS`

### Step 3: Deploy Mock Token + Create Pool

First deploy a MockERC20 (or use an existing test token) and set `VITE_TOKEN1_ADDRESS` in `.env`.

Then create the pool and seed initial liquidity:

```bash
source ../.env
forge script script/CreatePool.s.sol \
  --rpc-url "$SEPOLIA_RPC_URL" --broadcast
```

This initializes an ETH/Token1 pool with the VolSwap hook and seeds full-range liquidity.

## Contracts

| Contract | Description |
|---|---|
| `VolSwapHook.sol` | Core Uniswap v4 hook — returns dynamic fee from cached value |
| `VolSwapCallback.sol` | Reactive Network callback receiver — pushes fee updates to hook |
| `MockERC20.sol` | Simple mintable ERC-20 for testnet pool seeding |
| `interfaces/IVolSwapHook.sol` | Public interface for the hook |

## Scripts

| Script | Description |
|---|---|
| `Deploy.s.sol` | Deploy hook + callback with CREATE2 salt mining |
| `DeployTestRouter.s.sol` | Deploy PoolSwapTest + PoolModifyLiquidityTest |
| `CreatePool.s.sol` | Initialize pool with hook + seed liquidity |

## Addresses

- Sepolia PoolManager: `0xE03A1074c86CFeDd5C142C4F04F1a1536e203543`
- Chainlink ETH/USD (Sepolia): `0x694AA1769357215DE4FAC081bf1f309aDC325306`
