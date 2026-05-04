# Pre-flight findings (verified 2026-05-03)

## Sepolia addresses (verified from docs.zama.org)

| Contract | Address |
|---|---|
| Confidential USDT (cUSDT mock) | `0x4E7B06D78965594eB5EF5414c357ca21E1554491` |
| Zama Token | `0xa798B04149e7a61cc95B7D114AD420e8969eA268` |
| KMS | `0x0309b4308A6AC121B9b3A960aC7Bc9bd8256cf38` |
| Coprocessor | `0xc22E393D2A1C1BD65c88d34a3bE4DD77e8952E71` |

ACL / KMS Verifier / Input Verifier / Decryption Oracle addresses are wired automatically via `ZamaEthereumConfig` (or `SepoliaConfig` if shipped). Confirm by importing from `@fhevm/solidity/config/ZamaConfig.sol`.

## Package versions (pinned from fhevm-hardhat-template @ HEAD)

```
@fhevm/solidity         ^0.11.1
@fhevm/hardhat-plugin   ^0.4.2
@fhevm/mock-utils       ^0.4.2
@zama-fhe/relayer-sdk   ^0.4.1
encrypted-types         ^0.0.4
hardhat                 ^2.28.4
ethers                  ^6.16.0
hardhat-deploy          ^0.11.45
typescript              ^5.9.3
```

Node `>=20`. Use `pnpm` workspaces.

## Contract config

- Inherit `ZamaEthereumConfig` from `@fhevm/solidity/config/ZamaConfig.sol`.
- Solidity `^0.8.24` minimum (template uses this).
- ERC-7984 canonical interface lives at `zama-ai/openzeppelin-confidential-contracts` (`master` branch). We vendor `IERC7984.sol`.

## Reference / prior art

- `zama-ai/fhevm-hardhat-template` — base scaffold + mock FHEVM tests.
- `zama-ai/openzeppelin-confidential-contracts` — ERC-7984 spec + reference impls.
- `zama-ai/confidential-agentic-payment-stack` (a.k.a. `x402fhe`) — agentic stack focused on x402 paywall payments. **We differentiate** by:
  - Direct P2P agent→agent transfers (no x402/HTTP middleware).
  - Lightweight registry (name + endpoint) instead of NFT identity + reputation.
  - Bounty-grade SKILL.md as a teaching artifact (not a per-app helper skill).

## Risks confirmed

- Sepolia oracle latency: budget 30–60s for `withdrawAll` settlement; UX shows pending state.
- Browser SDK requires HTTPS + COOP/COEP headers in `next.config.mjs` for SAB.
- `setOperator(router, until)` must be called by user on cUSDT before first deposit.
- `FHE.mul` avoided; only `add/sub/le/select` used to keep gas predictable.

## Open items

- Confirm exact `SepoliaConfig` symbol name once we run `pnpm install` (template uses `ZamaEthereumConfig`).
- Confirm decryption oracle gas overhead vs HCU budget by probing on first deploy.
