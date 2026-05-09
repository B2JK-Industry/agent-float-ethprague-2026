// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {VaultV1} from "../contracts/VaultV1.sol";
import {VaultV2Dangerous} from "../contracts/VaultV2Dangerous.sol";

/// @notice Minimal ERC20 used to exercise V2Dangerous.sweep without pulling
///         in OZ's full ERC20 implementation. Internal-only test fixture.
contract MockERC20 {
    string public name = "Mock";
    string public symbol = "MCK";
    uint8 public decimals = 18;
    mapping(address => uint256) public balanceOf;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "insufficient");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

/// @notice Mechanizes the dangerous-fixture safety claim: layout is genuinely
///         incompatible with V1 (slots 0 and 1 swapped) AND `sweep` is a
///         privileged escape hatch callable by `owner` that drains ERC20
///         balances. Both must hold for the verdict engine to flag SIREN.
contract VaultV2DangerousTest is Test {
    function testSlot0IsReorderedRelativeToV1() public {
        address fixedOwner = makeAddr("fixedOwner");

        VaultV1 v1 = new VaultV1();
        v1.initialize(fixedOwner);

        VaultV2Dangerous d = new VaultV2Dangerous();
        d.initialize(fixedOwner);

        bytes32 slot0V1 = vm.load(address(v1), bytes32(uint256(0)));
        bytes32 slot0D = vm.load(address(d), bytes32(uint256(0)));

        // V1 stores owner at slot 0, dangerous stores `balances` mapping head at
        // slot 0 (which is empty until populated). With identical owner input,
        // byte equivalence at slot 0 must NOT hold.
        assertTrue(slot0V1 != slot0D, "slot 0 unexpectedly matches V1 (fixture not dangerous)");
        // And owner moved to slot 1 in dangerous:
        bytes32 slot1D = vm.load(address(d), bytes32(uint256(1)));
        assertEq(
            slot1D,
            bytes32(uint256(uint160(fixedOwner))),
            "dangerous owner not at slot 1"
        );
    }

    function testSweepDrainsErc20WhenOwner() public {
        address ownerAddr = address(this);
        address recipient = makeAddr("recipient");

        VaultV2Dangerous d = new VaultV2Dangerous();
        d.initialize(ownerAddr);

        MockERC20 token = new MockERC20();
        token.mint(address(d), 1_000_000 ether);

        d.sweep(address(token), recipient);

        assertEq(token.balanceOf(address(d)), 0, "vault not drained");
        assertEq(token.balanceOf(recipient), 1_000_000 ether, "recipient did not receive sweep");
    }

    function testSweepRevertsForNonOwner() public {
        address ownerAddr = makeAddr("realOwner");
        address attacker = makeAddr("attacker");
        address recipient = makeAddr("recipient");

        VaultV2Dangerous d = new VaultV2Dangerous();
        d.initialize(ownerAddr);

        MockERC20 token = new MockERC20();
        token.mint(address(d), 100 ether);

        vm.expectRevert(VaultV2Dangerous.NotOwner.selector);
        vm.prank(attacker);
        d.sweep(address(token), recipient);
    }
}
