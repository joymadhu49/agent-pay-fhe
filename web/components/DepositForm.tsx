"use client";
import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { ROUTER_ABI, ROUTER_ADDRESS, CUSDT_ADDRESS } from "../lib/contracts";
import { encryptU64 } from "../lib/fhevm";

const CUSDT_OPERATOR_ABI = [
  {
    type: "function",
    name: "setOperator",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "until", type: "uint48" },
    ],
    outputs: [],
  },
] as const;

export function DepositForm() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [tx, setTx] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function approveOperator() {
    setErr(null);
    try {
      const until = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;
      const hash = await writeContractAsync({
        abi: CUSDT_OPERATOR_ABI,
        address: CUSDT_ADDRESS,
        functionName: "setOperator",
        args: [ROUTER_ADDRESS, until],
      });
      setTx(hash);
    } catch (e: any) {
      setErr(e?.shortMessage ?? e?.message ?? String(e));
    }
  }

  async function deposit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    setBusy(true);
    setErr(null);
    setTx(null);
    try {
      const amountInUnits = BigInt(Math.floor(parseFloat(amount) * 1_000_000));
      const { handles, inputProof } = await encryptU64(ROUTER_ADDRESS, address, amountInUnits);
      const hash = await writeContractAsync({
        abi: ROUTER_ABI as any,
        address: ROUTER_ADDRESS,
        functionName: "deposit",
        args: [handles[0], inputProof],
      });
      setTx(hash);
    } catch (e: any) {
      setErr(e?.shortMessage ?? e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!isConnected) return <p className="text-sm text-neutral-400">Connect to deposit.</p>;

  return (
    <div className="space-y-3 max-w-md">
      <button
        onClick={approveOperator}
        className="text-sm underline text-neutral-300 hover:text-white"
        type="button"
      >
        Approve router as cUSDT operator (one-time, 30 days)
      </button>
      <form onSubmit={deposit} className="space-y-3">
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
          {busy || isPending ? "Depositing…" : "Deposit"}
        </button>
      </form>
      {tx && <p className="text-emerald-400 text-sm break-all">tx: {tx}</p>}
      {err && <p className="text-red-400 text-sm">{err}</p>}
    </div>
  );
}
