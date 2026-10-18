import assert from "node:assert/strict";
import { test } from "node:test";
import { handleHttp, LATEST } from "../src/mcp.mjs";
import { breath, finish, reflect, start, toSsml } from "../src/script.mjs";

const post = async (msg, headers = {}) =>
  handleHttp({ method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...headers }, body: JSON.stringify(msg) }, {});
const rpc = async (id, method, params) => JSON.parse((await post({ jsonrpc: "2.0", id, method, params })).body);

test("initialize negotiates the latest protocol", async () => {
  const r = (await rpc(1, "initialize", { protocolVersion: LATEST, capabilities: {}, clientInfo: { name: "t", version: "1" } }));
  assert.equal(r.result.protocolVersion, "2025-11-25");
  assert.ok(r.result.capabilities.tools);
  assert.match(r.result.instructions, /not grateful/);
});

test("unknown protocol version from client falls back to latest", async () => {
  assert.equal((await rpc(1, "initialize", { protocolVersion: "1999-01-01" })).result.protocolVersion, LATEST);
});

test("notifications get 202 with no body", async () => {
  const r = await post({ jsonrpc: "2.0", method: "notifications/initialized" });
  assert.equal(r.status, 202);
  assert.equal(r.body, "");
});

test("tools/list exposes the three tools", async () => {
  const names = (await rpc(2, "tools/list")).result.tools.map((t) => t.name);
  assert.deepEqual(names, ["start_something_good", "finish_something_good", "check_perfect_result", "turn_around_perfect_result", "suggest_spelling", "guided_breath"]);
});

test("start returns ssml with real breaks and the question", async () => {
  const r = (await rpc(3, "tools/call", { name: "start_something_good", arguments: {} })).result;
  assert.equal(r.isError, false);
  assert.match(r.structuredContent.ssml, /^<speak>/);
  assert.match(r.structuredContent.ssml, /<break time="4000ms"\/>/);
  assert.match(r.structuredContent.ssml, /rate="x-slow">just let it go\./);
  assert.match(r.content[0].text, /not grateful for/);
  assert.doesNotMatch(r.content[0].text, /together/i);
});

test("start asks the question for what they chose", async () => {
  const r = (await rpc(8, "tools/call", { name: "start_something_good", arguments: { focus: "missing" } })).result;
  assert.match(r.content[0].text, /Consider what is missing in your life, that you are not grateful for\./);
  assert.match(r.content[0].text, /change what is missing\. Turn it around\./);
  assert.match(r.content[0].text, /Turn it around\. What would you like it to be\?\nYour perfect result:$/);
  assert.equal(r.structuredContent.steps.filter((x) => x.group === "ask").length, 4);
  const open = (await rpc(9, "tools/call", { name: "start_something_good", arguments: { focus: "nonsense" } })).result;
  assert.match(open.content[0].text, /Consider what it is that you are not grateful for/);
  assert.doesNotMatch(open.content[0].text, /no rush/);
});

test("finish is one card: thank you, their perfect result in their words, something good", async () => {
  const r = (await rpc(4, "tools/call", {
    name: "finish_something_good",
    arguments: { named: "i am happy and grateful i'm living in my own home\nI have the money to travel" },
  })).result;
  assert.equal(r.structuredContent.steps.length, 1);
  assert.match(r.structuredContent.ssml, /Thank you\.<\/prosody><break time="2500ms"\/><prosody rate="slow">Something good is about to happen\.<\/prosody>/);
  assert.doesNotMatch(r.structuredContent.ssml, /living in my own home/);
  assert.equal(
    r.content[0].text,
    "Thank you. I am happy and grateful I'm living in my own home. I have the money to travel. Something good is about to happen.",
  );
});

test("gentle end closes without their words", async () => {
  const r = (await rpc(30, "tools/call", { name: "finish_something_good", arguments: { gentleEnd: true } })).result;
  assert.equal(r.isError, false);
  assert.equal(r.content[0].text, "Thank you. Something good is about to happen.");
});

test("finish without words asks gently instead", async () => {
  const r = (await rpc(5, "tools/call", { name: "finish_something_good", arguments: { named: "  " } })).result;
  assert.equal(r.isError, true);
});

test("unknown method and bad JSON are JSON-RPC errors", async () => {
  assert.equal((await rpc(6, "nope")).error.code, -32601);
  assert.equal((await handleHttp({ method: "POST", headers: {}, body: "{" }, {})).status, 400);
});

test("GET is 405, unsupported version header is 400, foreign origin is 403", async () => {
  assert.equal((await handleHttp({ method: "GET", headers: {} }, {})).status, 405);
  assert.equal((await post({ jsonrpc: "2.0", id: 1, method: "ping" }, { "mcp-protocol-version": "2000-01-01" })).status, 400);
  assert.equal((await post({ jsonrpc: "2.0", id: 1, method: "ping" }, { origin: "https://evil.example" })).status, 403);
  const ok = await post({ jsonrpc: "2.0", id: 1, method: "ping" }, { origin: "https://gooddaynight.com" });
  assert.equal(ok.status, 200);
  assert.equal(ok.headers["Access-Control-Allow-Origin"], "https://gooddaynight.com");
});

test("skill is served as a resource", async () => {
  const r = (await rpc(7, "resources/read", { uri: "skill://something-good/SKILL.md" }));
  assert.match(r.result.contents[0].text, /name: something-good/);
});

test("script details", async () => {
  assert.equal(reflect("losing my job"), "losing your job");
  assert.equal(reflect("I'm lonely and my mum is ill"), "you're lonely and your mum is ill");
  assert.equal(reflect("Nobody calls me"), "nobody calls you");
  assert.equal(reflect(""), "what you named");
  assert.equal(breath(2).filter((s) => s.phase === "in").length, 2);
  assert.match(toSsml([{ text: "a & b", rate: "slow", pauseMs: 25000 }]), /a &amp; b.*10000ms.*10000ms.*5000ms/);
  assert.ok(start().steps.length > 5);
  assert.equal(finish("x").steps.length, 1);
  assert.doesNotMatch(start().text, /Let's start with one slow/);
  assert.doesNotMatch(finish("x").text, /cup of tea|Breathe in/);
});

test("check tool and finish refuse blocked text", async () => {
  const chk = (await rpc(20, "tools/call", { name: "check_perfect_result", arguments: { text: "asdfgh" } })).result;
  assert.equal(chk.structuredContent.status, "block");
  const fin = (await rpc(21, "tools/call", { name: "finish_something_good", arguments: { named: "I want to die" } })).result;
  assert.equal(fin.isError, true);
  assert.match(fin.content[0].text, /findahelpline\.com/);
});
