// SPDX-License-Identifier: BSD-3-Clause-Clear
// Sealed-bid auction settled via the FHEVM v0.11 split-flow public decryption
// pattern: the contract marks the winning bid `publiclyDecryptable`; an
// off-chain caller fetches the cleartext + KMS proof from the relayer; the
// contract verifies via `FHE.checkSignatures` in `reveal`.
pragma solidity ^0.8.24;

import { FHE, euint64, externalEuint64, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract SealedBidAuction is ZamaEthereumConfig {
    address public immutable seller;
    euint64 private _highBid;
    bool public closed;
    bool public revealed;
    uint64 public revealedHighBid;

    constructor() {
        seller = msg.sender;
        _highBid = FHE.asEuint64(0);
        FHE.allowThis(_highBid);
    }

    function bid(externalEuint64 amount, bytes calldata inputProof) external {
        require(!closed, "closed");
        euint64 v = FHE.fromExternal(amount, inputProof);

        ebool higher = FHE.gt(v, _highBid);
        _highBid = FHE.select(higher, v, _highBid);
        FHE.allowThis(_highBid);
    }

    /// Snapshot the high bid + flag it for public decryption.
    function close() external {
        require(msg.sender == seller, "only seller");
        require(!closed, "already closed");
        closed = true;
        FHE.makePubliclyDecryptable(_highBid);
    }

    /// Anyone may post the cleartext + proof once the relayer has produced them.
    function reveal(uint64 cleartextHighBid, bytes calldata decryptionProof) external {
        require(closed && !revealed, "not ready");

        bytes32[] memory handles = new bytes32[](1);
        handles[0] = FHE.toBytes32(_highBid);
        FHE.checkSignatures(handles, abi.encode(cleartextHighBid), decryptionProof);

        revealed = true;
        revealedHighBid = cleartextHighBid;
        // Side effects: settle payment, transfer NFT, etc.
    }

    /// View the encrypted high bid (post-close, pre-reveal anyone can publicDecrypt it).
    function highBidHandle() external view returns (euint64) {
        return _highBid;
    }
}
