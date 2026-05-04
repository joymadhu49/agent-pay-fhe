"use client";
import { useAccount, useReadContract } from "wagmi";
import { REGISTRY_ABI, REGISTRY_ADDRESS } from "../../lib/contracts";
import { EncryptedBalance } from "../../components/EncryptedBalance";
import { DepositForm } from "../../components/DepositForm";
import { ExitButton } from "../../components/ExitButton";

export default function MePage() {
  const { address, isConnected } = useAccount();
  const { data: registered } = useReadContract({
    abi: REGISTRY_ABI as any,
    address: REGISTRY_ADDRESS,
    functionName: "isRegistered",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  if (!isConnected) return <p>Connect your wallet.</p>;
  if (!registered) {
    return (
      <p>
        You are not registered yet. <a href="/register" className="underline">Register</a> first.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold mb-2">My encrypted balance</h2>
        <EncryptedBalance />
      </section>
      <section>
        <h2 className="text-lg font-semibold mb-2">Deposit cUSDT</h2>
        <DepositForm />
      </section>
      <section>
        <h2 className="text-lg font-semibold mb-2">Exit</h2>
        <ExitButton />
      </section>
    </div>
  );
}
