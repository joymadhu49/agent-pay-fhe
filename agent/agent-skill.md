---
name: agent-pay-fhe-runtime
description: Use this skill when the user asks an LLM agent to participate in the agent-pay-fhe network on Sepolia — register itself, hold encrypted cUSDT credit, pay other registered agents with encrypted amounts, watch for incoming payments, or exit back to cUSDT. Trigger on "agent pay", "send confidential payment", "register my agent", "settle exit", "what's my agent's balance".
license: BSD-3-Clause-Clear
---

# Driving the agent-pay-fhe runtime

You are an LLM agent operating a wallet. The `agent` CLI lets you act on the
on-chain registry + confidential payment router with one shell command per
intent. Always use the CLI — do not write your own ethers code.

## Setup checks (do these first if anything fails)

- `pnpm agent balance` — confirms wallet address, router credit, cUSDT balance
- If router credit and cUSDT are both zero, you need to fund the wallet:
  - Get Sepolia ETH from a faucet
  - Get cUSDT via `scripts/fund-cusdt.ts` (mints + wraps test USDT)

## Map an intent to a command

| Intent                             | Command                                                       |
|------------------------------------|---------------------------------------------------------------|
| "register me as <name>"            | `agent register --name <name> --endpoint <url>`               |
| "what's my balance"                | `agent balance`                                               |
| "show me other agents"             | `agent list`                                                  |
| "deposit X cUSDT into router"      | `agent deposit --amount X` (auto-approves operator if needed) |
| "pay 0xAddr Y cUSDT"               | `agent pay --to 0xAddr --amount Y`                            |
| "wait for incoming payments"       | `agent watch`                                                 |
| "withdraw / exit / cash out"       | `agent exit`                                                  |
| "expose me as an HTTP endpoint"    | `agent serve --port 8080`                                     |

## Rules

- ALWAYS run `agent balance` after any state-changing command. The user wants
  to see the new balance, not assume it.
- The cleartext balance is private to the wallet owner — only call
  `agent balance` (which uses user-decryption) for the wallet you control.
  You CANNOT see another agent's balance.
- `pay` will revert if the recipient is not registered. Run `agent list` first
  if unsure.
- `exit` is two on-chain transactions plus ~10–60 s relayer latency. Tell the
  user this; do not assume immediate finality.
- `pay` more than the router credit does NOT revert — the contract sends 0
  branchlessly. You must check the post-state via `agent balance` to confirm
  the payment actually went through.

## Two-agent example (you driving, user asking)

> User: "send 0.5 cUSDT to Borealis"

```
$ agent list
0xCAFE…1234   Borealis     https://borealis.example/.well-known/agent
0xBEEF…5678   YourAgent    http://localhost:8080

$ agent pay --to 0xCAFE…1234 --amount 0.5
encrypting 500000 for router 0x39AAf…
paid 0.5 cUSDT to 0xCAFE…1234 (tx 0x…)

$ agent balance
agent address:  0xBEEF…5678
router credit:  4.500000 cUSDT
cUSDT balance:  0.000000 cUSDT
```

## Anti-patterns

- DO NOT try to read another agent's `router.balanceHandle(other)` cleartext.
  ACL forbids it.
- DO NOT call `agent exit` while a previous exit is still pending —
  `hasPendingExit` returns true and the contract reverts. Re-running
  `agent exit` resumes from phase 2.
- DO NOT pass amounts in raw units. The CLI takes whole cUSDT (decimal); it
  converts to 6-decimal units internally.
