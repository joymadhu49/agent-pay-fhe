import { router, wallet } from "../chain.js";

/// Tail the router for incoming Paid / Deposited events targeting this agent.
export async function watch() {
  const me = (await wallet.getAddress()).toLowerCase();
  console.log(`watching for events targeting ${me}…`);

  router.on("Paid", (from: string, to: string, ev: any) => {
    if (to.toLowerCase() === me) console.log(`PAID: from=${from} (block ${ev.log.blockNumber})`);
  });
  router.on("Deposited", (agent: string, ev: any) => {
    if (agent.toLowerCase() === me) console.log(`DEPOSITED (block ${ev.log.blockNumber})`);
  });
  router.on("ExitSettled", (agent: string, amount: bigint, ev: any) => {
    if (agent.toLowerCase() === me)
      console.log(`EXIT SETTLED: ${amount} (block ${ev.log.blockNumber})`);
  });

  // Keep process alive.
  await new Promise<void>(() => {});
}
