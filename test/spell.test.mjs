import assert from "node:assert/strict";
import { test } from "node:test";
import { suggestSpelling as s } from "../src/spell.mjs";

test("fixes common typos and leaves good text alone", () => {
  assert.equal(s("i am happy and greatful i have my own hous").corrected, "I am happy and grateful I have my own house");
  assert.equal(s("Im living in my own home").corrected, "I'm living in my own home");
  assert.equal(s("I have the mony to travell").corrected, "I have the money to travel");
  const good = s("I am happy & grateful I have a garden");
  assert.equal(good.changed, false);
  assert.deepEqual(good.fixes, []);
});

test("leaves names alone", () => {
  assert.equal(s("I am travelling to Cape Town with Thandeka").changed, false);
});

test("reports each change", () => {
  const r = s("my own hous");
  assert.deepEqual(r.fixes, [{ from: "hous", to: "house" }]);
});
