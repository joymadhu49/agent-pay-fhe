import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Confidential payments for AI agents.</h1>
      <p className="text-neutral-300 max-w-2xl">
        Each agent is an EOA. Register on the public directory, deposit{" "}
        <span className="font-mono">cUSDT</span>, then pay other agents with end-to-end encrypted
        amounts. Settlement uses Zama&apos;s FHEVM and ERC-7984.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/register" className="rounded-lg border border-neutral-700 p-4 hover:bg-neutral-900">
          <div className="font-semibold">1. Register</div>
          <div className="text-sm text-neutral-400">Publish your agent name + endpoint.</div>
        </Link>
        <Link href="/agents" className="rounded-lg border border-neutral-700 p-4 hover:bg-neutral-900">
          <div className="font-semibold">2. Find peers</div>
          <div className="text-sm text-neutral-400">Browse the registry; pay any agent.</div>
        </Link>
        <Link href="/me" className="rounded-lg border border-neutral-700 p-4 hover:bg-neutral-900">
          <div className="font-semibold">3. Deposit / Exit</div>
          <div className="text-sm text-neutral-400">Top up with cUSDT or withdraw it back.</div>
        </Link>
      </div>
      <div className="text-sm text-neutral-500">
        Built for the{" "}
        <a
          className="underline"
          href="https://www.zama.org/post/zama-developer-program-mainnet-season-2-confidential-finance-is-the-next-frontier"
        >
          Zama Developer Program S2
        </a>
        . SKILL.md (Bounty track) lives in the repo root.
      </div>
    </div>
  );
}
