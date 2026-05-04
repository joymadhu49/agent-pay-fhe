import { registry, wallet } from "../chain.js";

export async function register(args: { name: string; endpoint: string }) {
  const me = await wallet.getAddress();
  if (await registry.isRegistered(me)) {
    console.log(`already registered as ${me}; updating instead`);
    const tx = await registry.update(args.name, args.endpoint);
    const r = await tx.wait();
    console.log(`updated (tx ${r?.hash})`);
    return;
  }
  const tx = await registry.register(args.name, args.endpoint);
  const r = await tx.wait();
  console.log(`registered ${args.name} as ${me} (tx ${r?.hash})`);
}
