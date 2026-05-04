import { router, cUSDT, wallet, userDecryptU64 } from "../chain.js";
import { ZeroHash } from "ethers";
import { config } from "../config.js";

export async function balance() {
  const me = await wallet.getAddress();
  console.log(`agent address: ${me}`);

  const routerHandle: string = await router.balanceHandle(me);
  if (routerHandle === ZeroHash) {
    console.log("router credit: 0 (uninitialised)");
  } else {
    const cleartext = await userDecryptU64(config.router, routerHandle);
    console.log(`router credit:    ${(Number(cleartext) / 1_000_000).toFixed(6)} cUSDT  (handle ${routerHandle.slice(0, 10)}…)`);
  }

  const cusdtHandle: string = await cUSDT.confidentialBalanceOf(me);
  if (cusdtHandle === ZeroHash) {
    console.log("cUSDT balance:    0 (uninitialised)");
  } else {
    const cleartext = await userDecryptU64(config.cUSDT, cusdtHandle);
    console.log(`cUSDT balance:    ${(Number(cleartext) / 1_000_000).toFixed(6)} cUSDT  (handle ${cusdtHandle.slice(0, 10)}…)`);
  }
}
