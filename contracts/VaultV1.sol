// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";

/// @title VaultV1 - baseline implementation behind the Upgrade Siren demo proxy
/// @notice Minimal Initializable upgradeable vault. Storage slot 0 is `owner`,
///         slot 1 is the `balances` mapping. Initializable (OZ v5) uses
///         ERC-7201 namespaced storage, so slot 0 is free for `owner`.
/// @dev    No privileged selectors beyond the `owner` slot. This is the safe
///         baseline that Stream B's storage-layout diff (US-027) compares
///         V2Safe (US-004) and V2Dangerous (US-005) against.
contract VaultV1 is Initializable {
    /// @dev storage slot 0
    address public owner;

    /// @dev storage slot 1
    mapping(address account => uint256 balance) public balances;

    event Deposit(address indexed account, uint256 amount);
    event Withdrawal(address indexed account, uint256 amount);

    error NotEnoughBalance(uint256 requested, uint256 available);
    error TransferFailed();
    error ZeroOwner();

    function initialize(address initialOwner) external initializer {
        if (initialOwner == address(0)) revert ZeroOwner();
        owner = initialOwner;
    }

    function deposit() external payable {
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        uint256 available = balances[msg.sender];
        if (amount > available) revert NotEnoughBalance(amount, available);
        balances[msg.sender] = available - amount;
        (bool ok,) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Withdrawal(msg.sender, amount);
    }

    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }
}
