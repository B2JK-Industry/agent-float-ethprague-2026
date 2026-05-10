// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title UmiaValidationHookMock
/// @notice Reference implementation of the EIP-712 server-permit branch of
///         Umia's UmiaValidationHook contract. Mirrors the on-chain ABI
///         documented at docs.umia.finance/docs/technical-reference/
///         validation-hook so we can prove the bytes-on-wire produced by
///         packages/umia-permit are accepted by a hook that uses the same
///         domain + struct hash.
///
/// @dev    This is NOT the production Umia hook. It exists so the
///         Upgrade Siren server-permit issuer can be exercised end-to-end
///         in Foundry without depending on Umia having published a
///         deployed address. Production deployments must point at the
///         real Umia contract; the EIP-712 domain (name "UmiaValidationHook"
///         version "1", chainId, verifyingContract) and the ServerPermit
///         struct (address wallet, uint256 step, uint256 deadline) are
///         the binding API surface — both are byte-identical to what the
///         real hook recovers.
contract UmiaValidationHookMock {
    bytes32 public constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 public constant SERVER_PERMIT_TYPEHASH =
        keccak256("ServerPermit(address wallet,uint256 step,uint256 deadline)");
    bytes32 public constant DOMAIN_NAME_HASH = keccak256(bytes("UmiaValidationHook"));
    bytes32 public constant DOMAIN_VERSION_HASH = keccak256(bytes("1"));

    address public owner;
    address public signer;
    mapping(uint256 => bool) public stepPermitEnabled;
    mapping(address => uint256) public verifiedFromStep;

    error NotVerified(address user);
    error ServerPermitNotEnabled(uint256 stepIndex);
    error SignerNotSet();
    error ExpiredDeadline();
    error InvalidSignature();
    error WrongTypeFlag();
    error OnlyOwner();

    event SignerSet(address oldSigner, address newSigner);
    event StepPermitEnabled(uint256 stepIndex);
    event Registered(uint256 stepIndex, address user);

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setSigner(address newSigner) external onlyOwner {
        emit SignerSet(signer, newSigner);
        signer = newSigner;
    }

    function enableStepPermit(uint256 stepIndex) external onlyOwner {
        stepPermitEnabled[stepIndex] = true;
        emit StepPermitEnabled(stepIndex);
    }

    /// @notice Validate a server-permit-signed bid. `bidder` is the wallet
    ///         the auction CCA forwards as the bid owner; the permit must
    ///         bind to that wallet.
    /// @dev    Wire format: hookData = 0x01 || abi.encode(uint256 step,
    ///         uint256 deadline, bytes signature)
    function validate(address bidder, bytes calldata hookData) external returns (bool) {
        if (hookData.length == 0) revert WrongTypeFlag();
        if (uint8(hookData[0]) != 0x01) revert WrongTypeFlag();
        bytes calldata payload = hookData[1:];
        (uint256 step, uint256 deadline, bytes memory signature) =
            abi.decode(payload, (uint256, uint256, bytes));

        if (!stepPermitEnabled[step]) revert ServerPermitNotEnabled(step);
        if (signer == address(0)) revert SignerNotSet();
        if (block.timestamp > deadline) revert ExpiredDeadline();

        bytes32 structHash =
            keccak256(abi.encode(SERVER_PERMIT_TYPEHASH, bidder, step, deadline));
        bytes32 domainSeparator = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                DOMAIN_NAME_HASH,
                DOMAIN_VERSION_HASH,
                block.chainid,
                address(this)
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));

        address recovered = _recover(digest, signature);
        if (recovered == address(0) || recovered != signer) revert InvalidSignature();

        verifiedFromStep[bidder] = step;
        emit Registered(step, bidder);
        return true;
    }

    function _recover(bytes32 digest, bytes memory signature) internal pure returns (address) {
        if (signature.length != 65) return address(0);
        bytes32 r;
        bytes32 s;
        uint8 v;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            r := mload(add(signature, 0x20))
            s := mload(add(signature, 0x40))
            v := byte(0, mload(add(signature, 0x60)))
        }
        if (v < 27) v += 27;
        if (v != 27 && v != 28) return address(0);
        return ecrecover(digest, v, r, s);
    }
}
