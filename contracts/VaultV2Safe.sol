// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {VaultV1} from "./VaultV1.sol";

/// @title VaultV2Safe - storage-compatible upgrade of VaultV1
/// @notice Strict storage-compatible upgrade. Slots 0 and 1 are inherited
///         unchanged from V1 (`owner`, `balances`); the only new state is
///         `depositCount` appended at slot 2. Adds the non-privileged read
///         `getTotalDeposits()`. NO new privileged selectors: no sweep,
///         setOwner, setAdmin, pause, unpause, mint, withdraw beyond V1's,
///         arbitrary call, or delegatecall. This is the SAFE upgrade scenario
///         that the verdict engine (US-029) must classify as SAFE.
contract VaultV2Safe is VaultV1 {
    /// @dev storage slot 2 (appended; existing slots unchanged)
    uint256 public depositCount;

    function getTotalDeposits() external view returns (uint256) {
        return depositCount;
    }
}
