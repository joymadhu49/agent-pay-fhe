# `@agent-pay-fhe/agent`

Headless AI-agent runtime for the agent-pay-fhe stack. Uses
`@zama-fhe/relayer-sdk/node` for FHE encryption + decryption from Node.js.

This is what an autonomous agent runs to participate in the network: register
itself on the public registry, hold an encrypted credit balance in the
`ConfidentialPaymentRouter`, pay other agents with encrypted amounts, watch
for incoming payments, and exit back to cUSDT.

## Install

```bash
pnpm install
```

Reads `.env` from the repo root (same file the contracts and web app use).
Required:

```
PRIVATE_KEY=0x…
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
NEXT_PUBLIC_REGISTRY_ADDRESS=0x…
NEXT_PUBLIC_ROUTER_ADDRESS=0x…
CUSDT_SEPOLIA=0x4E7B06D78965594eB5EF5414c357ca21E1554491
```

## Commands

```bash
pnpm agent register --name "Athena-Bot" --endpoint "https://athena.example/.well-known/agent"
pnpm agent list
pnpm agent balance
pnpm agent deposit --amount 5
pnpm agent pay --to 0xDe...ad --amount 1
pnpm agent watch                    # tail incoming Paid / Deposited / ExitSettled events
pnpm agent exit                     # 3-phase: withdrawAll → publicDecrypt → settleExit
pnpm agent serve --port 8080        # HTTP /info /pay /receive
```

## Two-agent demo

Open two terminals, each with its own `.env` (different `PRIVATE_KEY`).

Terminal A (Athena):
```bash
PRIVATE_KEY=0xAAA… pnpm agent register --name Athena --endpoint http://localhost:8081
PRIVATE_KEY=0xAAA… pnpm agent deposit --amount 5
PRIVATE_KEY=0xAAA… pnpm agent watch
```

Terminal B (Borealis):
```bash
PRIVATE_KEY=0xBBB… pnpm agent register --name Borealis --endpoint http://localhost:8082
PRIVATE_KEY=0xBBB… pnpm agent serve --port 8082 &
PRIVATE_KEY=0xBBB… pnpm agent watch
```

Terminal A: pay Borealis 1 cUSDT.
```bash
PRIVATE_KEY=0xAAA… pnpm agent pay --to 0xBBB… --amount 1
```

Athena's terminal logs the tx hash. Borealis's `watch` logs `PAID: from=0xAAA…`.
Athena exits. Borealis stays online to keep receiving.

## HTTP surface (for cross-agent orchestration)

`agent serve` exposes:

| Method | Path        | Purpose                                                  |
|--------|-------------|----------------------------------------------------------|
| GET    | `/info`     | `{ address, ok: true }` — discovery                      |
| POST   | `/pay`      | `{ to, amount }` — caller asks this agent to pay         |
| POST   | `/receive`  | `{ from, ref }` — caller notifies of an incoming payment |

Set `AGENT_TOKEN=…` and pass `Authorization: Bearer <token>` for `/pay`.

## Driving from Claude Code / an LLM

See `agent-skill.md` (sibling file) — a short SKILL.md fragment describing
each command so an LLM can call them via shell.
