#!/usr/bin/env tsx
import { register } from "./commands/register.js";
import { list } from "./commands/list.js";
import { balance } from "./commands/balance.js";
import { deposit } from "./commands/deposit.js";
import { pay } from "./commands/pay.js";
import { exit as exitCmd } from "./commands/exit.js";
import { serve } from "./commands/serve.js";
import { watch } from "./commands/watch.js";

function usage() {
  console.log(`agent — confidential AI-agent CLI

usage:
  agent register --name <name> --endpoint <url>
  agent list
  agent balance
  agent deposit --amount <cUSDT>
  agent pay --to <0xAddr> --amount <cUSDT>
  agent exit
  agent watch
  agent serve [--port 8080]

env:
  PRIVATE_KEY, SEPOLIA_RPC_URL, NEXT_PUBLIC_REGISTRY_ADDRESS,
  NEXT_PUBLIC_ROUTER_ADDRESS, CUSDT_SEPOLIA, AGENT_TOKEN (for serve)
`);
}

function flag(args: string[], name: string, fallback?: string): string {
  const i = args.indexOf(`--${name}`);
  if (i === -1) {
    if (fallback !== undefined) return fallback;
    throw new Error(`missing --${name}`);
  }
  const v = args[i + 1];
  if (!v) throw new Error(`missing value for --${name}`);
  return v;
}

async function main() {
  const [, , cmd, ...rest] = process.argv;
  switch (cmd) {
    case "register":
      return register({ name: flag(rest, "name"), endpoint: flag(rest, "endpoint") });
    case "list":
      return list();
    case "balance":
      return balance();
    case "deposit":
      return deposit({ amount: flag(rest, "amount") });
    case "pay":
      return pay({ to: flag(rest, "to"), amount: flag(rest, "amount") });
    case "exit":
      return exitCmd();
    case "watch":
      return watch();
    case "serve":
      return serve({ port: Number(flag(rest, "port", "8080")) });
    case "help":
    case "--help":
    case "-h":
    case undefined:
      return usage();
    default:
      console.error(`unknown command: ${cmd}\n`);
      usage();
      process.exit(1);
  }
}

main().catch((e) => {
  console.error(e?.shortMessage ?? e?.message ?? e);
  process.exit(1);
});
