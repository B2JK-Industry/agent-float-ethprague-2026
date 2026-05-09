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

/// @notice End-to-end upgrade-flow test: deploy proxy + V1, deposit, upgrade
///         to V2Safe, assert balances preserved. This is the mechanized proof
///         that a SAFE upgrade is in fact safe and that the V1->V2Safe
///         scenario the demo presents is reproducible locally.
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
}
