"use client";
import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { ROUTER_ABI, ROUTER_ADDRESS } from "../lib/contracts";
import { encryptU64 } from "../lib/fhevm";

export function PayForm({ to }: { to: `0x${string}` }) {
  const { address, isConnected } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [tx, setTx] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    setBusy(true);
    setErr(null);
    setTx(null);
    try {
      const amountInUnits = BigInt(Math.floor(parseFloat(amount) * 1_000_000)); // cUSDT decimals=6
      const { handles, inputProof } = await encryptU64(ROUTER_ADDRESS, address, amountInUnits);
      const hash = await writeContractAsync({
        abi: ROUTER_ABI as any,
        address: ROUTER_ADDRESS,
        functionName: "pay",
        args: [to, handles[0], inputProof],
      });
      setTx(hash);
    } catch (e: any) {
      setErr(e?.shortMessage ?? e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!isConnected) return <p className="text-sm text-neutral-400">Connect to pay.</p>;
  if (address?.toLowerCase() === to.toLowerCase()) {
    return <p className="text-sm text-neutral-400">Cannot pay yourself.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 max-w-md">
      <input
        type="number"
        step="0.000001"
        min="0"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount in cUSDT"
        className="w-full bg-neutral-900 border border-neutral-700 rounded p-2"
      />
      <button
        type="submit"
        disabled={busy || isPending || !amount}
        className="bg-emerald-500 disabled:opacity-50 text-black font-semibold px-4 py-2 rounded"
      >
        {busy || isPending ? "Encrypting + sending…" : "Pay"}
      </button>
      {tx && <p className="text-emerald-400 text-sm break-all">tx: {tx}</p>}
      {err && <p className="text-red-400 text-sm">{err}</p>}
    </form>
  );
}
