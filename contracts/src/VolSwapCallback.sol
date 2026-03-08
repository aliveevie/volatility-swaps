// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IVolSwapHook} from "./interfaces/IVolSwapHook.sol";

/// @title VolSwapCallback
/// @notice Receives fee updates from Reactive Network and forwards to VolSwapHook
contract VolSwapCallback {
    IVolSwapHook public immutable hook;
    address public reactiveCaller;

    error Unauthorized();

    modifier onlyReactiveCaller() {
        if (msg.sender != reactiveCaller) revert Unauthorized();
        _;
    }

    constructor(IVolSwapHook _hook, address _reactiveCaller) {
        hook = _hook;
        reactiveCaller = _reactiveCaller;
    }

    /// @notice Forward fee update to the hook (callable only by Reactive Network or configured caller)
    function updateFee(uint24 newFee) external onlyReactiveCaller {
        hook.updateFee(newFee);
    }
}
