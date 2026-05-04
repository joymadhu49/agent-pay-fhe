# Demo videos — production scripts

Two videos. Both ≤ 3 min. Both unlisted on YouTube; URLs go in the
submission form, the README, and the SKILL.md header.

## 1. Builder track video — "Confidential payments for AI agents"

**Goal.** A non-technical Zama judge sees a real on-chain confidential payment
between two AI agents and understands why FHE matters.

| Time | Action on screen | Voiceover |
|---|---|---|
| 0:00–0:15 | Title card: "agent-pay-fhe — confidential payments for AI agents" | "AI agents are starting to transact on-chain. Today, every payment leaks. Here is what fixes that." |
| 0:15–0:35 | Open `/register`, sign tx as Alice | "Each agent is an EOA. Alice registers her name and endpoint on a public registry — peers can find her." |
| 0:35–0:55 | Repeat for Bob in a second wallet. | "Bob does the same." |
| 0:55–1:15 | Alice → `/me` → "Approve router" → "Deposit 10" | "Alice approves the router as a cUSDT operator, then deposits 10. The amount is encrypted in her browser before it touches the chain." |
| 1:15–1:55 | Alice → `/agents` → click Bob → "Pay 3" → tx confirms | "Alice pays Bob 3 cUSDT. The amount goes through `FHE.fromExternal` and `FHE.add`. Look at the tx: no cleartext anywhere — only ciphertexts." |
| 1:55–2:20 | Switch to Bob's wallet → `/me` → "Reveal my balance" → 3.000000 | "Bob signs an EIP-712 request and the relayer decrypts only for Bob: 3 cUSDT. No one else can see this." |
| 2:20–2:40 | Alice → `/me` → "Exit" → wait → cUSDT in wallet | "Alice exits. The decryption oracle settles, the router transfers cUSDT back. End-to-end private, on-chain settled." |
| 2:40–3:00 | Cut to GitHub repo + SKILL.md | "Source, contracts, and SKILL.md for the Bounty track at github.com/joymadhu49/agent-pay-fhe." |

**Recording tips.**
- Pre-fund both wallets with Sepolia ETH and mock cUSDT — show clean state.
- Use a dual-window setup so you can switch wallets without disconnecting.
- Pre-trigger a dummy exit before recording so the oracle is warm.
- Record at 1080p, 30 fps. No music.

## 2. Bounty track video — "AI agent builds an FHEVM contract from a prompt"

**Goal.** A Zama judge sees Claude Code (or another agent) read SKILL.md and
produce a working confidential contract from a natural-language prompt — no
human edits.

| Time | Action on screen | Voiceover |
|---|---|---|
| 0:00–0:15 | Title card: "Bounty: SKILL.md for FHEVM" | "This skill teaches an AI agent to write, test, and deploy confidential FHEVM contracts." |
| 0:15–0:30 | Show SKILL.md scrolling | "Encrypted types, ACL, input proofs, oracle callback, anti-patterns — all in one file." |
| 0:30–1:00 | Drop into a fresh Claude Code session in an empty repo. Prompt: *"Using `SKILL.md`, write a confidential tip jar where anyone can tip an encrypted amount and only the owner can read the running total."* | "Fresh session. No prior context. Just the skill and the prompt." |
| 1:00–2:10 | Time-lapse: agent reads SKILL.md, writes `ConfidentialTipJar.sol`, writes a hardhat test, runs `pnpm hardhat test`. Tests pass. | "Agent picks `euint64`. Adds `FHE.allowThis` and `FHE.allow(owner)` on every write. Branchless. Tests pass on the first run." |
| 2:10–2:40 | Open the diff side-by-side with `skill/examples/03-input-proofs.sol` | "The output matches the canonical pattern from the worked example — same ACL discipline, same proof handling." |
| 2:40–3:00 | Cut to repo + Sepolia Etherscan of agent-pay-fhe | "Repo, SKILL.md, and the agent-pay-fhe deployment at github.com/joymadhu49/agent-pay-fhe." |

**Recording tips.**
- Run the agent in time-lapse (4×–8×) for the actual code generation; cut
  to real-time for the test run + prompt.
- If the agent makes a small fix iteration, leave it in — it shows the skill
  guides correction.
- Pre-stage the empty repo with `pnpm init` and a `hardhat.config.ts` shell
  so the run focuses on the FHEVM-specific parts.
