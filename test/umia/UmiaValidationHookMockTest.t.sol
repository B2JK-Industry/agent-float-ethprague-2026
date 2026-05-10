// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {UmiaValidationHookMock} from "../../contracts/umia/UmiaValidationHookMock.sol";

/// @notice Round-trip test: sign a ServerPermit in Foundry the same way
///         packages/umia-permit signs it in TS, encode hookData with the
///         documented 0x01 prefix, hand it to UmiaValidationHookMock,
///         verify the hook accepts it. This proves the byte-on-wire
///         contract our TS encoder produces matches what a real Umia
///         hook with the documented EIP-712 domain would recover.
contract UmiaValidationHookMockTest is Test {
    UmiaValidationHookMock internal hook;
    uint256 internal signerKey = 0xA11CE; // arbitrary; vm.sign is deterministic
    address internal signer;
    address internal bidder = address(0xBEEF);

    function setUp() public {
        signer = vm.addr(signerKey);
        hook = new UmiaValidationHookMock();
        hook.setSigner(signer);
        hook.enableStepPermit(2);
    }

    function _domainSeparator() internal view returns (bytes32) {
        return keccak256(
            abi.encode(
                hook.DOMAIN_TYPEHASH(),
                hook.DOMAIN_NAME_HASH(),
                hook.DOMAIN_VERSION_HASH(),
                block.chainid,
                address(hook)
            )
        );
    }

    function _signPermit(address wallet, uint256 step, uint256 deadline)
        internal
        view
        returns (bytes memory sig)
    {
        bytes32 structHash =
            keccak256(abi.encode(hook.SERVER_PERMIT_TYPEHASH(), wallet, step, deadline));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _domainSeparator(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, digest);
        sig = abi.encodePacked(r, s, v);
    }

    function _encodeHookData(uint256 step, uint256 deadline, bytes memory signature)
        internal
        pure
        returns (bytes memory)
    {
        return abi.encodePacked(uint8(0x01), abi.encode(step, deadline, signature));
    }

    function testValidateAcceptsValidServerPermit() public {
        uint256 deadline = block.timestamp + 600;
        bytes memory sig = _signPermit(bidder, 2, deadline);
        bytes memory hookData = _encodeHookData(2, deadline, sig);
        bool ok = hook.validate(bidder, hookData);
        assertTrue(ok);
        assertEq(hook.verifiedFromStep(bidder), 2);
    }

    function testValidateRevertsOnExpiredDeadline() public {
        uint256 deadline = block.timestamp + 100;
        bytes memory sig = _signPermit(bidder, 2, deadline);
        bytes memory hookData = _encodeHookData(2, deadline, sig);
        vm.warp(block.timestamp + 200);
        vm.expectRevert(UmiaValidationHookMock.ExpiredDeadline.selector);
        hook.validate(bidder, hookData);
    }

    function testValidateRevertsOnDisabledStep() public {
        uint256 deadline = block.timestamp + 600;
        bytes memory sig = _signPermit(bidder, 5, deadline);
        bytes memory hookData = _encodeHookData(5, deadline, sig);
        vm.expectRevert(abi.encodeWithSelector(UmiaValidationHookMock.ServerPermitNotEnabled.selector, uint256(5)));
        hook.validate(bidder, hookData);
    }

    function testValidateRevertsOnWrongSigner() public {
        uint256 deadline = block.timestamp + 600;
        // Sign with a different key.
        uint256 attackerKey = 0xBADBAD;
        bytes32 structHash = keccak256(
            abi.encode(hook.SERVER_PERMIT_TYPEHASH(), bidder, uint256(2), deadline)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _domainSeparator(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(attackerKey, digest);
        bytes memory badSig = abi.encodePacked(r, s, v);
        bytes memory hookData = _encodeHookData(2, deadline, badSig);
        vm.expectRevert(UmiaValidationHookMock.InvalidSignature.selector);
        hook.validate(bidder, hookData);
    }

    function testValidateRevertsOnMissingTypeFlag() public {
        // Empty hookData → wrong type flag.
        vm.expectRevert(UmiaValidationHookMock.WrongTypeFlag.selector);
        hook.validate(bidder, bytes(""));
    }

    function testValidateRevertsWhenBidderDiffersFromPermitWallet() public {
        // Permit binds to `bidder` but the auction routes a different wallet
        // through validate(). The struct hash carries the permitted wallet
        // (this contract uses `bidder` as msg.sender argument), so a
        // mismatch produces an invalid recovered signer.
        uint256 deadline = block.timestamp + 600;
        bytes memory sig = _signPermit(bidder, 2, deadline);
        bytes memory hookData = _encodeHookData(2, deadline, sig);
        address otherBidder = address(0xCAFE);
        vm.expectRevert(UmiaValidationHookMock.InvalidSignature.selector);
        hook.validate(otherBidder, hookData);
    }
}
