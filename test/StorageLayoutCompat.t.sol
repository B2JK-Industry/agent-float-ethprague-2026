// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title StorageLayoutCompatTest - stub for V1 vs V2Safe layout-compat assertion
/// @notice US-008 replaces this stub with the full Foundry assertion that
///         VaultV2Safe slots 0 and 1 match VaultV1 exactly. Until then this
///         stub merely exists to satisfy the US-004 acceptance criterion that
///         a layout-compat assertion test stub be committed.
contract StorageLayoutCompatTest {
    function testLayoutCompatStub() external pure {
        // intentional no-op; full layout assertion ships in US-008.
    }
}
