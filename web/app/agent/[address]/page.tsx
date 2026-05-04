"use client";
import { useParams } from "next/navigation";
import { useReadContract } from "wagmi";
import { REGISTRY_ABI, REGISTRY_ADDRESS } from "../../../lib/contracts";
import { PayForm } from "../../../components/PayForm";

type Agent = {
  owner: `0x${string}`;
  name: string;
  endpoint: string;
  registeredAt: bigint;
  active: boolean;
};

export default function AgentPage() {
  const params = useParams<{ address: `0x${string}` }>();
  const target = params.address;

  const { data, isLoading, error } = useReadContract({
    abi: REGISTRY_ABI as any,
    address: REGISTRY_ADDRESS,
    functionName: "getAgent",
    args: [target],
  });

  const agent = data as Agent | undefined;

  return (
    <div className="space-y-6">
      {isLoading && <p>Loading…</p>}
      {error && <p className="text-red-400 text-sm">{error.message}</p>}
      {agent && (
        <>
          <div>
            <h1 className="text-2xl font-bold">{agent.name}</h1>
            <p className="text-sm text-neutral-400 font-mono">{agent.owner}</p>
            <p className="text-xs text-neutral-500 break-all">{agent.endpoint}</p>
          </div>
          <div className="border-t border-neutral-800 pt-4">
            <h2 className="text-lg font-semibold mb-2">Send confidential payment</h2>
            <PayForm to={agent.owner} />
          </div>
        </>
      )}
    </div>
  );
}
