import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readEnv(): Record<string, string> {
  const candidates = [
    resolve(__dirname, "../../.env"),
    resolve(process.cwd(), ".env"),
  ];
  for (const p of candidates) {
    try {
      const raw = readFileSync(p, "utf8");
      const out: Record<string, string> = {};
      for (const line of raw.split(/\r?\n/)) {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (m) out[m[1]] = m[2];
      }
      return out;
    } catch {}
  }
  return {};
}

const fileEnv = readEnv();
function pick(k: string): string {
  const v = process.env[k] ?? fileEnv[k];
  if (!v) throw new Error(`missing env ${k}`);
  return v;
}

export const config = {
  rpcUrl: pick("SEPOLIA_RPC_URL"),
  privateKey: pick("PRIVATE_KEY"),
  registry: process.env.REGISTRY ?? fileEnv["NEXT_PUBLIC_REGISTRY_ADDRESS"]!,
  router: process.env.ROUTER ?? fileEnv["NEXT_PUBLIC_ROUTER_ADDRESS"]!,
  cUSDT: process.env.CUSDT ?? fileEnv["CUSDT_SEPOLIA"]!,
  chainId: 11155111,
};

if (!config.registry || !config.router) {
  throw new Error("registry/router addresses missing — run pnpm deploy:sepolia first");
}
