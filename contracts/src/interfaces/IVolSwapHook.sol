// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Interface for VolSwapHook (view for UI; updateFee for callback)
interface IVolSwapHook {
    function cachedFee() external view returns (uint24);
    function lastFeeUpdate() external view returns (uint256);
    function reactiveCallback() external view returns (address);
    function stalenessThreshold() external view returns (uint256);
    function updateFee(uint24 newFee) external;
}
