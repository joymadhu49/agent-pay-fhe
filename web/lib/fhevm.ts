"use client";
import type { Hex } from "viem";

let _instance: any | null = null;

export async function getFhevm() {
  if (_instance) return _instance;
  if (typeof window === "undefined") {
    throw new Error("fhevm only available in the browser");
  }
  const mod: any = await import("@zama-fhe/relayer-sdk/bundle");
  await mod.initSDK();
  _instance = await mod.createInstance({ ...mod.SepoliaConfig, network: (window as any).ethereum });
  return _instance;
}

export async function encryptU64(contract: Hex, user: Hex, amount: bigint) {
  const fhe = await getFhevm();
  const buf = fhe.createEncryptedInput(contract, user);
  buf.add64(amount);
  return buf.encrypt() as Promise<{ handles: Hex[]; inputProof: Hex }>;
}

export async function publicDecryptU64(handle: Hex): Promise<{ cleartext: bigint; proof: Hex }> {
  const fhe = await getFhevm();
  const r = await fhe.publicDecrypt([handle]);
  return { cleartext: BigInt(r.clearValues[handle]), proof: r.decryptionProof as Hex };
}

export async function userDecryptU64(opts: {
  contract: Hex;
  handle: Hex;
  user: Hex;
  signTypedData: (args: any) => Promise<Hex>;
  durationDays?: number;
}): Promise<bigint> {
  const fhe = await getFhevm();
  const { publicKey, privateKey } = fhe.generateKeypair();
  const eip712 = fhe.createEIP712(publicKey, [opts.contract]);
  const signature = await opts.signTypedData({
    domain: eip712.domain,
    types: eip712.types,
    primaryType: "UserDecryptRequestVerification",
    message: eip712.message,
  });
  const start = Math.floor(Date.now() / 1000);
  const result = await fhe.userDecrypt(
    [{ handle: opts.handle, contractAddress: opts.contract }],
    privateKey,
    publicKey,
    (signature as string).replace(/^0x/, ""),
    [opts.contract],
    opts.user,
    start,
    opts.durationDays ?? 1,
  );
  return BigInt(result[opts.handle]);
}
