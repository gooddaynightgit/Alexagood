import assert from "node:assert/strict";
import { test } from "node:test";
import { CONFIRM_LEADS, parseReply, turnAround } from "../src/turnaround.mjs";

const nova = (reply) => async () => JSON.stringify(reply);
const first = () => 0;

test("negative wording is turned positive and confirmed with understand/clarify", async () => {
  const r = await turnAround("I am debt free", "ZA", { ask: nova({ status: "ok", result: "I am fully paid up." }), pick: first });
  assert.equal(r.status, "confirm");
  assert.equal(r.result, "I am fully paid up.");
  assert.equal(r.changed, true);
  assert.equal(r.confirm, "Just making sure I understand: you are fully paid up. Is that right?");
  assert.match(r.ssml, /^<speak>/);
});

test("confirm lines vary and never say heard", async () => {
  for (const lead of CONFIRM_LEADS) assert.match(lead, /understand|clarify/i);
  assert.ok(CONFIRM_LEADS.every((l) => !/heard/i.test(l)));
  const r = await turnAround("I have my own home", "ZA", { ask: nova({ status: "ok", result: "I have my own home." }), pick: () => 0.99 });
  assert.equal(r.changed, false);
  assert.match(r.confirm, /you have your own home\. Is that right\?$/);
});

test("fragments the model can't understand are blocked", async () => {
  const r = await turnAround("I am happy that I have", "ZA", { ask: nova({ status: "unclear" }) });
  assert.equal(r.status, "block");
  assert.match(r.message, /full sentence/);
});

test("all the rules still run before the rewrite", async () => {
  const never = async () => assert.fail("should not reach Bedrock");
  for (const t of ["Move to my", "", "asdfgh jkl", "visit www.example.com now", "I want my shit sorted"]) {
    assert.equal((await turnAround(t, "ZA", { ask: never })).status, "block", t);
  }
  const c = await turnAround("I want to die", "ZA", { ask: never });
  assert.equal(c.status, "crisis");
  assert.match(c.message, /0800 567 567/);
});

test("all the rules run again on the rewrite", async () => {
  const bad = await turnAround("I have a lot of money", "ZA", { ask: nova({ status: "ok", result: "I never worry about money." }) });
  assert.equal(bad.status, "confirm");
  assert.equal(bad.result, "I have a lot of money.", "falls back to their own positive words");
  const neg = await turnAround("I don't want to be broke", "ZA", { ask: nova({ status: "ok", result: "I am not broke." }) });
  assert.equal(neg.status, "block");
  assert.match(neg.message, /what you do want/);
});

test("the model can flag a crisis", async () => {
  const r = await turnAround("I don't want to be here", "US", { ask: nova({ status: "crisis" }) });
  assert.equal(r.status, "crisis");
  assert.match(r.message, /988/);
});

test("if Bedrock is down, positive words pass and negative words are blocked", async () => {
  const down = async () => {
    throw new Error("timeout");
  };
  assert.equal((await turnAround("I live in my own home", "ZA", { ask: down })).status, "confirm");
  assert.equal((await turnAround("I don't want to be broke anymore", "ZA", { ask: down })).status, "block");
});

test("a rewrite that keeps a negative word gets one more try", async () => {
  const replies = ["I am glad my debts are paid.", "I am fully paid up and it feels awesome."];
  const ask = async () => JSON.stringify({ status: "ok", result: replies.shift() });
  const r = await turnAround("How awesome it will be when my debts are paid", "ZA", { ask, pick: first });
  assert.equal(r.status, "confirm");
  assert.equal(r.result, "I am fully paid up and it feels awesome.");
});

test("confirm reads naturally", async () => {
  const r = await turnAround("my son stops being angry", "ZA", { ask: nova({ status: "ok", result: "My son and I share a calm, happy bond." }), pick: () => 0.4 });
  assert.match(r.confirm, /: you and your son share a calm, happy bond\. Is that right\?$/);
});

test("replies are parsed safely", () => {
  assert.deepEqual(parseReply('```json\n{"status":"ok","result":"I am calm."}\n```'), { status: "ok", result: "I am calm." });
  assert.equal(parseReply("sorry"), null);
  assert.equal(parseReply('{"status":"ok","result":""}'), null);
});
