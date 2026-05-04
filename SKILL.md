---
name: fhevm-confidential-contracts
description: Use this skill when writing, testing, or deploying confidential smart contracts on Zama's FHEVM — encrypted ERC-20s (ERC-7984), private auctions, sealed-bid logic, on-chain confidential payments, and AI-agent-to-agent settlement. Trigger on mentions of FHEVM, fhEVM, euint, ebool, externalEuint, fhevmjs, @zama-fhe/relayer-sdk, ERC-7984, IERC7984, confidentialTransfer, confidentialBalanceOf, encrypted balance, input proof, FHE.fromExternal, ACL, allowThis, allowTransient, requestDecryption, userDecrypt, or "private on-chain". Skip for plain ZK / non-FHE privacy work, MPC chains other than Zama, or generic Solidity that does not touch encrypted types.
license: BSD-3-Clause-Clear
version: 0.1.0
audience: AI coding agents (e.g., Claude Code) writing FHEVM Solidity + frontend code from natural-language prompts
---

# Writing Confidential Smart Contracts on Zama FHEVM

This skill teaches an AI agent to write, test, and deploy confidential smart
contracts on Zama's FHEVM. It distills the FHEVM mental model, the canonical
patterns, the most common footguns, and copy-paste recipes for tests and
frontend integration. The agent should follow it line-by-line for first-pass
correctness; reach for the worked example
([`agent-pay-fhe`](https://github.com/joymadhu49/agent-pay-fhe)) for any
non-trivial flow (deposit, P2P pay, oracle settlement).

## When to use FHE on-chain (and when NOT to)

Reach for FHEVM when the **payload itself must stay private** while settlement
must be on-chain and verifiable:

- Confidential balances and transfers (ERC-7984).
- Sealed-bid auctions / blind voting (encrypted bid, branchless winner).
- AI-agent-to-agent payments where the amount must hide from the public.
- Private credit scoring where the score is an encrypted integer.

Skip FHEVM when:

- A Merkle proof or off-chain ZK proof already covers the privacy goal.
- The data is fundamentally public (prices, supply caps).
- Throughput is the constraint — FHE ops cost orders of magnitude more gas than
  plaintext ops; do not use it for hot paths that must clear in a few thousand
  gas.

## Quick start (5 minutes to first encrypted contract)

```bash
git clone https://github.com/zama-ai/fhevm-hardhat-template
cd fhevm-hardhat-template
pnpm install
pnpm hardhat test          # mock FHEVM, fast
```

Open `contracts/FHECounter.sol`. Copy it. Change the encrypted type or add a
field. Re-run `pnpm hardhat test`. Every change should still pass before
moving on.

## Encrypted types (cheat sheet)

| Type | Use when | Notes |
|---|---|---|
| `ebool` | encrypted boolean | result of `FHE.eq/ne/lt/le/gt/ge` |
| `euint8`, `euint16`, `euint32` | small counters / flags | cheaper gas than `euint64` |
| `euint64` | balances, prices (matches ERC-7984) | **default for token amounts** |
| `euint128`, `euint256` | rare; only when you truly need the range | very expensive |
| `eaddress` | sealed addresses | uncommon |
| `externalEuintN` | client-supplied input wrapper | always pair with input proof |

Pick the smallest type that fits your range. ERC-7984 and `cUSDT` are
`euint64` — use `euint64` for any token amount unless you have a reason not
to.

## FHE operations cheat sheet

```solidity
import { FHE, euint64, externalEuint64, ebool } from "@fhevm/solidity/lib/FHE.sol";

// Arithmetic
euint64 c = FHE.add(a, b);
euint64 d = FHE.sub(a, b);
euint64 e = FHE.mul(a, b);     // expensive — avoid in loops
euint64 q = FHE.div(a, b);     // expensive
// Comparison → ebool
ebool   gt = FHE.gt(a, b);
ebool   le = FHE.le(a, b);
// Branchless conditional
euint64 chosen = FHE.select(le, a, b);
// Conversions
euint64 z = FHE.asEuint64(0);                       // trivial encryption
euint64 x = FHE.fromExternal(extA, inputProof);     // client input
// Randomness
euint64 r = FHE.randEuint64();
```

Three things that trip up new authors:

1. **No branching on encrypted comparisons.** `if (FHE.lt(a,b))` does not
   compile and would leak the comparison result. Use `FHE.select`.
2. **Multiplication of two ciphertexts is very expensive.** Restructure to use
   plaintext * ciphertext where possible.
3. **`require(amount > 0)` on `euint64` is a type error.** Comparisons return
   `ebool` — handle via `FHE.select`.

## Access Control List (ACL) — the #1 footgun

Every ciphertext you write to storage must be **re-allowed** before the next
transaction can read it. ACL grants come in three flavors:

| Call | Meaning | When to use |
|---|---|---|
| `FHE.allowThis(ct)` | this contract may use `ct` next tx | every storage write |
| `FHE.allow(ct, user)` | `user` (EIP-712 signer) may decrypt off-chain | for `/me` views |
| `FHE.allowTransient(ct, contract)` | one-tx hand-off to another contract | calling ERC-7984 |

### Recipe — every storage write

```solidity
_balances[user] = newBal;
FHE.allowThis(newBal);     // contract can read it next tx
FHE.allow(newBal, user);   // user can user-decrypt it via EIP-712
```

If you forget `allowThis`, the next tx that reads `_balances[user]` reverts
with `ACLNotAllowed`. Forgetting `allow(_, user)` means the user cannot view
their own balance from the frontend.

### Recipe — passing a ciphertext to ERC-7984

```solidity
euint64 amount = FHE.fromExternal(encAmount, inputProof);
FHE.allowTransient(amount, address(cUSDT));     // single-tx grant
cUSDT.confidentialTransferFrom(msg.sender, address(this), amount);
```

`allowTransient` is critical — without it the cUSDT contract cannot operate on
the ciphertext.

## Input proofs — encrypting on the client

The frontend creates an encrypted input bound to **(contract, user)**. The
relayer SDK returns ciphertext handles plus a single proof; the contract must
call `FHE.fromExternal(handle, proof)` before using the value.

```ts
import { initSDK, createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/bundle";

await initSDK();
const fhe = await createInstance({ ...SepoliaConfig, network: window.ethereum });
const buf = fhe.createEncryptedInput(contractAddr, userAddr);
buf.add64(amountAsBigInt);
const { handles, inputProof } = await buf.encrypt();
// handles[0] is the externalEuint64; pass it + inputProof into the tx
```

```solidity
function deposit(externalEuint64 encAmount, bytes calldata inputProof) external {
    euint64 amount = FHE.fromExternal(encAmount, inputProof); // VERIFIES proof
    // ... rest of logic
}
```

Never trust `externalEuintN` directly. Always pass through `FHE.fromExternal`.
Inputs are bound to the target contract — re-encrypt per contract you target
within a single user flow.

## Decryption patterns

There are two ways cleartext leaves the chain:

### User decryption (private to one user)

Used for "show me my balance" UX. The user signs an EIP-712 request; the
relayer returns cleartext only to that user. **The contract never sees the
cleartext** — decrypted in the browser.

```ts
const { publicKey, privateKey } = fhe.generateKeypair();
const eip712 = fhe.createEIP712(publicKey, [routerAddress]);
const sig = await walletClient.signTypedData({
  ...eip712,
  primaryType: "UserDecryptRequestVerification",
});
const handle = await readContract({ address: routerAddress, abi, functionName: "balanceHandle", args: [me] });
const result = await fhe.userDecrypt(
  [{ handle, contractAddress: routerAddress }],
  privateKey, publicKey, sig, [routerAddress], me, /*startTimestamp*/ now, /*durationDays*/ 1
);
const cleartext = result[handle]; // bigint
```

Requirement: the contract must have called `FHE.allow(ct, user)` for the user.

### Public decryption (split flow, v0.11+)

Used for settlement (e.g., "withdrawAll" — the contract needs to know the
cleartext to release ERC-20). v0.11 splits the flow into two phases instead
of using a single async callback:

```solidity
// Phase 1 — on-chain: snapshot the ciphertext + mark it publicly decryptable.
function withdrawAll() external {
    euint64 bal = _bal[msg.sender];
    _pendingSnapshot[msg.sender] = bal;
    FHE.allowThis(_pendingSnapshot[msg.sender]);
    FHE.makePubliclyDecryptable(_pendingSnapshot[msg.sender]);
}

// Phase 2 — anyone (typically the user) fetches cleartext + proof from the
// relayer off-chain, then submits them back. Contract verifies the proof via
// FHE.checkSignatures and acts on the cleartext.
function settleExit(address agent, uint64 cleartextAmount, bytes calldata decryptionProof) external {
    bytes32[] memory handles = new bytes32[](1);
    handles[0] = FHE.toBytes32(_pendingSnapshot[agent]);
    FHE.checkSignatures(handles, abi.encode(cleartextAmount), decryptionProof);
    // ... settle with cleartextAmount
}
```

```ts
// Off-chain (frontend or test):
const snapHandle = await router.pendingExitHandle(agent);
const result = await fhe.publicDecrypt([snapHandle]); // { clearValues, abiEncodedClearValues, decryptionProof }
const cleartext = BigInt(result.clearValues[snapHandle]);
await router.settleExit(agent, cleartext, result.decryptionProof);
```

Latency budget on Sepolia: ~10–60 seconds for the relayer to produce the
proof. Do **not** put public decryption on a hot UX path. Note the proof is
bound to the **exact ordered list of handles** passed to `checkSignatures` —
recompute the handle list from storage at verify time, not from user input.

## Frontend integration (relayer-sdk)

```ts
// web/lib/fhevm.ts
import { initSDK, createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/bundle";

let _instance: Awaited<ReturnType<typeof createInstance>> | null = null;
export async function getFhevm() {
  if (!_instance) {
    await initSDK();
    _instance = await createInstance({ ...SepoliaConfig, network: window.ethereum });
  }
  return _instance;
}
```

Key rules:

- `initSDK()` must be called once before any `createInstance`.
- The browser bundle requires HTTPS + COOP/COEP headers for SharedArrayBuffer.
  Add them in `next.config.mjs` (`Cross-Origin-Opener-Policy: same-origin`,
  `Cross-Origin-Embedder-Policy: require-corp`).
- Use `wagmi` / `viem` for transactions; use the relayer SDK only for
  encryption + decryption.
- Cache the instance — recreating it is expensive.

## Testing methodology

### Unit (mock FHEVM)

`@fhevm/hardhat-plugin` provides a mock coprocessor. Tests run in seconds.

```ts
import hre from "hardhat";
const fhe = await (hre as any).fhevm.createInstance();
const buf = fhe.createEncryptedInput(contract, user);
buf.add64(100n);
const { handles, inputProof } = await buf.encrypt();
await myContract.deposit(handles[0], inputProof);
```

### Integration (Sepolia)

```bash
hardhat test --network sepolia
```

Same tests against the real coprocessor + decryption oracle. Slow (oracle
latency); run before video / submission only.

### Property tests to write for any token-like contract

- Total supply invariant under transfers.
- Pay > balance does not leak (no revert) and does not subtract (branchless).
- ACL preserved on every storage write (every test that writes a ciphertext
  must subsequently `userDecrypt` from the expected user — that fails fast if
  ACL is missing).
- Unregistered actors cannot mutate state.

## Anti-patterns (DO NOT)

| Anti-pattern | Why it breaks | Fix |
|---|---|---|
| `if (FHE.lt(a,b)) revert();` | Branches on encrypted comparison; doesn't compile and would leak | `FHE.select(ok, a, FHE.asEuint64(0))` then commit |
| `_bal[u] = next;` without `FHE.allowThis(next)` | Next tx reads it → reverts with `ACLNotAllowed` | Always allowThis after every storage write |
| `require(encryptedX > 0)` | Type error — `>` returns `ebool` | Use `FHE.select` to zero out |
| Reusing `externalEuintN` across contracts | Input proof is bound to (contract, user) | Re-encrypt per target contract |
| Forgetting `allowTransient` before ERC-7984 call | Token contract cannot operate on ciphertext | `FHE.allowTransient(ct, address(token))` before call |
| Calling `requestDecryption` on hot UX path | 10–60 s latency | Use user-decryption for views; oracle only for settlement |
| `FHE.mul` / `FHE.div` of two ciphertexts in a loop | Gas explodes | Avoid; restructure to plaintext × ciphertext |
| Forgetting `setOperator` on ERC-7984 before transferFrom | Token call reverts | Frontend must prompt `setOperator(router, until)` once |
| Treating `euint64 zero` as default value | Reading uninitialized ciphertext is undefined | Guard with `FHE.isInitialized(ct)` then `FHE.asEuint64(0)` |
| Skipping `FHE.checkSignatures` in oracle callback | Anyone could call the callback | Always verify before acting on cleartext |
| Storing the cleartext after public decryption | Defeats the purpose of FHE | Settle the side effect (transfer, mint) and discard |
| Public decryption for views | Burns oracle latency, leaks publicly | User-decrypt instead |

## Configuration & deployment checklist

- Inherit `ZamaEthereumConfig` (or `SepoliaConfig`) from
  `@fhevm/solidity/config/ZamaConfig.sol` — wires coprocessor + oracle.
- Solidity `^0.8.24` minimum; Cancun EVM.
- `pnpm install` — pin `@fhevm/solidity ^0.11.1`,
  `@fhevm/hardhat-plugin ^0.4.2`, `@zama-fhe/relayer-sdk ^0.4.1`.
- After deploy, run `hardhat verify --network sepolia <address>`.
- Write addresses + ABIs into `web/lib/contracts.ts` (see
  `scripts/copy-abi.ts` in the worked example).
- Smoke test on Sepolia with a real wallet **before** recording any demo
  video.

## Worked example

The full reference repo: [`agent-pay-fhe`](https://github.com/joymadhu49/agent-pay-fhe).
Read in this order:

1. `contracts/contracts/AgentRegistry.sol` — public registry (no FHE), shows
   plain Solidity patterns to coexist with FHE contracts.
2. `contracts/contracts/ConfidentialPaymentRouter.sol` — canonical patterns:
   `FHE.fromExternal`, `FHE.allowTransient` to ERC-7984, branchless
   `FHE.select` pay, oracle `withdrawAll` + `settleExit`.
3. `contracts/contracts/mocks/MockConfidentialUSDT.sol` — minimal ERC-7984
   implementation for tests.
4. `contracts/test/ConfidentialPaymentRouter.test.ts` — encrypt + send +
   user-decrypt assertions; oracle drive via `hre.fhevm.awaitDecryptionOracle()`.
5. `web/lib/fhevm.ts` + `web/components/PayForm.tsx` — frontend encrypt + tx.
6. `web/app/me/page.tsx` — user-decrypt for the "my balance" view.

## References

- Zama Protocol docs: https://docs.zama.org/protocol
- Solidity guide: https://docs.zama.org/protocol/solidity-guides
- Relayer SDK: https://docs.zama.org/protocol/relayer-sdk-guides
- ERC-7984 standard + reference impls: https://github.com/zama-ai/openzeppelin-confidential-contracts
- Hardhat template: https://github.com/zama-ai/fhevm-hardhat-template
- Sepolia addresses: https://docs.zama.org/protocol/protocol-apps/addresses/testnet/sepolia
