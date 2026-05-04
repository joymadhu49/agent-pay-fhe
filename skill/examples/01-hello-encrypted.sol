// SPDX-License-Identifier: BSD-3-Clause-Clear
// Hello World, FHEVM edition: an encrypted counter you can increment with a
// client-supplied encrypted value, then user-decrypt back in the browser.
pragma solidity ^0.8.24;

import { FHE, euint32, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract HelloEncrypted is ZamaEthereumConfig {
    euint32 private _count;

    function getCount() external view returns (euint32) {
        return _count;
    }

    function increment(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        // 1. Validate + unwrap client ciphertext.
        euint32 v = FHE.fromExternal(inputEuint32, inputProof);

        // 2. Branchless update.
        _count = FHE.add(_count, v);

        // 3. Re-allow ACL: the contract for the next tx, the user for off-chain decryption.
        FHE.allowThis(_count);
        FHE.allow(_count, msg.sender);
    }
}
