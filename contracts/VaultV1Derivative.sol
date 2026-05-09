// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {VaultV1} from "./VaultV1.sol";

/// @title VaultV1Derivative - V1 bytecode-equivalent fixture for the V1-anchored REVIEW path
/// @notice Inherits VaultV1 with no overrides and no new state. Compiled
///         under the same `solc 0.8.24 + optimizer_runs=200` toolchain as V1,
///         the runtime bytecode of this contract is byte-identical to
///         VaultV1's runtime bytecode EXCEPT for the trailing CBOR metadata
///         section (which encodes the contract identifier; ~50 bytes at the
///         end). Logic-portion bytecode is identical.
/// @dev    This fixture exists for the demo SCENARIO where a deployed
///         implementation is bytecode-equivalent to a known-good V1 but is
///         not submitted to Sourcify. In that scenario the verdict engine's
///         V1-anchored interpretation path (future Stream B work) can:
///           - extract V1 function-body byte ranges from V1's Sourcify metadata
///           - search this contract's deployed bytecode for those ranges
///           - identify the implementation as "V1-derived hypothesis"
///           - downgrade verdict from unconditional SIREN ("no source")
///             to REVIEW with the explicit caveat that no metadata trail
///             proves the origin
///
///         This is distinct from `UnverifiedImpl` (US-006) which is
///         intentionally storage-divergent + functionally minimal: that
///         fixture demonstrates the strict "no source, no upgrade -> SIREN"
///         path. `VaultV1Derivative` demonstrates the higher-confidence
///         REVIEW path that becomes possible when the V1 reference is
///         exploitable for matching.
contract VaultV1Derivative is VaultV1 {
// intentionally empty — bytecode equivalence with VaultV1 is the entire point
}
