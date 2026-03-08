// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {LPFeeLibrary} from "v4-core/libraries/LPFeeLibrary.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";
import {PoolModifyLiquidityTest} from "v4-core/test/PoolModifyLiquidityTest.sol";
import {ModifyLiquidityParams} from "v4-core/types/PoolOperation.sol";

/// @title CreatePool
/// @notice Creates a pool with the VolSwap hook and seeds initial liquidity
contract CreatePoolScript is Script {
    address constant SEPOLIA_POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    int24 constant TICK_SPACING = 60;

    function run() external {
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0));
        if (deployerPrivateKey == 0) {
            revert("Set PRIVATE_KEY in env");
        }

        address hookAddress = vm.envAddress("VITE_VOLSWAP_HOOK_ADDRESS");
        address token1Address = vm.envAddress("VITE_TOKEN1_ADDRESS");
        address liquidityRouterAddress = vm.envAddress("VITE_LIQUIDITY_ROUTER_ADDRESS");

        IPoolManager poolManager = IPoolManager(SEPOLIA_POOL_MANAGER);

        // Build pool key: currency0 = native ETH (address(0)), currency1 = token1
        // currency0 must be < currency1 by address. Native ETH (address(0)) is always lowest.
        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(address(0)),
            currency1: Currency.wrap(token1Address),
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(hookAddress)
        });

        // Initialize at 1:1 price (sqrtPriceX96 = 2^96)
        uint160 sqrtPriceX96 = TickMath.getSqrtPriceAtTick(0);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Initialize the pool
        int24 tick = poolManager.initialize(poolKey, sqrtPriceX96);
        console.log("Pool initialized at tick:", tick);

        // 2. Seed initial liquidity (full-range)
        PoolModifyLiquidityTest liquidityRouter = PoolModifyLiquidityTest(payable(liquidityRouterAddress));
        ModifyLiquidityParams memory params = ModifyLiquidityParams({
            tickLower: -887220, // full range (multiple of TICK_SPACING)
            tickUpper: 887220,
            liquidityDelta: 1e18,
            salt: bytes32(0)
        });

        // Send 1 ETH as initial liquidity for the native side
        liquidityRouter.modifyLiquidity{value: 1 ether}(poolKey, params, "");
        console.log("Initial liquidity seeded");

        vm.stopBroadcast();
    }
}
