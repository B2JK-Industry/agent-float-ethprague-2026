// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {
    TransparentUpgradeableProxy,
    ITransparentUpgradeableProxy
} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {ProxyAdmin} from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import {VaultV1} from "../contracts/VaultV1.sol";
import {VaultV2Safe} from "../contracts/VaultV2Safe.sol";
import {VaultV2Dangerous} from "../contracts/VaultV2Dangerous.sol";

/// @notice End-to-end upgrade-flow tests: deploy proxy + V1, deposit, upgrade
///         to V2Safe (balances preserved) and to V2Dangerous (storage swap
///         actually corrupts the surface area). Mechanized proof that the
///         demo scenarios reproduce and that the dangerous fixture's danger
///         is real, not just NatSpec-claimed.
contract UpgradeFlowTest is Test {
    /// @dev EIP-1967 admin slot - ProxyAdmin contract address lives here.
    bytes32 internal constant ADMIN_SLOT =
        0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;

    function testUpgradeV1ToV2SafePreservesBalances() public {
        address proxyAdminOwner = address(this);
        address user = makeAddr("user");
        uint256 depositAmt = 1 ether;

        // Deploy V1 + V2Safe implementations (standalone).
        VaultV1 v1Impl = new VaultV1();
        VaultV2Safe v2Impl = new VaultV2Safe();

        // Deploy proxy with V1 as initial implementation; ProxyAdmin's owner
        // is `proxyAdminOwner`. Initialize V1 through the proxy.
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
            address(v1Impl),
            proxyAdminOwner,
            abi.encodeCall(VaultV1.initialize, (proxyAdminOwner))
        );

        // User deposits through the V1-shaped interface on the proxy.
        vm.deal(user, depositAmt);
        vm.prank(user);
        VaultV1(address(proxy)).deposit{value: depositAmt}();
        assertEq(VaultV1(address(proxy)).balanceOf(user), depositAmt, "pre-upgrade balance wrong");

        // Locate the auto-deployed ProxyAdmin via EIP-1967 admin slot and
        // upgrade to V2Safe. ProxyAdmin's owner is proxyAdminOwner == this.
        ProxyAdmin admin =
            ProxyAdmin(address(uint160(uint256(vm.load(address(proxy), ADMIN_SLOT)))));
        assertEq(admin.owner(), proxyAdminOwner, "admin owner not test contract");
        admin.upgradeAndCall(
            ITransparentUpgradeableProxy(address(proxy)), address(v2Impl), ""
        );

        // Post-upgrade: balance preserved AND new V2Safe surface is callable.
        assertEq(
            VaultV2Safe(address(proxy)).balanceOf(user),
            depositAmt,
            "user balance lost across upgrade"
        );
        assertEq(VaultV2Safe(address(proxy)).getTotalDeposits(), 0, "appended slot dirty");
    }

    /// @notice Mechanizes the danger of V1 -> V2Dangerous in the proxy upgrade
    ///         context. The standalone test in VaultV2DangerousTest exercises
    ///         a fresh-init V2Dangerous; that proves the contract behaves as
    ///         specified, but it does not show what an *upgrade* of an
    ///         already-initialized V1 proxy looks like. This test does.
    /// @dev    The V1 -> V2Dangerous slot swap means that, post-upgrade:
    ///           - V1's slot 0 (`address owner`) is interpreted by V2Dangerous
    ///             as the head of the `balances` mapping (effectively zero).
    ///           - V1's slot 1 (`mapping balances`, head zero) is interpreted
    ///             by V2Dangerous as `address owner`, recovering 0x0.
    ///         So `owner()` returns address(0) post-upgrade and `sweep` is
    ///         unreachable by any caller (msg.sender is never address(0)).
    ///         The danger is therefore not "operator can drain ERC20 balance"
    ///         in this exact swap; the danger is that the upgrade silently
    ///         orphans every prior depositor's accounting AND introduces a
    ///         new privileged selector in the ABI surface. Stream B's
    ///         storage-layout diff (US-027) and ABI risky-selector diff
    ///         (US-026) must each independently flag this as SIREN.
    function testUpgradeV1ToV2DangerousBricksOwnerOnSlotSwap() public {
        address proxyAdminOwner = address(this);
        address user = makeAddr("user");
        uint256 depositAmt = 1 ether;

        VaultV1 v1Impl = new VaultV1();
        VaultV2Dangerous dangerousImpl = new VaultV2Dangerous();

        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
            address(v1Impl),
            proxyAdminOwner,
            abi.encodeCall(VaultV1.initialize, (proxyAdminOwner))
        );
        vm.deal(user, depositAmt);
        vm.prank(user);
        VaultV1(address(proxy)).deposit{value: depositAmt}();
        assertEq(VaultV1(address(proxy)).owner(), proxyAdminOwner, "V1 owner pre-upgrade");

        ProxyAdmin admin =
            ProxyAdmin(address(uint160(uint256(vm.load(address(proxy), ADMIN_SLOT)))));
        admin.upgradeAndCall(
            ITransparentUpgradeableProxy(address(proxy)), address(dangerousImpl), ""
        );

        // Storage-swap consequence: V2Dangerous reads slot 1 as `address owner`,
        // and V1 left slot 1 as the empty balances-mapping head.
        assertEq(
            VaultV2Dangerous(address(proxy)).owner(),
            address(0),
            "V2Dangerous owner not bricked to 0x0 after upgrade"
        );

        // No caller can satisfy `msg.sender == owner` because msg.sender cannot
        // be address(0). Sweep is therefore unreachable in this exact swap.
        address fakeToken = address(0x1234);
        address attacker = makeAddr("attacker");

        vm.expectRevert(VaultV2Dangerous.NotOwner.selector);
        vm.prank(attacker);
        VaultV2Dangerous(address(proxy)).sweep(fakeToken, attacker);

        vm.expectRevert(VaultV2Dangerous.NotOwner.selector);
        VaultV2Dangerous(address(proxy)).sweep(fakeToken, proxyAdminOwner);

        // The original V1 owner data living at slot 0 is now silently
        // orphaned: V2Dangerous reads slot 0 as the balances mapping head,
        // not as an address. The address bytes are still in storage but no
        // selector exposes them. This is the "broken trust" the SCOPE.md
        // §3 product rule warns about and the SIREN verdict captures.
        bytes32 slot0 = vm.load(address(proxy), bytes32(uint256(0)));
        assertEq(
            slot0,
            bytes32(uint256(uint160(proxyAdminOwner))),
            "V1 owner data not preserved at slot 0 (proves the bytes orphan)"
        );
    }
}
