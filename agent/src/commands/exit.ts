import { router, wallet, publicDecryptU64 } from "../chain.js";
import { ZeroHash } from "ethers";

export async function exit() {
  const me = await wallet.getAddress();

  const already: boolean = await router.hasPendingExit(me);
  if (!already) {
    console.log("phase 1: snapshot + makePubliclyDecryptable…");
    const tx = await router.withdrawAll();
    const r = await tx.wait();
    console.log(`  withdrawAll tx ${r?.hash}`);
  } else {
    console.log("phase 1: already pending; resuming");
  }

  const handle: string = await router.pendingExitHandle(me);
  if (handle === ZeroHash) throw new Error("no pending snapshot");

  console.log("phase 2: fetching cleartext + proof from relayer (~10–60 s)…");
  const { cleartext, proof } = await publicDecryptU64(handle);
  console.log(`  cleartext: ${cleartext} (= ${(Number(cleartext) / 1_000_000).toFixed(6)} cUSDT)`);

  console.log("phase 3: settleExit on-chain…");
  const tx2 = await router.settleExit(me, cleartext, proof);
  const r2 = await tx2.wait();
  console.log(`  settleExit tx ${r2?.hash}`);
  console.log(`exit complete: ${cleartext} units of cUSDT returned`);
}
