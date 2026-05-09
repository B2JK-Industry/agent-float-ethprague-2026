// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {VaultV1} from "../contracts/VaultV1.sol";
import {VaultV2Safe} from "../contracts/VaultV2Safe.sol";

/// @notice Mechanizes the manual diff in US-004's verification step. Asserts
///         that V2Safe's slot 0 (owner) and slot 1 (balances mapping) produce
///         byte-identical storage to V1 under identical inputs, proving that
///         a proxy upgrade from V1 to V2Safe preserves prior storage.
contract VaultV2SafeTest is Test {
    function testSlot0OwnerLayoutMatchesV1() public {
        address fixedOwner = makeAddr("fixedOwner");

        VaultV1 v1 = new VaultV1();
        v1.initialize(fixedOwner);

        VaultV2Safe v2 = new VaultV2Safe();
        v2.initialize(fixedOwner);

        bytes32 slot0V1 = vm.load(address(v1), bytes32(uint256(0)));
        bytes32 slot0V2 = vm.load(address(v2), bytes32(uint256(0)));

        assertEq(slot0V1, slot0V2, "slot 0 layout drift between V1 and V2Safe");
        assertEq(
            slot0V1,
            bytes32(uint256(uint160(fixedOwner))),
            "slot 0 does not encode owner address"
        );
    }

    function testSlot1BalancesMappingLayoutMatchesV1() public {
        address user = makeAddr("user");
        uint256 deposit = 1 ether;

        VaultV1 v1 = new VaultV1();
        v1.initialize(address(this));
        vm.deal(user, deposit);
        vm.prank(user);
        v1.deposit{value: deposit}();

        VaultV2Safe v2 = new VaultV2Safe();
        v2.initialize(address(this));
        vm.deal(user, deposit);
        vm.prank(user);
        v2.deposit{value: deposit}();

        // Solidity mapping slot = keccak256(abi.encode(key, slotIndex)).
        bytes32 mapSlot = keccak256(abi.encode(user, uint256(1)));
        bytes32 v1Bal = vm.load(address(v1), mapSlot);
        bytes32 v2Bal = vm.load(address(v2), mapSlot);

        assertEq(v1Bal, v2Bal, "slot 1 mapping derives different storage in V2Safe");
        assertEq(uint256(v1Bal), deposit, "balance not stored at slot 1 mapping derivation");
    }

    function testNewReadFunctionGetTotalDeposits() public {
        VaultV2Safe v2 = new VaultV2Safe();
        v2.initialize(address(this));
        // depositCount is appended state; getter returns 0 on a fresh vault.
        assertEq(v2.getTotalDeposits(), 0);
    }

    function testInheritedDepositStillWorks() public {
        address user = makeAddr("user");
        VaultV2Safe v2 = new VaultV2Safe();
        v2.initialize(address(this));
        vm.deal(user, 1 ether);
        vm.prank(user);
        v2.deposit{value: 1 ether}();
        assertEq(v2.balanceOf(user), 1 ether);
    }
}
