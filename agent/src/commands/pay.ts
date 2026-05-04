import { parseUnits, getAddress } from "ethers";
import { router, registry, wallet, encryptU64 } from "../chain.js";
import { config } from "../config.js";

export async function pay(args: { to: string; amount: string }) {
  const me = await wallet.getAddress();
  const to = getAddress(args.to);
  const units = parseUnits(args.amount, 6);

  if (!(await registry.isRegistered(me))) throw new Error("not registered");
  if (!(await registry.isRegistered(to))) throw new Error(`recipient ${to} not registered`);

  console.log(`encrypting ${units} for router ${config.router}…`);
  const enc = await encryptU64(config.router, me, units);

  const tx = await router.pay(to, enc.handles[0], enc.inputProof);
  const r = await tx.wait();
  console.log(`paid ${args.amount} cUSDT to ${to} (tx ${r?.hash})`);
}
