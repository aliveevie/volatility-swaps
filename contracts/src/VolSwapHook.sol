// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseTestHooks} from "v4-core/test/BaseTestHooks.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {SwapParams} from "v4-core/types/PoolOperation.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "v4-core/types/BeforeSwapDelta.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";
import {LPFeeLibrary} from "v4-core/libraries/LPFeeLibrary.sol";

/// @title VolSwapHook
/// @notice Uniswap v4 hook that returns a dynamic fee from cached value (pushed by Reactive callback)
contract VolSwapHook is BaseTestHooks {
    using LPFeeLibrary for uint24;

    uint24 public constant MIN_FEE_BPS = 100;   // 0.01%
    uint24 public constant MAX_FEE_BPS = 10000; // 1.00%

    uint24 public cachedFee;
    address public reactiveCallback;
    uint256 public lastFeeUpdate;
    uint256 public stalenessThreshold;
    uint256 public lowVolThreshold;
    uint256 public highVolThreshold;

    IPoolManager public immutable poolManager;

    event FeeApplied(uint24 fee, address indexed sender);
    event FeeUpdated(uint24 oldFee, uint24 newFee, address indexed updatedBy);

    error Unauthorized();
    error FeeOutOfBounds(uint24 fee);
    error HookAddressNotValid();

    modifier onlyReactiveCallback() {
        if (msg.sender != reactiveCallback) revert Unauthorized();
        _;
    }

    constructor(
        IPoolManager _poolManager,
        address _reactiveCallback,
        uint24 _initialFee,
        uint256 _stalenessThreshold,
        uint256 _lowVolThreshold,
        uint256 _highVolThreshold
    ) {
        poolManager = _poolManager;
        reactiveCallback = _reactiveCallback;
        stalenessThreshold = _stalenessThreshold;
        lowVolThreshold = _lowVolThreshold;
        highVolThreshold = _highVolThreshold;
        _setFee(_initialFee);
        // Validate hook address has EXACTLY the required flags (BEFORE_SWAP | AFTER_SWAP) — no extras
        uint160 requiredFlags = uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG);
        uint160 flagMask = uint160(0x3FFF);
        if (uint160(address(this)) & flagMask != requiredFlags) revert HookAddressNotValid();
    }

    function _setFee(uint24 newFee) internal {
        if (newFee < MIN_FEE_BPS || newFee > MAX_FEE_BPS) revert FeeOutOfBounds(newFee);
        uint24 oldFee = cachedFee;
        cachedFee = newFee;
        lastFeeUpdate = block.timestamp;
        emit FeeUpdated(oldFee, newFee, msg.sender);
    }

    /// @notice Called by Reactive Callback Contract to push new fee
    function updateFee(uint24 newFee) external onlyReactiveCallback {
        _setFee(newFee);
    }

    /// @notice Allow current reactiveCallback to transfer authority (e.g. to VolSwapCallback after deploy)
    function setReactiveCallback(address _reactiveCallback) external onlyReactiveCallback {
        reactiveCallback = _reactiveCallback;
    }

    function beforeSwap(address, PoolKey calldata, SwapParams calldata, bytes calldata)
        external
        view
        override
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        // Return cached fee with override flag so PoolManager uses it for this swap
        return (IHooks.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, cachedFee | LPFeeLibrary.OVERRIDE_FEE_FLAG);
    }

    function afterSwap(address sender, PoolKey calldata, SwapParams calldata, BalanceDelta, bytes calldata)
        external
        override
        returns (bytes4, int128)
    {
        emit FeeApplied(cachedFee, sender);
        return (IHooks.afterSwap.selector, 0);
    }
}
