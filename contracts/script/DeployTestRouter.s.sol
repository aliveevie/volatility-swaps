// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolSwapTest} from "v4-core/test/PoolSwapTest.sol";
import {PoolModifyLiquidityTest} from "v4-core/test/PoolModifyLiquidityTest.sol";

/// @title DeployTestRouter
/// @notice Deploys PoolSwapTest + PoolModifyLiquidityTest to Sepolia for frontend integration
contract DeployTestRouterScript is Script {
    address constant SEPOLIA_POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;

    function run() external {
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0));
        if (deployerPrivateKey == 0) {
            revert("Set PRIVATE_KEY in env");
        }

        IPoolManager poolManager = IPoolManager(SEPOLIA_POOL_MANAGER);

        vm.startBroadcast(deployerPrivateKey);

        PoolSwapTest swapRouter = new PoolSwapTest(poolManager);
        PoolModifyLiquidityTest liquidityRouter = new PoolModifyLiquidityTest(poolManager);

        vm.stopBroadcast();

        console.log("PoolSwapTest (VITE_SWAP_ROUTER_ADDRESS):", address(swapRouter));
        console.log("PoolModifyLiquidityTest (VITE_LIQUIDITY_ROUTER_ADDRESS):", address(liquidityRouter));
    }
}
