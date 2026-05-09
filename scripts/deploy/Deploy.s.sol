// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {TransparentUpgradeableProxy} from
    "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {VaultV1} from "../../contracts/VaultV1.sol";
import {VaultV2Safe} from "../../contracts/VaultV2Safe.sol";
import {VaultV2Dangerous} from "../../contracts/VaultV2Dangerous.sol";
import {UnverifiedImpl} from "../../contracts/UnverifiedImpl.sol";

/// @title Deploy - Sepolia deployment of Upgrade Siren demo fixtures
/// @notice Deploys five contracts on Sepolia (chain 11155111):
///         - V1, V2Safe, V2Dangerous, UnverifiedImpl as standalone impls
///         - one TransparentUpgradeableProxy initialized to V1
///         and writes addresses to deployments/sepolia.json. Re-running is a
///         no-op if all five addresses are already populated; delete the JSON
///         to force a redeploy.
/// @dev    Block numbers and tx hashes for each deployment are recorded by
///         Foundry automatically in broadcast/Deploy.s.sol/<chainId>/run-latest.json
///         when invoked with --broadcast. Subsequent items (US-007 Sourcify,
///         US-010 ENS provisioning, US-011 reports) consume sepolia.json.
contract Deploy is Script {
    string internal constant SEPOLIA_PATH = "deployments/sepolia.json";
    uint256 internal constant SEPOLIA_CHAIN_ID = 11155111;

    error WrongChain(uint256 actual, uint256 expected);
    error MissingDeployerKey();

    struct Existing {
        address proxy;
        address v1;
        address v2safe;
        address v2dangerous;
        address unverified;
    }

    function run() external {
        if (block.chainid != SEPOLIA_CHAIN_ID) {
            revert WrongChain(block.chainid, SEPOLIA_CHAIN_ID);
        }

        if (_alreadyDeployed()) {
            console2.log("All five addresses already deployed in", SEPOLIA_PATH);
            console2.log("Re-run is a no-op. Delete the file to force redeploy.");
            return;
        }

        uint256 deployerKey = vm.envOr("DEPLOYER_PRIVATE_KEY", uint256(0));
        if (deployerKey == 0) revert MissingDeployerKey();
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        VaultV1 v1 = new VaultV1();
        VaultV2Safe v2safe = new VaultV2Safe();
        VaultV2Dangerous v2dangerous = new VaultV2Dangerous();
        UnverifiedImpl unverified = new UnverifiedImpl();

        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
            address(v1),
            deployer,
            abi.encodeCall(VaultV1.initialize, (deployer))
        );

        vm.stopBroadcast();

        console2.log("V1            :", address(v1));
        console2.log("V2Safe        :", address(v2safe));
        console2.log("V2Dangerous   :", address(v2dangerous));
        console2.log("UnverifiedImpl:", address(unverified));
        console2.log("Proxy         :", address(proxy));

        _writeJson(address(proxy), address(v1), address(v2safe), address(v2dangerous), address(unverified));
    }

    function _alreadyDeployed() internal returns (bool) {
        if (!vm.exists(SEPOLIA_PATH)) return false;
        string memory existing = vm.readFile(SEPOLIA_PATH);
        if (bytes(existing).length == 0) return false;
        // Treat as "already deployed" only when all five keys are populated
        // with non-zero addresses. The placeholder JSON commits all-zero
        // addresses, so a fresh checkout still triggers a real deployment.
        address[5] memory addrs = [
            _readAddr(existing, ".proxy"),
            _readAddr(existing, ".v1"),
            _readAddr(existing, ".v2safe"),
            _readAddr(existing, ".v2dangerous"),
            _readAddr(existing, ".unverified")
        ];
        for (uint256 i; i < addrs.length; i++) {
            if (addrs[i] == address(0)) return false;
        }
        return true;
    }

    function _readAddr(string memory s, string memory key) internal pure returns (address) {
        bytes memory raw = vm.parseJson(s, key);
        if (raw.length == 0) return address(0);
        return abi.decode(raw, (address));
    }

    function _writeJson(address proxy, address v1, address v2safe, address v2dangerous, address unverified)
        internal
    {
        string memory key = "deployments";
        vm.serializeAddress(key, "proxy", proxy);
        vm.serializeAddress(key, "v1", v1);
        vm.serializeAddress(key, "v2safe", v2safe);
        vm.serializeAddress(key, "v2dangerous", v2dangerous);
        vm.serializeAddress(key, "unverified", unverified);
        vm.serializeUint(key, "chainId", block.chainid);
        string memory output = vm.serializeUint(key, "blockNumber", block.number);
        vm.writeJson(output, SEPOLIA_PATH);
        console2.log("Wrote", SEPOLIA_PATH);
    }
}
