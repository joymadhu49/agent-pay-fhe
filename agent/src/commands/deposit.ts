import { parseUnits } from "ethers";
import { router, cUSDT, wallet, encryptU64 } from "../chain.js";
import { config } from "../config.js";

export async function deposit(args: { amount: string }) {
  const me = await wallet.getAddress();
  const units = parseUnits(args.amount, 6);

  // Ensure router is approved as cUSDT operator.
  const isOp: boolean = await cUSDT.isOperator(me, config.router);
  if (!isOp) {
    const until = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;
    const tx = await cUSDT.setOperator(config.router, until);
    const r = await tx.wait();
    console.log(`set router as cUSDT operator (tx ${r?.hash})`);
  }

  console.log(`encrypting ${units} units (= ${args.amount} cUSDT)…`);
  const enc = await encryptU64(config.router, me, units);

  console.log("submitting deposit…");
  const tx = await router.deposit(enc.handles[0], enc.inputProof);
  const r = await tx.wait();
  console.log(`deposited ${args.amount} cUSDT (tx ${r?.hash})`);
}
