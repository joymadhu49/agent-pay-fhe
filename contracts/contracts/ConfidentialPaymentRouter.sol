// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import { FHE, euint64, externalEuint64, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

import { IERC7984 } from "./interfaces/IERC7984.sol";
import { AgentRegistry } from "./AgentRegistry.sol";

/// @title ConfidentialPaymentRouter
/// @notice Holds encrypted credit per registered agent backed by an ERC-7984 token (cUSDT).
///         Agents `deposit` cUSDT into the router, `pay` other agents internally with
///         encrypted amounts, and `withdrawAll` ("exit") to reclaim cUSDT.
/// @dev    Public decryption follows the FHEVM v0.11 split-flow: `withdrawAll` snapshots
///         the balance and marks it publicly decryptable; an off-chain caller fetches the
///         cleartext + proof from the relayer and calls `settleExit(...)`. The contract
///         verifies via `FHE.checkSignatures` and pays out cUSDT.
contract ConfidentialPaymentRouter is ZamaEthereumConfig {
    IERC7984 public immutable cUSDT;
    AgentRegistry public immutable registry;

    mapping(address => euint64) private _bal;
    /// @notice Snapshot of an agent's balance, taken at `withdrawAll` time.
    ///         Marked publicly decryptable so the relayer can produce a proof.
    mapping(address => euint64) private _pendingSnapshot;
    mapping(address => bool) private _hasPendingExit;

    event Deposited(address indexed agent);
    event Paid(address indexed from, address indexed to);
    event ExitRequested(address indexed agent);
    event ExitSettled(address indexed agent, uint64 amount);

    error NotRegistered(address who);
    error NoPendingExit();
    error PendingExitInProgress();
    error UninitializedBalance();

    modifier onlyRegistered(address who) {
        if (!registry.isRegistered(who)) revert NotRegistered(who);
        _;
    }

    constructor(address _cUSDT, address _registry) {
        cUSDT = IERC7984(_cUSDT);
        registry = AgentRegistry(_registry);
    }

    /// @notice Deposit cUSDT into the router as encrypted credit.
    /// @dev    Caller must have first granted the router operator status on cUSDT
    ///         via `cUSDT.setOperator(router, until)`.
    function deposit(externalEuint64 encAmount, bytes calldata inputProof)
        external
        onlyRegistered(msg.sender)
    {
        euint64 amount = FHE.fromExternal(encAmount, inputProof);

        FHE.allowTransient(amount, address(cUSDT));
        euint64 transferred = cUSDT.confidentialTransferFrom(msg.sender, address(this), amount);

        euint64 prev = _bal[msg.sender];
        if (!FHE.isInitialized(prev)) {
            prev = FHE.asEuint64(0);
        }
        euint64 next = FHE.add(prev, transferred);

        _bal[msg.sender] = next;
        FHE.allowThis(next);
        FHE.allow(next, msg.sender);

        emit Deposited(msg.sender);
    }

    /// @notice Pay another registered agent an encrypted amount.
    /// @dev    Branchless: if the encrypted amount exceeds balance, transfer 0 to
    ///         avoid leaking comparison results via revert.
    function pay(address to, externalEuint64 encAmount, bytes calldata inputProof)
        external
        onlyRegistered(msg.sender)
        onlyRegistered(to)
    {
        euint64 amount = FHE.fromExternal(encAmount, inputProof);

        euint64 fromBal = _bal[msg.sender];
        if (!FHE.isInitialized(fromBal)) {
            fromBal = FHE.asEuint64(0);
        }

        ebool ok = FHE.le(amount, fromBal);
        euint64 sendAmt = FHE.select(ok, amount, FHE.asEuint64(0));

        euint64 newFrom = FHE.sub(fromBal, sendAmt);

        euint64 prevTo = _bal[to];
        if (!FHE.isInitialized(prevTo)) {
            prevTo = FHE.asEuint64(0);
        }
        euint64 newTo = FHE.add(prevTo, sendAmt);

        _bal[msg.sender] = newFrom;
        _bal[to] = newTo;

        FHE.allowThis(newFrom);
        FHE.allow(newFrom, msg.sender);
        FHE.allowThis(newTo);
        FHE.allow(newTo, to);

        emit Paid(msg.sender, to);
    }

    /// @notice Snapshot the caller's balance and mark it publicly decryptable.
    ///         The off-chain relayer can then produce a `decryptionProof`; submit it
    ///         to {settleExit} to receive the cleartext amount in cUSDT.
    function withdrawAll() external onlyRegistered(msg.sender) {
        if (_hasPendingExit[msg.sender]) revert PendingExitInProgress();

        euint64 bal = _bal[msg.sender];
        if (!FHE.isInitialized(bal)) revert UninitializedBalance();

        _pendingSnapshot[msg.sender] = bal;
        _hasPendingExit[msg.sender] = true;
        FHE.allowThis(_pendingSnapshot[msg.sender]);
        FHE.makePubliclyDecryptable(_pendingSnapshot[msg.sender]);

        // Zero live balance.
        euint64 zero = FHE.asEuint64(0);
        _bal[msg.sender] = zero;
        FHE.allowThis(zero);
        FHE.allow(zero, msg.sender);

        emit ExitRequested(msg.sender);
    }

    /// @notice Settle a pending exit. Anyone may call once they have the proof.
    /// @param  agent              The exiting agent.
    /// @param  cleartextAmount    Cleartext value of the snapshot, fetched off-chain.
    /// @param  decryptionProof    KMS proof bytes returned by the relayer's publicDecrypt.
    function settleExit(address agent, uint64 cleartextAmount, bytes calldata decryptionProof) external {
        if (!_hasPendingExit[agent]) revert NoPendingExit();
        euint64 snap = _pendingSnapshot[agent];

        bytes32[] memory handles = new bytes32[](1);
        handles[0] = FHE.toBytes32(snap);
        FHE.checkSignatures(handles, abi.encode(cleartextAmount), decryptionProof);

        _hasPendingExit[agent] = false;

        if (cleartextAmount > 0) {
            euint64 encOut = FHE.asEuint64(cleartextAmount);
            FHE.allowTransient(encOut, address(cUSDT));
            cUSDT.confidentialTransfer(agent, encOut);
        }
        emit ExitSettled(agent, cleartextAmount);
    }

    /// @notice Returns the encrypted balance handle. Frontend uses user-decryption (EIP-712)
    ///         to view the cleartext.
    function balanceHandle(address a) external view returns (euint64) {
        return _bal[a];
    }

    /// @notice Returns the publicly-decryptable snapshot for an agent with a pending exit.
    ///         Off-chain callers fetch this handle, call relayer.publicDecrypt, then submit
    ///         the resulting (cleartext, proof) to {settleExit}.
    function pendingExitHandle(address a) external view returns (euint64) {
        return _pendingSnapshot[a];
    }

    function hasPendingExit(address a) external view returns (bool) {
        return _hasPendingExit[a];
    }
}
