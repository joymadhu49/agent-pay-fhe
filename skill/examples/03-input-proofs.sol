// SPDX-License-Identifier: BSD-3-Clause-Clear
// Confidential tip jar: any user encrypts a tip on the client, submits handle +
// inputProof. The contract verifies the proof via FHE.fromExternal and adds.
// Only the owner can read the running total.
pragma solidity ^0.8.24;

import { FHE, euint64, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract ConfidentialTipJar is ZamaEthereumConfig {
    address public immutable owner;
    euint64 private _total;

    constructor() {
        owner = msg.sender;
        _total = FHE.asEuint64(0);
        FHE.allowThis(_total);
        FHE.allow(_total, owner);
    }

    function tip(externalEuint64 amount, bytes calldata inputProof) external {
        euint64 v = FHE.fromExternal(amount, inputProof);
        _total = FHE.add(_total, v);
        FHE.allowThis(_total);
        FHE.allow(_total, owner);   // only owner can decrypt total
    }

    function totalHandle() external view returns (euint64) {
        return _total;
    }
}
