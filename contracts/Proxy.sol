// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

/// @title Upgrade Siren demo proxy fixture (EIP-1967)
/// @notice Stock OpenZeppelin TransparentUpgradeableProxy. The implementation
///         address is stored at the EIP-1967 implementation slot
///         0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc
///         and `Upgraded(address)` is emitted on implementation changes.
/// @dev    No customization beyond OZ inheritance is intentional: a custom
///         proxy would force Stream B's EIP-1967 slot reader (US-022) to
///         special-case slot reads. Stock OZ keeps the slot canonical so the
///         reader is testable against this fixture without exceptions.
contract Proxy is TransparentUpgradeableProxy {
    constructor(address logic, address admin, bytes memory data)
        payable
        TransparentUpgradeableProxy(logic, admin, data)
    {}
}
