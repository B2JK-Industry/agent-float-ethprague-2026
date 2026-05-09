// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {VaultV1} from "../contracts/VaultV1.sol";

contract VaultV1Test is Test {
    VaultV1 internal vault;
    address internal user;

    function setUp() public {
        vault = new VaultV1();
        vault.initialize(address(this));
        user = makeAddr("user");
        vm.deal(user, 10 ether);
    }

    function testInitializeSetsOwner() public view {
        assertEq(vault.owner(), address(this));
    }

    function testInitializeRevertsOnZero() public {
        VaultV1 fresh = new VaultV1();
        vm.expectRevert(VaultV1.ZeroOwner.selector);
        fresh.initialize(address(0));
    }

    function testInitializeRevertsOnDoubleInit() public {
        // OZ Initializable reverts on second initialize call.
        vm.expectRevert();
        vault.initialize(address(this));
    }

    function testDepositIncrementsBalance() public {
        vm.prank(user);
        vault.deposit{value: 1 ether}();
        assertEq(vault.balanceOf(user), 1 ether);
        assertEq(vault.balances(user), 1 ether);
        assertEq(address(vault).balance, 1 ether);
    }

    function testDepositMultipleAccumulates() public {
        vm.prank(user);
        vault.deposit{value: 0.5 ether}();
        vm.prank(user);
        vault.deposit{value: 0.3 ether}();
        assertEq(vault.balanceOf(user), 0.8 ether);
    }

    function testWithdrawTransfersFunds() public {
        vm.prank(user);
        vault.deposit{value: 1 ether}();

        uint256 startBalance = user.balance;
        vm.prank(user);
        vault.withdraw(0.4 ether);

        assertEq(vault.balanceOf(user), 0.6 ether);
        assertEq(user.balance, startBalance + 0.4 ether);
    }

    function testWithdrawRevertsOnInsufficient() public {
        vm.prank(user);
        vault.deposit{value: 1 ether}();

        vm.expectRevert(
            abi.encodeWithSelector(VaultV1.NotEnoughBalance.selector, 2 ether, 1 ether)
        );
        vm.prank(user);
        vault.withdraw(2 ether);
    }
}
