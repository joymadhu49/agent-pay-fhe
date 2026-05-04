#!/usr/bin/env bash
set -euo pipefail

# 1. Compile + deploy to Sepolia
pnpm -C contracts compile
pnpm -C contracts hardhat deploy --network sepolia

# 2. Verify on Etherscan
pnpm -C contracts hardhat etherscan-verify --network sepolia || echo "verify failed (non-fatal)"

# 3. Copy addresses + ABIs into web/lib/contracts.ts
pnpm tsx scripts/copy-abi.ts

# 4. (Optional) seed demo agents
if [[ "${SEED:-0}" = "1" ]]; then
  pnpm -C contracts hardhat run ../scripts/seed-agents.ts --network sepolia
fi

echo "Done. web/lib/contracts.ts updated."
