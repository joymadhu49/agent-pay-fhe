#!/usr/bin/env tsx
// Fund the deployer with cUSDT on Sepolia by:
//   1. mint USDTMock to self N times (cap is 1 USDT per call)
//   2. approve cUSDT wrapper for the underlying balance
//   3. wrap into cUSDT
import { Wallet, JsonRpcProvider, Contract, parseUnits } from "ethers";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ENV = readFileSync(resolve(__dirname, "../.env"), "utf8");
function e(k: string) {
  const m = ENV.match(new RegExp(`^${k}=(.+)$`, "m"));
  if (!m) throw new Error(`missing env ${k}`);
  return m[1];
}

const RPC = e("SEPOLIA_RPC_URL");
const PK = e("PRIVATE_KEY");
const CUSDT = e("CUSDT_SEPOLIA");

const USDT_MOCK = "0xa7da08fafdc9097cc0e7d4f113a61e31d7e8e9b0"; // ConfidentialWrapper.underlying()
const TARGET_USDT = parseUnits("10", 6); // 10 USDT total
const MINT_PER_CALL = parseUnits("1", 6); // mock cap = 1 USDT per mint

const ERC20_ABI = [
  "function mint(address to, uint256 amount)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];
const WRAPPER_ABI = ["function wrap(address to, uint256 amount)"];

async function main() {
  const provider = new JsonRpcProvider(RPC);
  const wallet = new Wallet(PK, provider);
  const me = await wallet.getAddress();
  console.log("deployer:", me);

  const usdt = new Contract(USDT_MOCK, ERC20_ABI, wallet);
  const wrapper = new Contract(CUSDT, WRAPPER_ABI, wallet);

  let bal: bigint = await usdt.balanceOf(me);
  console.log(`current USDT balance: ${bal} (target ${TARGET_USDT})`);

  while (bal < TARGET_USDT) {
    const tx = await usdt.mint(me, MINT_PER_CALL);
    const r = await tx.wait();
    bal += MINT_PER_CALL;
    console.log(`minted ${MINT_PER_CALL} (tx ${r?.hash}); balance now ${bal}`);
  }

  console.log("approving cUSDT wrapper…");
  const approveTx = await usdt.approve(CUSDT, bal);
  await approveTx.wait();
  console.log(`approved ${bal} (tx ${approveTx.hash})`);

  console.log("wrapping…");
  const wrapTx = await wrapper.wrap(me, bal);
  const wrapR = await wrapTx.wait();
  console.log(`wrapped ${bal} into cUSDT (tx ${wrapR?.hash})`);

  const finalUsdt = await usdt.balanceOf(me);
  console.log(`underlying USDT balance: ${finalUsdt} (should be 0 after wrap)`);
  console.log("Done. Check confidential balance via fhevm.userDecryptEuint or the /me page.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
