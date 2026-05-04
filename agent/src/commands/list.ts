import { registry } from "../chain.js";

export async function list() {
  const total: bigint = await registry.totalAgents();
  const agents = await registry.listAgents(0, total);
  for (const a of agents) {
    console.log(`${a.owner}\t${a.name}\t${a.endpoint}`);
  }
}
