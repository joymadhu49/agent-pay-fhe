// SPDX-License-Identifier: BSD-3-Clause-Clear
// Three ACL patterns side-by-side: allowThis, allow, allowTransient.
// Read the comments — these three are the difference between a working
// FHEVM contract and a contract that reverts on the very next tx.
pragma solidity ^0.8.24;

import { FHE, euint64, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

interface IPeer {
    function takeCiphertext(euint64 ct) external;
}

contract AclPatterns is ZamaEthereumConfig {
    mapping(address => euint64) private _bal;

    /// allowThis: the contract itself needs to read this ciphertext next tx.
    /// allow:     the user needs to user-decrypt it off-chain.
    function deposit(externalEuint64 amt, bytes calldata proof) external {
        euint64 v = FHE.fromExternal(amt, proof);
        euint64 prev = _bal[msg.sender];
        if (!FHE.isInitialized(prev)) prev = FHE.asEuint64(0);
        euint64 next = FHE.add(prev, v);

        _bal[msg.sender] = next;
        FHE.allowThis(next);            // <- without this, next read reverts
        FHE.allow(next, msg.sender);    // <- without this, user cannot view balance
    }

    /// allowTransient: hand the ciphertext to another contract for a single tx.
    /// Use this when you call into ERC-7984 / cUSDT from your own contract.
    function handOff(IPeer peer, externalEuint64 amt, bytes calldata proof) external {
        euint64 v = FHE.fromExternal(amt, proof);
        FHE.allowTransient(v, address(peer));   // <- without this, peer cannot use v
        peer.takeCiphertext(v);
    }
}
