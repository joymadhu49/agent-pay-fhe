"use client";
import { useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { ROUTER_ABI, ROUTER_ADDRESS } from "../lib/contracts";
import { userDecryptU64 } from "../lib/fhevm";

export function EncryptedBalance() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [balance, setBalance] = useState<bigint | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function reveal() {
    if (!address || !publicClient || !walletClient) return;
    setBusy(true);
    setErr(null);
    try {
      const handle = (await publicClient.readContract({
        abi: ROUTER_ABI as any,
        address: ROUTER_ADDRESS,
        functionName: "balanceHandle",
        args: [address],
      })) as `0x${string}`;

      const cleartext = await userDecryptU64({
        contract: ROUTER_ADDRESS,
        handle,
        user: address,
        signTypedData: (a) => walletClient.signTypedData(a),
      });
      setBalance(cleartext);
    } catch (e: any) {
      setErr(e?.shortMessage ?? e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={reveal}
        disabled={busy || !address}
        className="border border-neutral-700 hover:bg-neutral-900 px-3 py-1 rounded text-sm"
      >
        {busy ? "Decrypting…" : balance == null ? "Reveal my balance" : "Refresh"}
      </button>
      {balance != null && (
        <div className="text-2xl font-mono">
          {(Number(balance) / 1_000_000).toFixed(6)} <span className="text-sm text-neutral-400">cUSDT</span>
        </div>
      )}
      {err && <p className="text-red-400 text-sm">{err}</p>}
    </div>
  );
}
