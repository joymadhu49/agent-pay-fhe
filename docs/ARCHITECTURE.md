# Architecture

## System overview

```mermaid
flowchart LR
    subgraph Browser
        UI[Next.js UI]
        SDK[@zama-fhe/relayer-sdk]
        Wallet[Wallet / RainbowKit]
    end
    subgraph Sepolia
        Reg[AgentRegistry]
        Router[ConfidentialPaymentRouter]
        cUSDT[cUSDT - ERC-7984]
    end
    subgraph Zama
        Coproc[FHEVM Coprocessor]
        Oracle[Decryption Oracle / KMS]
        Relayer[Relayer]
    end

    UI --> Wallet
    UI --> SDK
    SDK <--> Relayer
    Wallet -- tx --> Router
    Wallet -- tx --> Reg
    Wallet -- setOperator --> cUSDT
    Router -- confidentialTransferFrom --> cUSDT
    Router -- requestDecryption --> Oracle
    Oracle -- settleExit callback --> Router
    Router -. encrypted ops .- Coproc
    cUSDT -. encrypted ops .- Coproc
```

## Pay flow (encrypted amount)

```mermaid
sequenceDiagram
    autonumber
    actor Alice
    participant SDK as relayer-sdk
    participant Router as ConfidentialPaymentRouter
    participant Bob as Bob (recipient)

    Alice->>SDK: createEncryptedInput(router, alice).add64(amount).encrypt()
    SDK-->>Alice: { handles, inputProof }
    Alice->>Router: pay(bob, handles[0], inputProof)
    Router->>Router: FHE.fromExternal(handles[0], inputProof)
    Router->>Router: FHE.le(amount, _bal[alice]) → ebool ok
    Router->>Router: sendAmt = FHE.select(ok, amount, 0)
    Router->>Router: _bal[alice] -= sendAmt; _bal[bob] += sendAmt
    Router->>Router: FHE.allowThis + FHE.allow on both new balances
    Router-->>Alice: emit Paid(alice, bob)
```

The cleartext amount never leaves Alice's browser. The contract operates on
ciphertexts; only the receiver and sender can user-decrypt their own balance
afterward.

## Exit flow (split public-decryption, v0.11)

```mermaid
sequenceDiagram
    autonumber
    actor Alice
    participant SDK as relayer-sdk
    participant Router
    participant Relayer as Zama Relayer / KMS
    participant cUSDT

    Alice->>Router: withdrawAll()
    Router->>Router: snapshot _bal[alice] → _pendingSnapshot[alice]
    Router->>Router: FHE.makePubliclyDecryptable(snapshot); zero _bal[alice]
    Router-->>Alice: emit ExitRequested(alice)
    Alice->>Router: pendingExitHandle(alice)
    Router-->>Alice: euint64 snapHandle
    Alice->>SDK: publicDecrypt([snapHandle])
    SDK->>Relayer: fetch cleartext + proof
    Note over Relayer: ~10–60 s on Sepolia
    Relayer-->>SDK: { clearValues, abiEncodedClearValues, decryptionProof }
    Alice->>Router: settleExit(alice, cleartextAmount, decryptionProof)
    Router->>Router: FHE.checkSignatures([snapHandle], abi.encode(cleartextAmount), proof)
    Router->>cUSDT: confidentialTransfer(alice, cleartextAmount)
    Router-->>Alice: emit ExitSettled(alice, cleartextAmount)
```

## Threat model

**Confidentiality goals.**
- Payment amounts (deposit, pay, exit) are private to sender + receiver.
- Per-agent balances are private to the agent (user-decryption via EIP-712).

**Public on purpose.**
- Sender + receiver addresses, timestamps, frequency.
- Registry metadata: agent name, endpoint URL, registration timestamp. (We
  intentionally publish this so peers can discover each other.)
- Oracle reveals the **cleartext exit amount** when an agent withdraws — this
  is the same surface as a public ERC-20 transfer back to the user wallet, so
  no incremental leak.

**Trust assumptions.**
- The Zama coprocessor + KMS + decryption oracle behave honestly per protocol
  spec. We do not introduce a new trust assumption.
- The `cUSDT` contract behaves per ERC-7984.

**What is NOT defended.**
- Traffic analysis on RPC (browser → Sepolia RPC reveals interaction patterns).
- Out-of-band correlation (an agent's HTTPS endpoint may leak identity).
- Side-channel via gas / time of FHE ops (FHE ops are constant-shape but not
  constant-time; for the threat model of "amount privacy" this is fine).

**Known mitigations not implemented.**
- Hiding sender / receiver addresses (would require eaddress + a different
  contract topology).
- Range proofs to bound deposits / payments.
- Rate limiting.

## Why FHE here vs ZK

We need a **mutable, accumulating, on-chain** state (balances) that updates
per transaction with an encrypted amount, where the contract itself must
operate on the ciphertext to enforce correctness (sub from sender, add to
recipient). Pure ZK proofs verify a statement off-chain; FHE lets the chain
itself do the math while the inputs stay encrypted.

The cost is gas: an FHE add costs O(thousands) gas vs O(tens) for plaintext.
We avoid `FHE.mul` and `FHE.div` entirely; everything in the hot path is
`add`, `sub`, `le`, `select`.
