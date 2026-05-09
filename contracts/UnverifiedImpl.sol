// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";

/// @title UnverifiedImpl - implementation deliberately NOT submitted to Sourcify
/// @notice Minimal vault implementation used by the unverified-upgrade demo
///         scenario. The proxy is pointed at this contract's deployed bytecode
///         without submitting source/metadata to Sourcify. The verdict engine
///         must then return SIREN per the product rule "no source, no upgrade".
/// @dev    Storage-compatible with VaultV1 (slot 0 = owner, slot 1 = balances)
///         so the proxy upgrade succeeds at the chain level; the SIREN verdict
///         is driven entirely by Sourcify returning `not_found` for the
///         deployed bytecode. Sourcify exclusion is enforced in US-007 by
///         NOT calling the verification script for this contract.
contract UnverifiedImpl is Initializable {
    /// @dev storage slot 0
    address public owner;

    /// @dev storage slot 1
    mapping(address account => uint256 balance) public balances;

    function initialize(address initialOwner) external initializer {
        owner = initialOwner;
    }
}
