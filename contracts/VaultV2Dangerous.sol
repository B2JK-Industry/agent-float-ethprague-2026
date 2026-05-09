// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title VaultV2Dangerous - deliberately unsafe upgrade of VaultV1
/// @notice The danger is two-pronged: an incompatible storage layout AND a new
///         privileged selector. The verdict engine (US-029) must classify this
///         upgrade as SIREN, and Stream B's storage-layout diff (US-027) and
///         ABI risky-selector diff (US-026) must independently flag both
///         hazards. This contract is intentionally not for production use.
/// @dev    Storage incompatibility is achieved by swapping V1's slot 0
///         (`owner`) and slot 1 (`balances`). Existing V1 owner data living
///         at slot 0 of the proxy storage would be reinterpreted as the
///         head of the `balances` mapping after upgrade — silently breaking
///         the trust assumptions of every prior depositor.
contract VaultV2Dangerous is Initializable {
    /// @dev storage slot 0 (V1 had `owner` here; reordered intentionally)
    mapping(address account => uint256 balance) public balances;

    /// @dev storage slot 1 (V1 had `balances` here; reordered intentionally)
    address public owner;

    error NotOwner();
    error TransferFailed();

    function initialize(address initialOwner) external initializer {
        owner = initialOwner;
    }

    /// @notice WARNING: dangerous selector
    ///         Drains the entire ERC20 balance of this contract to an arbitrary
    ///         recipient, callable by `owner` with no timelock, no allowance
    ///         check, no per-user accounting reconciliation. A compromised or
    ///         malicious owner can sweep all user-deposited tokens in a single
    ///         transaction. This selector is the canonical example of a
    ///         privileged escape hatch that the verdict engine must flag.
    /// @param  token ERC20 token contract whose entire balance will be moved.
    /// @param  to    Recipient of the swept tokens.
    function sweep(address token, address to) external {
        if (msg.sender != owner) revert NotOwner();
        uint256 bal = IERC20(token).balanceOf(address(this));
        bool ok = IERC20(token).transfer(to, bal);
        if (!ok) revert TransferFailed();
    }
}
