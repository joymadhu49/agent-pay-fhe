# FHEVM anti-patterns — extended

Each entry is a real mistake we have either made or seen. The "fix" column is
what an AI agent should write instead.

## ACL forgotten after storage write

```solidity
// BAD
_bal[u] = FHE.add(_bal[u], v);

// GOOD
euint64 next = FHE.add(_bal[u], v);
_bal[u] = next;
FHE.allowThis(next);
FHE.allow(next, u);
```

The bad version compiles. It even passes a single tx. It reverts on the next
tx that reads `_bal[u]` because the contract no longer has ACL on the new
ciphertext.

## Branching on encrypted comparison

```solidity
// BAD
if (FHE.lt(amount, balance)) {
    _bal[from] = FHE.sub(balance, amount);
} else {
    revert("insufficient");
}

// GOOD
ebool ok = FHE.le(amount, balance);
euint64 sendAmt = FHE.select(ok, amount, FHE.asEuint64(0));
_bal[from] = FHE.sub(balance, sendAmt);
```

The bad version (a) doesn't compile (cannot branch on `ebool`), and (b) even
if you decrypt the comparison, the revert leaks the result.

## Reusing externalEuint64 across contracts

```ts
// BAD
const buf = fhe.createEncryptedInput(routerAddr, user);
buf.add64(100n);
const { handles, inputProof } = await buf.encrypt();
await router.deposit(handles[0], inputProof);
await otherContract.deposit(handles[0], inputProof); // reverts: proof bound to router

// GOOD
const r = await fhe.createEncryptedInput(routerAddr, user).add64(100n).encrypt();
const o = await fhe.createEncryptedInput(otherAddr,  user).add64(100n).encrypt();
await router.deposit(r.handles[0], r.inputProof);
await otherContract.deposit(o.handles[0], o.inputProof);
```

Input proofs are bound to (target contract, user). Re-encrypt per target.

## Forgetting setOperator before ERC-7984 transferFrom

```ts
// BAD — reverts on first deposit
await router.deposit(handle, proof); // router calls cUSDT.confidentialTransferFrom(user, router, ...)
                                     // cUSDT requires user → router operator status, which we never set.

// GOOD — one-time per user
const future = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;
await cUSDT.setOperator(routerAddress, future);
await router.deposit(handle, proof);
```

Surface this in the UI as a "Approve router (one-time)" button.

## Synchronous decrypt where the v0.11 split flow is required

```solidity
// BAD — pseudocode in some old tutorials
uint64 c = FHE.decrypt(ciphertext);

// BAD — v0.10 oracle-callback style; not in v0.11
uint256 reqId = FHE.requestDecryption(cts, this.onReveal.selector);

// GOOD (v0.11 split flow)
function close() external {
    FHE.makePubliclyDecryptable(_value);   // Phase 1 — on-chain
}
function reveal(uint64 cleartext, bytes calldata proof) external {
    bytes32[] memory cts = new bytes32[](1);
    cts[0] = FHE.toBytes32(_value);
    FHE.checkSignatures(cts, abi.encode(cleartext), proof);   // Phase 2 — proof from relayer
    // ... act on cleartext
}
```

Public decryption is split: contract marks the ciphertext public, off-chain
relayer produces a proof (latency ~10–60 s on Sepolia), then anyone submits
`(cleartext, proof)` back. Plan UX accordingly — show a pending state.

## Public-decrypting for views

```solidity
// BAD — for a "my balance" UI
function myBalance() external returns (uint64) {
    return FHE.decryptAndCallback(_bal[msg.sender], ...); // burns oracle latency, leaks publicly
}

// GOOD — user-decrypt off-chain via EIP-712
function balanceHandle(address u) external view returns (euint64) {
    return _bal[u];
}
// Frontend signs EIP-712 + calls fhe.userDecrypt with the handle.
```

User-decryption is O(ms) and private to the user; oracle is for settlement.

## Skipping checkSignatures in oracle callback

```solidity
// BAD — anyone can call this with any cleartext
function onReveal(uint256, uint64 cleartext, bytes[] memory) external {
    revealed = cleartext;
}

// GOOD
function onReveal(uint256 reqId, uint64 cleartext, bytes[] memory sigs) external {
    FHE.checkSignatures(reqId, sigs);
    revealed = cleartext;
}
```

The callback is `external`. Without `checkSignatures`, an attacker calls it
with a fake cleartext and the contract believes them.

## Treating an uninitialized ciphertext as zero

```solidity
// BAD
_bal[user] = FHE.add(_bal[user], v); // _bal[user] is uninitialized → undefined behavior

// GOOD
euint64 prev = _bal[user];
if (!FHE.isInitialized(prev)) prev = FHE.asEuint64(0);
_bal[user] = FHE.add(prev, v);
```

`FHE.isInitialized` is the safe guard. Use it for any first-time write to a
mapping.

## FHE.mul / FHE.div in a loop

```solidity
// BAD — O(n) FHE muls; gas blows up fast
for (uint256 i = 0; i < n; i++) total = FHE.mul(total, scalar);

// GOOD — restructure: plaintext × ciphertext, or batch off-chain.
total = FHE.mul(total, FHE.asEuint64(scalar_pow_n));
```

`mul` and `div` of two ciphertexts are an order of magnitude more expensive
than `add` / `sub`. Avoid in hot paths.
