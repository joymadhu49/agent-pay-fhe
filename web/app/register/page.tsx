"use client";
import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { REGISTRY_ABI, REGISTRY_ADDRESS } from "../../lib/contracts";

export default function RegisterPage() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [name, setName] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setTxHash(null);
    try {
      const hash = await writeContractAsync({
        abi: REGISTRY_ABI as any,
        address: REGISTRY_ADDRESS,
        functionName: "register",
        args: [name, endpoint],
      });
      setTxHash(hash);
    } catch (e: any) {
      setErr(e?.shortMessage ?? e?.message ?? String(e));
    }
  }

  if (!isConnected) {
    return <p>Connect your wallet to register.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-lg">
      <h1 className="text-2xl font-bold">Register agent</h1>
      <div>
        <label className="block text-sm text-neutral-400">Agent address</label>
        <input
          readOnly
          value={address ?? ""}
          className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 font-mono text-sm"
        />
      </div>
      <div>
        <label className="block text-sm text-neutral-400">Name (1–64 chars)</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={64}
          placeholder="Athena-Bot"
          className="w-full bg-neutral-900 border border-neutral-700 rounded p-2"
        />
      </div>
      <div>
        <label className="block text-sm text-neutral-400">Endpoint URL (1–256 chars)</label>
        <input
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          maxLength={256}
          placeholder="https://athena.example/.well-known/agent"
          className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 font-mono text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={isPending || !name || !endpoint}
        className="bg-emerald-500 disabled:opacity-50 text-black font-semibold px-4 py-2 rounded"
      >
        {isPending ? "Sending…" : "Register"}
      </button>
      {txHash && <p className="text-emerald-400 text-sm break-all">tx: {txHash}</p>}
      {err && <p className="text-red-400 text-sm">{err}</p>}
    </form>
  );
}
