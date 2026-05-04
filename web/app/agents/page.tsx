"use client";
import Link from "next/link";
import { useReadContract } from "wagmi";
import { REGISTRY_ABI, REGISTRY_ADDRESS } from "../../lib/contracts";

type Agent = {
  owner: `0x${string}`;
  name: string;
  endpoint: string;
  registeredAt: bigint;
  active: boolean;
};

export default function AgentsPage() {
  const { data, isLoading, error } = useReadContract({
    abi: REGISTRY_ABI as any,
    address: REGISTRY_ADDRESS,
    functionName: "listAgents",
    args: [0n, 50n],
  });

  const agents = (data as Agent[] | undefined) ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Registered agents</h1>
      {isLoading && <p>Loading…</p>}
      {error && <p className="text-red-400 text-sm">{error.message}</p>}
      <ul className="grid grid-cols-1 gap-3">
        {agents.map((a) => (
          <li key={a.owner} className="border border-neutral-800 rounded-lg p-4 hover:bg-neutral-900">
            <Link href={`/agent/${a.owner}`} className="block">
              <div className="font-semibold">{a.name}</div>
              <div className="text-sm text-neutral-400 font-mono">{a.owner}</div>
              <div className="text-xs text-neutral-500 break-all">{a.endpoint}</div>
            </Link>
          </li>
        ))}
        {!isLoading && agents.length === 0 && (
          <p className="text-neutral-400">No agents registered yet. Be the first.</p>
        )}
      </ul>
    </div>
  );
}
