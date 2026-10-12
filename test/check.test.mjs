import assert from "node:assert/strict";
import { test } from "node:test";
import { checkPerfectResult as c } from "../src/check.mjs";

test("good perfect results pass", () => {
  for (const t of ["I have my own home", "I am living in my own home.\nI have the money to travel", "I am free of debt and happy"]) {
    assert.equal(c(t).status, "ok", t);
  }
});

test("too short, empty and too long are blocked", () => {
  assert.equal(c("").status, "block");
  assert.equal(c("Home").status, "block");
  assert.equal(c("I have my own home ".repeat(20)).status, "block");
});

test("junk is blocked", () => {
  for (const t of ["asdfgh jkl qwerty", "aaaaaaa bbbbb ccccc", "1234 5678 !!!!", "xkcdzp rtvwq bcdfg"]) {
    assert.equal(c(t).status, "block", t);
  }
});

test("swearing, links and personal details are blocked", () => {
  for (const t of ["I want my shit sorted out", "visit www.example.com now please", "call me on 082 555 1234 please", "email me at a@b.co please"]) {
    assert.equal(c(t).status, "block", t);
  }
  assert.match(c("I want my shit sorted out").message, /^Gently nudging you to correct the text\./);
});

test("negative wording is nudged but allowed", () => {
  const r = c("I don't want to be broke anymore");
  assert.equal(r.status, "nudge");
  assert.equal(r.ok, true);
  assert.match(r.message, /^Gently nudging you to correct the text\. Try saying what you do want/);
});

test("crisis words stop the ritual with support", () => {
  const r = c("I just want to die");
  assert.equal(r.status, "crisis");
  assert.equal(r.ok, false);
  assert.match(r.message, /0800 567 567/);
});
