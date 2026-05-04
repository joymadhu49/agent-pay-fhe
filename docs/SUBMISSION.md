# Submission checklist

Deadline: **2026-05-10, 23:59 AOE** (submit ≥12 hours early).

## Builder track

- [ ] GitHub repo public, BSD-3-Clause-Clear license
- [ ] `pnpm test` passes (mock-FHEVM)
- [ ] `pnpm test:sepolia` passes against real coprocessor
- [ ] Both contracts deployed on Sepolia + verified on Etherscan
  - [ ] `AgentRegistry`
  - [ ] `ConfidentialPaymentRouter`
- [ ] `web/lib/contracts.ts` checked in with deployed addresses + ABIs
- [ ] Vercel deploy live; test the end-to-end "Try it" steps from README
- [ ] 3-minute Builder video uploaded to YouTube unlisted
  - [ ] Link added to `README.md`
  - [ ] Link added to submission form
- [ ] Submit Builder Track form: https://forms.zama.org/developer-program-mainnet-season2-builder-track

## Bounty track

- [ ] `SKILL.md` at repo root, BSD-3-Clause-Clear
- [ ] `skill/` source tree (examples + anti-patterns + test-recipes)
- [ ] All 8 Zama-required topics covered (encrypted types, FHE ops, ACL,
      input proofs, decryption patterns, frontend integration, testing
      methodology, anti-pattern prevention)
- [ ] 3-minute Bounty video uploaded to YouTube unlisted (AI agent demo)
  - [ ] Link added to `SKILL.md` header
  - [ ] Link added to submission form
- [ ] Submit Bounty Track form: https://forms.zama.org/developer-program-mainnet-season2-bounty-track

## Resources to attach in both forms

- Repo URL: `https://github.com/<your-handle>/agent-pay-fhe`
- Live demo URL: `https://<your-vercel>.vercel.app`
- SKILL.md raw URL: `https://raw.githubusercontent.com/<your-handle>/agent-pay-fhe/main/SKILL.md`
- Etherscan links:
  - AgentRegistry: `https://sepolia.etherscan.io/address/<addr>`
  - ConfidentialPaymentRouter: `https://sepolia.etherscan.io/address/<addr>`
- Builder video URL
- Bounty video URL

## Judging-criteria mapping (Bounty)

| Criterion | Where it is satisfied |
|---|---|
| Accuracy | `SKILL.md` is grounded in `@fhevm/solidity ^0.11.1` + `@zama-fhe/relayer-sdk ^0.4.1`; every code snippet matches the reference repo |
| Completeness | All 8 Zama-required topics have dedicated sections + recipes |
| Agent effectiveness | Bounty video shows a fresh agent producing a working contract from a prompt + SKILL.md |
| Code quality | All examples compile, are linted, and follow the same ACL discipline as the worked example |
| Error prevention | "Anti-patterns" table + `skill/anti-patterns.md` cover 12+ specific footguns with bad/good code |
