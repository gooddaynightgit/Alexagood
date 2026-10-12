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

test("squeezes stretched letters", () => {
  assert.equal(s("Haaaarmony to live").corrected, "Harmony to live");
  assert.equal(s("I am sooooo happy").corrected, "I am so happy");
});

test("likely phone slips win, ordinary sentences stay as they are", () => {
  assert.equal(s("I hav a beautifull hom").corrected, "I have a beautiful home");
  for (const t of ["I have paid off my bond", "My mum is well and we laugh together", "I am calm, confident and at ease"]) {
    assert.equal(s(t).changed, false, t);
  }
});
