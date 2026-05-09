// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {VaultV1Derivative} from "../../contracts/VaultV1Derivative.sol";

/// @title DeployDerivative - one-shot deploy of VaultV1Derivative for US-080
/// @notice Deploys VaultV1Derivative on Sepolia (chain 11155111) and writes
///         the address into deployments/sepolia.json under the new
///         `v1Derivative` key. Idempotent: bails when the key is already
///         populated with a non-zero address. Standalone from Deploy.s.sol
///         so the original Sepolia broadcast (5 contracts) is not affected
///         and the merged commit history of US-009 stays intact.
/// @dev    NOT submitted to Sourcify by design — that is the entire point
///         of the fixture. The deployed bytecode is logic-identical to
///         VaultV1 (US-003), differing only in the trailing 43-byte CBOR
///         metadata IPFS hash. The future V1-anchored verdict engine will
///         strip that trailer and match against V1's metadata to produce
///         a `REVIEW` verdict instead of unconditional SIREN.
contract DeployDerivative is Script {
    string internal constant SEPOLIA_PATH = "deployments/sepolia.json";
    uint256 internal constant SEPOLIA_CHAIN_ID = 11155111;

    error WrongChain(uint256 actual, uint256 expected);
    error MissingDeployerKey();

    function run() external {
        if (block.chainid != SEPOLIA_CHAIN_ID) {
            revert WrongChain(block.chainid, SEPOLIA_CHAIN_ID);
        }

        if (_alreadyDeployed()) {
            console2.log(
                "v1Derivative already populated in",
                SEPOLIA_PATH,
                "; nothing to do. Delete the key to redeploy."
            );
            return;
        }

        uint256 deployerKey = vm.envOr("DEPLOYER_PRIVATE_KEY", uint256(0));
        if (deployerKey == 0) revert MissingDeployerKey();

        vm.startBroadcast(deployerKey);
        VaultV1Derivative derivative = new VaultV1Derivative();
        vm.stopBroadcast();

        console2.log("VaultV1Derivative:", address(derivative));
        _patchJson(address(derivative));
    }

    function _alreadyDeployed() internal returns (bool) {
        if (!vm.exists(SEPOLIA_PATH)) return false;
        string memory existing = vm.readFile(SEPOLIA_PATH);
        if (bytes(existing).length == 0) return false;
        bytes memory raw = vm.parseJson(existing, ".v1Derivative");
        if (raw.length == 0) return false;
        address current = abi.decode(raw, (address));
        return current != address(0);
    }

    /// @dev Re-serialize the existing JSON with the new key appended. Reads
    ///      every existing key, writes it back, plus v1Derivative. Preserves
    ///      idempotent shape for the rest of the pipeline.
    function _patchJson(address derivative) internal {
        string memory existing = vm.readFile(SEPOLIA_PATH);
        address proxy = abi.decode(vm.parseJson(existing, ".proxy"), (address));
        address v1 = abi.decode(vm.parseJson(existing, ".v1"), (address));
        address v2safe = abi.decode(vm.parseJson(existing, ".v2safe"), (address));
        address v2dangerous = abi.decode(vm.parseJson(existing, ".v2dangerous"), (address));
        address unverified = abi.decode(vm.parseJson(existing, ".unverified"), (address));
        uint256 chainId = abi.decode(vm.parseJson(existing, ".chainId"), (uint256));
        uint256 blockNumber = abi.decode(vm.parseJson(existing, ".blockNumber"), (uint256));

        string memory key = "deployments";
        vm.serializeAddress(key, "proxy", proxy);
        vm.serializeAddress(key, "v1", v1);
        vm.serializeAddress(key, "v2safe", v2safe);
        vm.serializeAddress(key, "v2dangerous", v2dangerous);
        vm.serializeAddress(key, "unverified", unverified);
        vm.serializeAddress(key, "v1Derivative", derivative);
        vm.serializeUint(key, "chainId", chainId);
        string memory output = vm.serializeUint(key, "blockNumber", blockNumber);
        vm.writeJson(output, SEPOLIA_PATH);
        console2.log("Wrote v1Derivative into", SEPOLIA_PATH);
    }
}
