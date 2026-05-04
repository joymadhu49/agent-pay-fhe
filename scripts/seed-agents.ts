#!/usr/bin/env tsx
// Seed the deployer wallet as an agent on the live Sepolia AgentRegistry so the
// /agents page is non-empty out of the box. Run via:
//   pnpm -C contracts hardhat run ../scripts/seed-agents.ts --network sepolia
//
// To register additional agents, fund more wallets and edit DEMO_AGENTS.
import hre from "hardhat";

const DEMO_AGENTS = [
  { name: "Origin-Bot", endpoint: "https://origin.example/.well-known/agent" },
];

async function main() {
  const { deployments, ethers } = hre;
  const reg = await deployments.get("AgentRegistry");
  const signers = await ethers.getSigners();

  for (let i = 0; i < DEMO_AGENTS.length; ++i) {
    const a = DEMO_AGENTS[i];
    const s = signers[i] ?? signers[0];
    const c = await ethers.getContractAt("AgentRegistry", reg.address, s);
    if (await c.isRegistered(s.address)) {
      console.log(`already registered: ${s.address}`);
      continue;
    }
    const tx = await c.register(a.name, a.endpoint);
    await tx.wait();
    console.log(`registered ${a.name} as ${s.address} (tx ${tx.hash})`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
