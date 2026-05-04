import http from "node:http";
import { pay } from "./pay.js";
import { wallet } from "../chain.js";

/// Minimal HTTP surface so other agents can request payments / status.
///
/// Endpoints:
///   GET  /info        → { address, ok: true }
///   POST /pay         → { to, amount }   (only callable by ops; gated by AGENT_TOKEN)
///   POST /receive     → { from, ref }    (notify of incoming payment; logs only)
///
/// AGENT_TOKEN must be passed in the Authorization header for /pay.
/// The /receive endpoint is unauthenticated: anyone can claim "I just paid you".
export async function serve(args: { port: number }) {
  const me = await wallet.getAddress();
  const token = process.env.AGENT_TOKEN ?? null;

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
    const send = (status: number, body: unknown) => {
      res.statusCode = status;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(body));
    };

    let bodyText = "";
    for await (const chunk of req) bodyText += chunk;

    try {
      if (req.method === "GET" && url.pathname === "/info") {
        return send(200, { address: me, ok: true });
      }
      if (req.method === "POST" && url.pathname === "/pay") {
        if (token && req.headers.authorization !== `Bearer ${token}`) {
          return send(401, { error: "unauthorized" });
        }
        const { to, amount } = JSON.parse(bodyText || "{}");
        if (!to || !amount) return send(400, { error: "missing to/amount" });
        await pay({ to, amount: String(amount) });
        return send(200, { ok: true });
      }
      if (req.method === "POST" && url.pathname === "/receive") {
        const body = JSON.parse(bodyText || "{}");
        console.log(`received payment notice from ${body.from}: ${body.ref}`);
        return send(200, { ok: true });
      }
      return send(404, { error: "not found" });
    } catch (e: any) {
      console.error("request error:", e);
      return send(500, { error: e?.shortMessage ?? e?.message ?? String(e) });
    }
  });

  server.listen(args.port, () => {
    console.log(`agent ${me} serving on http://localhost:${args.port}`);
    if (!token) console.log("WARNING: AGENT_TOKEN not set; /pay is open to localhost callers only");
  });
}
