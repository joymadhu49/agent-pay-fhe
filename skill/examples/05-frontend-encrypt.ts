// Frontend snippet: encrypt a u64 amount, build the externalEuint64 + proof,
// and submit a tx via wagmi. Drop into a Next.js client component.
import { initSDK, createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/bundle";
import { writeContract } from "@wagmi/core";
import type { Hex } from "viem";

let _instance: Awaited<ReturnType<typeof createInstance>> | null = null;
async function getFhevm() {
  if (_instance) return _instance;
  await initSDK();
  // window.ethereum supplies chainId + signer
  _instance = await createInstance({ ...SepoliaConfig, network: window.ethereum });
  return _instance;
}

export async function encryptU64(contract: Hex, user: Hex, amount: bigint) {
  const fhe = await getFhevm();
  const buf = fhe.createEncryptedInput(contract, user);
  buf.add64(amount);
  return buf.encrypt(); // { handles: Hex[], inputProof: Hex }
}

export async function depositToRouter(
  config: any, // wagmi Config
  routerAbi: any,
  routerAddress: Hex,
  userAddress: Hex,
  amount: bigint
) {
  const { handles, inputProof } = await encryptU64(routerAddress, userAddress, amount);
  return writeContract(config, {
    abi: routerAbi,
    address: routerAddress,
    functionName: "deposit",
    args: [handles[0], inputProof],
  });
}

// Reading "my balance" via user-decryption (EIP-712).
export async function readMyBalance(
  routerAddress: Hex,
  routerAbi: any,
  publicClient: any,
  walletClient: any,
  user: Hex
): Promise<bigint> {
  const fhe = await getFhevm();
  const handle = (await publicClient.readContract({
    address: routerAddress,
    abi: routerAbi,
    functionName: "balanceHandle",
    args: [user],
  })) as Hex;

  const { publicKey, privateKey } = fhe.generateKeypair();
  const eip712 = fhe.createEIP712(publicKey, [routerAddress]);
  const sig = await walletClient.signTypedData({
    domain: eip712.domain,
    types: eip712.types,
    primaryType: "UserDecryptRequestVerification",
    message: eip712.message,
  });
  const start = Math.floor(Date.now() / 1000);
  const result = await fhe.userDecrypt(
    [{ handle, contractAddress: routerAddress }],
    privateKey,
    publicKey,
    (sig as string).replace(/^0x/, ""),
    [routerAddress],
    user,
    start,
    1 // duration days
  );
  return BigInt(result[handle]);
}
