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
  const r = c("I just want to die", "ZA");
  assert.equal(r.status, "crisis");
  assert.equal(r.ok, false);
  assert.match(r.message, /0800 567 567/);
});

test("crisis support follows the country, with a global fallback", () => {
  assert.match(c("I want to die", "ZA").message, /SADAG.*0800 567 567/);
  assert.match(c("I want to die", "us").message, /988/);
  assert.match(c("I want to die", "GB").message, /Samaritans on 116 123/);
  assert.match(c("I want to die", "AU").message, /13 11 14/);
  assert.match(c("I want to die", "NZ").message, /1737/);
  const anywhere = c("I want to die", "BR");
  assert.match(anywhere.message, /findahelpline\.com/);
  assert.equal(anywhere.support.url, "https://findahelpline.com");
});
