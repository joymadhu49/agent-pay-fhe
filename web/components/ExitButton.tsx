"use client";
import { useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { ROUTER_ABI, ROUTER_ADDRESS } from "../lib/contracts";
import { publicDecryptU64 } from "../lib/fhevm";

type Phase = "idle" | "requesting" | "decrypting" | "settling" | "done";

export function ExitButton() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [phase, setPhase] = useState<Phase>("idle");
  const [tx1, setTx1] = useState<string | null>(null);
  const [tx2, setTx2] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onExit() {
    if (!address || !publicClient) return;
    setErr(null);
    setTx1(null);
    setTx2(null);

    try {
      // Phase 1: snapshot + makePubliclyDecryptable.
      setPhase("requesting");
      const reqHash = await writeContractAsync({
        abi: ROUTER_ABI as any,
        address: ROUTER_ADDRESS,
        functionName: "withdrawAll",
        args: [],
      });
      setTx1(reqHash);
      await publicClient.waitForTransactionReceipt({ hash: reqHash as `0x${string}` });

      // Phase 2: fetch cleartext + proof from relayer.
      setPhase("decrypting");
      const snapHandle = (await publicClient.readContract({
        abi: ROUTER_ABI as any,
        address: ROUTER_ADDRESS,
        functionName: "pendingExitHandle",
        args: [address],
      })) as `0x${string}`;

      const { cleartext, proof } = await publicDecryptU64(snapHandle);

      // Phase 3: submit (cleartext, proof) to settleExit.
      setPhase("settling");
      const settleHash = await writeContractAsync({
        abi: ROUTER_ABI as any,
        address: ROUTER_ADDRESS,
        functionName: "settleExit",
        args: [address, cleartext, proof],
      });
      setTx2(settleHash);
      await publicClient.waitForTransactionReceipt({ hash: settleHash as `0x${string}` });
      setPhase("done");
    } catch (e: any) {
      setErr(e?.shortMessage ?? e?.message ?? String(e));
      setPhase("idle");
    }
  }

  const label =
    phase === "idle"
      ? "Exit (withdraw all to cUSDT)"
      : phase === "requesting"
        ? "Snapshotting balance…"
        : phase === "decrypting"
          ? "Waiting for relayer (~10–60s)…"
          : phase === "settling"
            ? "Settling on-chain…"
            : "Exit complete";

  return (
    <div className="space-y-2">
      <button
        onClick={onExit}
        disabled={phase !== "idle" && phase !== "done"}
        className="bg-red-500/20 border border-red-500 text-red-200 hover:bg-red-500/30 disabled:opacity-50 px-4 py-2 rounded"
      >
        {label}
      </button>
      <p className="text-xs text-neutral-500">
        Two transactions: (1) snapshot + makePubliclyDecryptable, (2) settleExit with proof from
        the Zama relayer. cUSDT is in your wallet after step (2).
      </p>
      {tx1 && <p className="text-emerald-400 text-sm break-all">withdrawAll: {tx1}</p>}
      {tx2 && <p className="text-emerald-400 text-sm break-all">settleExit: {tx2}</p>}
      {err && <p className="text-red-400 text-sm">{err}</p>}
    </div>
  );
}
