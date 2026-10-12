// A minimal, dependency-free MCP server over Streamable HTTP (spec 2025-11-25).
// Stateless: every POST carries one JSON-RPC message and gets one JSON response.
// The transport is a pure function, so the same code runs on AWS Lambda, Node's http module or tests.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkPerfectResult, MAX_CHARS } from "./check.mjs";
import { FOCUS, NAME, TAGLINE, breathOnly, finish, start } from "./script.mjs";

export const LATEST = "2025-11-25";
export const SUPPORTED = [LATEST, "2025-06-18", "2025-03-26"];
const SERVER_INFO = { name: "something-good", title: NAME, version: "1.0.0" };

const here = dirname(fileURLToPath(import.meta.url));
const SKILL_URI = "skill://something-good/SKILL.md";
let skillText;
function skill() {
  if (skillText === undefined) {
    try {
      skillText = readFileSync(join(here, "..", "skills", "something-good", "SKILL.md"), "utf8");
    } catch {
      skillText = "";
    }
  }
  return skillText;
}

const INSTRUCTIONS = [
  `${NAME} guides someone through naming what they're not grateful for, then giving thanks as if something good is already on its way.`,
  "Call start_something_good first and speak its ssml exactly, then listen. When they answer, call finish_something_good with their words and speak that ssml exactly.",
  "Never rush, never skip the breaks, never claim their problem is solved, never breathe 'together' with them.",
  `The full guide is the resource ${SKILL_URI}.`,
].join(" ");

const sessionSchema = {
  type: "object",
  properties: {
    ssml: { type: "string", description: "Speak this exactly. It holds the timed pauses and slow pace." },
    text: { type: "string", description: "The same words as plain text." },
    steps: {
      type: "array",
      description: "Each line with its speaking rate and the silence after it, for custom voice front ends.",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          rate: { type: "string", enum: ["medium", "slow", "x-slow"] },
          pauseMs: { type: "number" },
          phase: { type: "string", enum: ["in", "hold", "out"] },
          group: { type: "string", enum: ["ask"], description: "Lines shown together with the answer box." },
          speak: {
            type: "array",
            items: { type: "string" },
            description: "When present, say only these parts aloud (the card still shows `text`).",
          },
          speakPauseMs: { type: "number", description: "Silence between the `speak` parts." },
        },
        required: ["text", "rate", "pauseMs"],
      },
    },
  },
  required: ["ssml", "text", "steps"],
};

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

export const TOOLS = [
  {
    name: "start_something_good",
    title: "Start Something Good",
    description:
      "Begin a Something Good session: a short welcome, one slow guided breath, then the question that invites the person to name a challenge, a situation, something missing, or something they want to change. Speak the returned ssml, then listen for their answer.",
    inputSchema: {
      type: "object",
      properties: {
        focus: {
          type: "string",
          enum: FOCUS,
          description:
            "Optional. What they want to name: a challenge, a situation, something missing, something they want to change, or something else. Shapes the question. Leave out if unknown.",
        },
      },
      additionalProperties: false,
    },
    outputSchema: sessionSchema,
    annotations: READ_ONLY,
  },
  {
    name: "finish_something_good",
    title: "Finish Something Good",
    description:
      "After the person has said their perfect result, pass their words here. Returns one closing card showing 'Thank you.', their perfect result in their own first-person words, and 'Something good is about to happen.' Aloud, only 'Thank you.' … 'Something good is about to happen.' is said. Speak the returned ssml.",
    inputSchema: {
      type: "object",
      properties: {
        named: {
          type: "string",
          description: "Their perfect result in their own first-person words, e.g. 'I am living in my own home. I have the money to travel.' Do not reword it.",
          maxLength: 500,
        },
        country: { type: "string", description: "Optional ISO country code for local crisis support." },
      },
      required: ["named"],
      additionalProperties: false,
    },
    outputSchema: sessionSchema,
    annotations: READ_ONLY,
  },
  {
    name: "check_perfect_result",
    title: "Check their perfect result",
    description:
      "Check what the person said or typed as their perfect result before finishing. status: ok (carry on), nudge (allowed, but gently suggest saying what they do want), block (ask them gently to change it; message says how), crisis (stop the ritual and share the message, which offers real support). finish_something_good refuses block and crisis.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", maxLength: 2000 },
        country: {
          type: "string",
          description: "Optional ISO country code (e.g. ZA, US, GB) so crisis support shows the right local helpline.",
        },
      },
      required: ["text"],
      additionalProperties: false,
    },
    outputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["ok", "nudge", "block", "crisis"] },
        ok: { type: "boolean", description: "True when they may finish (ok or nudge)." },
        message: { type: "string", description: "What to show or say. Empty when ok." },
        maxChars: { type: "number" },
        support: {
          type: "object",
          description: "Only for crisis: the helpline to show (name, phone, note, emergency, url).",
        },
      },
      required: ["status", "ok", "message", "maxChars"],
    },
    annotations: READ_ONLY,
  },
  {
    name: "guided_breath",
    title: "Guided breath",
    description: "One to three slow guided breaths on their own: in for 4 seconds, hold for 2, a long slow release.",
    inputSchema: {
      type: "object",
      properties: { breaths: { type: "integer", minimum: 1, maximum: 3, default: 1 } },
      additionalProperties: false,
    },
    outputSchema: sessionSchema,
    annotations: READ_ONLY,
  },
];

