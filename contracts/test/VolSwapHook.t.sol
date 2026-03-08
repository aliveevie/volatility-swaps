// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {VolSwapHook} from "../src/VolSwapHook.sol";
import {VolSwapCallback} from "../src/VolSwapCallback.sol";
import {IVolSwapHook} from "../src/interfaces/IVolSwapHook.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";

contract VolSwapHookTest is Test {
    VolSwapHook public hook;
    VolSwapCallback public callback;
    IPoolManager public poolManager;

    address constant POOL_MANAGER_ADDR = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address reactiveCaller;

    function setUp() public {
        poolManager = IPoolManager(POOL_MANAGER_ADDR);
        reactiveCaller = address(this);
        bytes32 salt = _mineHookSalt();
        hook = new VolSwapHook{salt: salt}(
            poolManager,
            reactiveCaller,
            500,   // 0.05%
            3600,  // 1h staleness
            1e16,  // 1% low
            5e16   // 5% high
        );
        callback = new VolSwapCallback(IVolSwapHook(address(hook)), reactiveCaller);
        // Hook must accept updates from the callback contract
        hook.setReactiveCallback(address(callback));
    }

    function _mineHookSalt() internal view returns (bytes32) {
        bytes memory creationCode = type(VolSwapHook).creationCode;
        bytes memory constructorArgs = abi.encode(
            poolManager,
            reactiveCaller,
            uint24(500),
            uint256(3600),
            uint256(1e16),
            uint256(5e16)
        );
        bytes memory initCode = abi.encodePacked(creationCode, constructorArgs);
        bytes32 initCodeHash = keccak256(initCode);
        uint160 requiredFlags = uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG);
        uint160 flagMask = uint160(0x3FFF); // lower 14 bits cover all hook flags
        // In tests we use address(this) as deployer (always_use_create_2_factory = false in profile.test)
        for (uint256 i = 0; i < 5_000_000; i++) {
            bytes32 s = bytes32(i);
            address predicted = address(uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), address(this), s, initCodeHash)))));
            if (uint160(predicted) & flagMask == requiredFlags) return s;
        }
        revert("HookMiner: no salt found");
    }

    function test_InitialFee() public view {
        assertEq(hook.cachedFee(), 500);
        assertTrue(hook.lastFeeUpdate() > 0);
        assertEq(hook.reactiveCallback(), address(callback));
    }

    function test_UpdateFee_OnlyReactive() public {
        vm.prank(address(callback));
        hook.updateFee(3000);
        assertEq(hook.cachedFee(), 3000);
    }

    function test_UpdateFee_RevertsWhenUnauthorized() public {
        vm.prank(address(0x123));
        vm.expectRevert(VolSwapHook.Unauthorized.selector);
        hook.updateFee(3000);
    }

    function test_UpdateFee_RevertsWhenOutOfBounds() public {
        vm.prank(address(callback));
        vm.expectRevert();
        hook.updateFee(50); // below MIN_FEE_BPS 100
        vm.prank(address(callback));
        vm.expectRevert();
        hook.updateFee(20000); // above MAX_FEE_BPS 10000
    }

    function test_Callback_UpdateFee() public {
        vm.prank(reactiveCaller);
        callback.updateFee(10000);
        assertEq(hook.cachedFee(), 10000);
    }

    function test_Callback_RevertsWhenUnauthorized() public {
        vm.prank(address(0x456));
        vm.expectRevert(VolSwapCallback.Unauthorized.selector);
        callback.updateFee(500);
    }
}
