// Vercel entry point. The MCP endpoint is /mcp (rewritten here) or /api/mcp.
import { handleHttp } from "../src/mcp.mjs";

async function rawBody(req) {
  if (typeof req.body === "string") return req.body;
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return JSON.stringify(req.body);
  if (Buffer.isBuffer(req.body)) return req.body.toString("utf8");
  let data = "";
  for await (const chunk of req) data += chunk;
  return data;
}

export default async function handler(req, res) {
  const body = req.method === "POST" ? await rawBody(req) : "";
  const out = await handleHttp({ method: req.method, headers: req.headers, body });
  for (const [k, v] of Object.entries(out.headers)) res.setHeader(k, v);
  res.status(out.status).send(out.body);
}
