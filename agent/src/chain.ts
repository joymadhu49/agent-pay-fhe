import { JsonRpcProvider, Wallet, Contract } from "ethers";
import { config } from "./config.js";
import { REGISTRY_ABI, ROUTER_ABI, CUSDT_ABI, ERC20_ABI } from "./abi.js";

let _fhe: any | null = null;
export async function getFhevm() {
  if (_fhe) return _fhe;
  // Node-only bundle of @zama-fhe/relayer-sdk; no initSDK needed (browser-only).
  const mod: any = await import("@zama-fhe/relayer-sdk/node");
  _fhe = await mod.createInstance({
    ...mod.SepoliaConfig,
    network: config.rpcUrl,
  });
  return _fhe;
}

export const provider = new JsonRpcProvider(config.rpcUrl);
export const wallet = new Wallet(config.privateKey, provider);

export const registry = new Contract(config.registry, REGISTRY_ABI, wallet);
export const router = new Contract(config.router, ROUTER_ABI, wallet);
export const cUSDT = new Contract(config.cUSDT, CUSDT_ABI, wallet);

export async function encryptU64(contractAddr: string, userAddr: string, amount: bigint) {
  const fhe = await getFhevm();
  const buf = fhe.createEncryptedInput(contractAddr, userAddr);
  buf.add64(amount);
  return buf.encrypt() as Promise<{ handles: string[]; inputProof: string }>;
}

export async function userDecryptU64(contractAddr: string, handle: string): Promise<bigint> {
  const fhe = await getFhevm();
  const { publicKey, privateKey } = fhe.generateKeypair();
  const start = Math.floor(Date.now() / 1000);
  const duration = 1;
  const eip712 = fhe.createEIP712(publicKey, [contractAddr], start, duration);
  const sig = await wallet.signTypedData(
    eip712.domain,
    { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
    eip712.message,
  );
  const result = await fhe.userDecrypt(
    [{ handle, contractAddress: contractAddr }],
    privateKey,
    publicKey,
    sig.replace(/^0x/, ""),
    [contractAddr],
    await wallet.getAddress(),
    start,
    duration,
  );
  return BigInt(result[handle]);
}

export async function publicDecryptU64(handle: string): Promise<{ cleartext: bigint; proof: string }> {
  const fhe = await getFhevm();
  const r = await fhe.publicDecrypt([handle]);
  return { cleartext: BigInt(r.clearValues[handle]), proof: r.decryptionProof };
}

export const cUSDT_ERC20 = new Contract(config.cUSDT, ERC20_ABI, wallet); // for approve/decimals view
