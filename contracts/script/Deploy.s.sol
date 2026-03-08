// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {VolSwapHook} from "../src/VolSwapHook.sol";
import {VolSwapCallback} from "../src/VolSwapCallback.sol";
import {IVolSwapHook} from "../src/interfaces/IVolSwapHook.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";

contract DeployScript is Script {
    // Sepolia PoolManager (from Uniswap v4 deployments)
    address constant SEPOLIA_POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;

    uint24 constant INITIAL_FEE_BPS = 500;      // 0.05%
    uint256 constant STALENESS_THRESHOLD = 3600; // 1 hour
    uint256 constant LOW_VOL_THRESHOLD = 1e16;   // 1% (for documentation)
    uint256 constant HIGH_VOL_THRESHOLD = 5e16;   // 5%

    function run() external {
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0));
        if (deployerPrivateKey == 0) {
            revert("Set PRIVATE_KEY in env (e.g. source .env). Never commit .env.");
        }
        address deployer = vm.addr(deployerPrivateKey);

        IPoolManager poolManager = IPoolManager(SEPOLIA_POOL_MANAGER);
        address reactiveCallback = deployer;

        bytes memory creationCode = type(VolSwapHook).creationCode;
        bytes memory constructorArgs = abi.encode(
            poolManager,
            reactiveCallback,
            INITIAL_FEE_BPS,
            STALENESS_THRESHOLD,
            LOW_VOL_THRESHOLD,
            HIGH_VOL_THRESHOLD
        );
        bytes memory initCode = abi.encodePacked(creationCode, constructorArgs);
        bytes32 initCodeHash = keccak256(initCode);
        uint160 requiredFlags = uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG);
        uint160 flagMask = uint160(0x3FFF); // lower 14 bits cover all hook flags

        // When always_use_create_2_factory is true in foundry.toml, Foundry uses this for {salt: salt}
        address create2Deployer = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
        bytes32 salt;
        bool found;
        for (uint256 i = 0; i < 10_000_000; i++) {
            salt = bytes32(i);
            address predicted = address(
                uint160(
                    uint256(
                        keccak256(
                            abi.encodePacked(
                                bytes1(0xff),
                                create2Deployer,
                                salt,
                                initCodeHash
                            )
                        )
                    )
                )
            );
            // Ensure EXACTLY the required flags — no extra flags set
            if (uint160(predicted) & flagMask == requiredFlags) {
                found = true;
                break;
            }
        }
        if (!found) revert("HookMiner: no salt found in range. Increase loop or use external miner.");

        vm.startBroadcast(deployerPrivateKey);

        VolSwapHook hook = new VolSwapHook{salt: salt}(
            poolManager,
            reactiveCallback,
            INITIAL_FEE_BPS,
            STALENESS_THRESHOLD,
            LOW_VOL_THRESHOLD,
            HIGH_VOL_THRESHOLD
        );

        VolSwapCallback callback = new VolSwapCallback(IVolSwapHook(address(hook)), deployer);
        hook.setReactiveCallback(address(callback));

        vm.stopBroadcast();

        console.log("VolSwapHook:", address(hook));
        console.log("VolSwapCallback:", address(callback));
    }
}
