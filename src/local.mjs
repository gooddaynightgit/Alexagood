// Run locally: node src/local.mjs  ->  http://localhost:8787/mcp
import { createServer } from "node:http";
import { handleHttp } from "./server.mjs";

const port = Number(process.env.PORT ?? 8787);

createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    if (!req.url?.startsWith("/mcp")) {
      res.writeHead(404).end();
      return;
    }
    const out = handleHttp({ method: req.method, headers: req.headers, body });
    res.writeHead(out.status, out.headers).end(out.body);
  });
}).listen(port, () => console.log(`Something Good MCP server on http://localhost:${port}/mcp`));
