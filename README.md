# agent-pay-fhe

> Confidential AI-agent payments on Zama FHEVM. Built for the
> [Zama Developer Program — Mainnet Season 2](https://www.zama.org/post/zama-developer-program-mainnet-season-2-confidential-finance-is-the-next-frontier).
> Targets **Builder** and **Bounty** tracks.

Each AI agent is an EOA. Agents register on a public on-chain directory, deposit
`cUSDT` into a router, and pay each other with **end-to-end encrypted amounts**
backed by FHEVM and ERC-7984. When an agent is done, it exits — the router uses
the public-decryption oracle to settle and returns `cUSDT` to the agent's
wallet.

The Bounty deliverable is [`SKILL.md`](./SKILL.md) at the repo root: a
production-ready Claude Code skill teaching AI agents how to write, test, and
deploy confidential FHEVM contracts. This repo is the canonical worked example
the skill points to.

## Live deployment (Sepolia)

| Contract | Address |
|---|---|
| `AgentRegistry` | [`0xc2827701f49966Ec7B9fC296aC37d17DF9B08C78`](https://sepolia.etherscan.io/address/0xc2827701f49966Ec7B9fC296aC37d17DF9B08C78#code) |
| `ConfidentialPaymentRouter` | [`0x39AAf80cC4621064fB24Ce86E93B8B7479E14041`](https://sepolia.etherscan.io/address/0x39AAf80cC4621064fB24Ce86E93B8B7479E14041#code) |
| `cUSDT` (Zama mock) | [`0x4E7B06D78965594eB5EF5414c357ca21E1554491`](https://sepolia.etherscan.io/address/0x4E7B06D78965594eB5EF5414c357ca21E1554491) |

- Demo URL: _Vercel link_
- Builder video (3 min): _YouTube unlisted_
- Bounty video (3 min, AI-agent demo): _YouTube unlisted_

## Quickstart

```bash
# Prereqs: Node ≥20, pnpm ≥9, a Sepolia RPC URL + funded private key
git clone https://github.com/<your-handle>/agent-pay-fhe
cd agent-pay-fhe
cp .env.example .env   # fill in PRIVATE_KEY, SEPOLIA_RPC_URL, ETHERSCAN_API_KEY

pnpm install
pnpm test                 # mock-FHEVM unit tests (fast)
pnpm deploy:sepolia       # deploy + verify + sync ABIs to web/lib/contracts.ts
pnpm seed                 # register 3 demo agents (optional)
pnpm dev                  # Next.js on http://localhost:3000
```

## Architecture (one-paragraph)

```
Browser ──encrypt(amount) via @zama-fhe/relayer-sdk──▶ ConfidentialPaymentRouter
   │                                                          │
   │ AgentRegistry.register(name, endpoint)                   │ FHE.fromExternal
   │                                                          │ FHE.add / FHE.sub / FHE.select
   │                                                          ▼
   │                                                       cUSDT (ERC-7984)
   │                                                          │
   ◀─── userDecrypt (EIP-712) for "my balance" view ─────────┤
                                                             │
                                  withdrawAll → requestDecryption → settleExit (oracle callback)
```

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for diagrams + threat model.

## What's in the repo

- `contracts/` — Hardhat workspace.
  - `AgentRegistry.sol` — public, plain Solidity, paginated registry.
  - `ConfidentialPaymentRouter.sol` — FHEVM, ERC-7984-backed credit + P2P pay + exit.
  - `mocks/MockConfidentialUSDT.sol` — minimal ERC-7984 used in unit tests.
  - `test/` — mocha tests with mock-FHEVM + user-decrypt assertions.
- `web/` — Next.js app router (wagmi + viem + RainbowKit + `@zama-fhe/relayer-sdk`).
- `skill/` — canonical SKILL.md + 5 example contracts + anti-patterns + test recipes.
- `SKILL.md` — copy of `skill/SKILL.md` at repo root for Bounty discoverability.
- `scripts/` — deploy-all.sh, copy-abi.ts, seed-agents.ts.
- `docs/` — PRE-FLIGHT.md, ARCHITECTURE.md, DEMO.md, SUBMISSION.md.

## Try it (end-to-end)

1. Get Sepolia ETH from [a faucet](https://faucet.sepolia.dev) for two test wallets.
2. Top each wallet up with mock `cUSDT` (Zama's testnet faucet) — see
   [docs.zama.org Sepolia addresses](https://docs.zama.org/protocol/protocol-apps/addresses/testnet/sepolia).
3. `/register` from each wallet (different names).
4. From wallet A: `/me` → "Approve router" → "Deposit 10".
5. From wallet A: `/agents` → click wallet B → "Pay 3".
6. From wallet B: `/me` → "Reveal my balance" — shows 3 cUSDT.
7. From wallet A: `/me` → "Exit". Wait ~30 s. cUSDT is back in wallet A.

## Submission

| Track | Deliverable | Where |
|---|---|---|
| Builder | Confidential dApp + frontend | this repo + Vercel demo |
| Builder | Documentation | `README.md`, `docs/ARCHITECTURE.md`, `docs/DEMO.md` |
| Builder | 3-min video pitch | `docs/DEMO.md` (script) + YouTube link in README |
| Builder | Sepolia deployment | `pnpm deploy:sepolia` + Etherscan verified |
| Bounty | `SKILL.md` for AI agents | `SKILL.md` at root + `skill/` source |
| Bounty | 3-min agent-demo video | `docs/DEMO.md` (script) + YouTube link in SKILL.md header |

See [`docs/SUBMISSION.md`](./docs/SUBMISSION.md) for the final checklist.

## License

BSD-3-Clause-Clear (matches Zama's choice). See `LICENSE`.
