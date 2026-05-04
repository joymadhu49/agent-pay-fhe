# FHEVM test recipes

Copy-paste mocha blocks. Each one is something you should write for any
FHEVM-backed token-like contract.

## 1. Encrypt + send + assert via user-decrypt

```ts
import { expect } from "chai";
import { ethers } from "hardhat";
import hre from "hardhat";

it("deposits credit encrypted balance", async () => {
  const [, alice] = await ethers.getSigners();
  const fhe = await (hre as any).fhevm.createInstance();

  const buf = fhe.createEncryptedInput(await router.getAddress(), alice.address);
  buf.add64(100n);
  const { handles, inputProof } = await buf.encrypt();

  await router.connect(alice).deposit(handles[0], inputProof);

  const handle = await router.balanceHandle(alice.address);

  // user-decrypt
  const { publicKey, privateKey } = fhe.generateKeypair();
  const eip712 = fhe.createEIP712(publicKey, [await router.getAddress()]);
  const sig = await alice.signTypedData(
    eip712.domain,
    { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
    eip712.message,
  );
  const result = await fhe.userDecrypt(
    [{ handle, contractAddress: await router.getAddress() }],
    privateKey, publicKey, sig.replace(/^0x/, ""),
    [await router.getAddress()], alice.address, Math.floor(Date.now()/1000), 1,
  );
  expect(BigInt(result[handle])).to.equal(100n);
});
```

## 2. Pay > balance: branchless invariant

```ts
it("pay > balance does not subtract or revert", async () => {
  await deposit(alice, 50n);
  await pay(alice, bob, 999n);   // does not throw
  expect(await getBal(alice)).to.equal(50n);
  expect(await getBal(bob)).to.equal(0n);
});
```

## 3. Total-supply invariant under transfer

```ts
it("conserves total credit across pay", async () => {
  await deposit(alice, 100n);
  await deposit(bob,   100n);
  const before = (await getBal(alice)) + (await getBal(bob));
  await pay(alice, bob, 30n);
  const after  = (await getBal(alice)) + (await getBal(bob));
  expect(before).to.equal(after);
});
```

## 4. Public-decryption split flow (v0.11)

```ts
import { FhevmType } from "@fhevm/hardhat-plugin";

it("withdrawAll → publicDecrypt → settleExit", async () => {
  await deposit(alice, 250n);
  await router.connect(alice).withdrawAll();

  const snap = await router.pendingExitHandle(alice.address);
  const r = await (hre as any).fhevm.publicDecrypt([snap]);
  const cleartext = BigInt(r.clearValues[snap]);

  await router.connect(alice).settleExit(alice.address, cleartext, r.decryptionProof);
  expect(await getBal(alice)).to.equal(0n);
});
```

## 5. ACL preservation

The simplest property test: every `getBal` call must succeed (not revert with
`ACLNotAllowed`). If your contract forgets `FHE.allowThis` on a write, this
test fails. Run it after **every** state-mutating function, not just the last.