// ---- JSON-RPC ---------------------------------------------------------------

class RpcError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const ok = (id, result) => ({ jsonrpc: "2.0", id, result });
const fail = (id, code, message) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

function toolResult(session) {
  return { content: [{ type: "text", text: session.text }], structuredContent: session, isError: false };
}

function callTool(params) {
  const name = params?.name;
  const args = params?.arguments ?? {};
  if (typeof name !== "string") throw new RpcError(-32602, "Missing tool name");
  switch (name) {
    case "start_something_good":
      return toolResult(start(FOCUS.includes(args.focus) ? args.focus : undefined));
    case "finish_something_good": {
      if (typeof args.named !== "string" || !args.named.trim()) {
        return {
          content: [{ type: "text", text: "Ask them gently what they'd like to name, then call again with their words." }],
          isError: true,
        };
      }
      const check = checkPerfectResult(args.named, args.country);
      if (!check.ok) return { content: [{ type: "text", text: check.message }], structuredContent: check, isError: true };
      return toolResult(finish(args.named));
    }
    case "check_perfect_result": {
      const result = { ...checkPerfectResult(args.text, args.country), maxChars: MAX_CHARS };
      return { content: [{ type: "text", text: result.message || "Looks good." }], structuredContent: result, isError: false };
    }
    case "guided_breath":
      return toolResult(breathOnly(args.breaths ?? 1));
    default:
      throw new RpcError(-32602, `Unknown tool: ${name}`);
  }
}

export function handleRpc(msg) {
  const { id, method, params } = msg;
  switch (method) {
    case "initialize": {
      const asked = params?.protocolVersion;
      return ok(id, {
        protocolVersion: SUPPORTED.includes(asked) ? asked : LATEST,
        capabilities: { tools: { listChanged: false }, resources: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    }
    case "ping":
      return ok(id, {});
    case "tools/list":
      return ok(id, { tools: TOOLS });
    case "tools/call":
      return ok(id, callTool(params));
    case "resources/list":
      return ok(id, {
        resources: [
          {
            uri: SKILL_URI,
            name: "SKILL.md",
            title: `${NAME} Agent Skill`,
            description: "How a voice agent should run Something Good: pace, pauses, wording and what never to say.",
            mimeType: "text/markdown",
          },
        ],
      });
    case "resources/read": {
      if (params?.uri !== SKILL_URI) throw new RpcError(-32002, "Resource not found");
      return ok(id, { contents: [{ uri: SKILL_URI, mimeType: "text/markdown", text: skill() }] });
    }
    default:
      throw new RpcError(-32601, `Method not found: ${method}`);
  }
}

// ---- Streamable HTTP --------------------------------------------------------

const DEFAULT_ORIGINS = ["https://gooddaynight.com", "https://www.gooddaynight.com"];

function allowedOrigin(origin, env = process.env) {
  if (!origin) return true; // non-browser clients (agents, Alexa, curl) send no Origin
  const list = (env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const allowed = list.length ? list : DEFAULT_ORIGINS;
  if (allowed.includes(origin)) return true;
  // This server's own pages, and GoodDayNight preview deployments on Vercel
  return /^https:\/\/(alexagood[a-z0-9-]*|[a-z0-9-]+-gooddaynightgit)\.vercel\.app$/.test(origin);
}

const lower = (headers = {}) => Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));

function cors(origin) {
  if (!origin) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Protocol-Version, Mcp-Session-Id",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

const json = (status, payload, extra = {}) => ({
  status,
  headers: { "Content-Type": "application/json", ...extra },
  body: JSON.stringify(payload),
});

/** Handle one HTTP request. `request` is { method, headers, body } where body is a string. */
export function handleHttp(request, env = process.env) {
  const method = (request.method ?? "GET").toUpperCase();
  const h = lower(request.headers);
  const origin = h.origin;

  if (!allowedOrigin(origin, env)) return json(403, fail(null, -32000, "Origin not allowed"));
  const c = cors(origin);

  if (method === "OPTIONS") return { status: 204, headers: c, body: "" };
  if (method !== "POST") {
    // No server-initiated stream and no sessions to delete.
    return { status: 405, headers: { Allow: "POST, OPTIONS", ...c }, body: "" };
  }

  const version = h["mcp-protocol-version"];
  if (version && !SUPPORTED.includes(version)) {
    return json(400, fail(null, -32600, `Unsupported MCP-Protocol-Version: ${version}`), c);
  }

  let msg;
  try {
    msg = JSON.parse(request.body ?? "");
  } catch {
    return json(400, fail(null, -32700, "Parse error"), c);
  }
  if (Array.isArray(msg) || !msg || typeof msg !== "object" || msg.jsonrpc !== "2.0") {
    return json(400, fail(msg?.id, -32600, "Invalid request: send one JSON-RPC 2.0 message"), c);
  }

  // Notifications and responses: accepted, nothing to say back.
  if (!("method" in msg) || msg.id === undefined) return { status: 202, headers: c, body: "" };

  try {
    return json(200, handleRpc(msg), c);
  } catch (err) {
    const code = err instanceof RpcError ? err.code : -32603;
    const message = err instanceof RpcError ? err.message : "Internal error";
    return json(200, fail(msg.id, code, message), c);
  }
}

export { TAGLINE };
