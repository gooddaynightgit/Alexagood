// A small, dependency-free spell checker for "Your perfect result".
// It only suggests; the person decides whether to accept.
//
// Word frequencies: data/en-words.txt, from Hermit Dave's FrequencyWords (OpenSubtitles 2018, English),
// https://github.com/hermitdave/FrequencyWords, licensed CC BY-SA 4.0.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
let FREQ;

function freq() {
  if (!FREQ) {
    FREQ = new Map();
    try {
      const raw = readFileSync(join(here, "..", "data", "en-words.txt"), "utf8");
      for (const line of raw.split("\n")) {
        const i = line.indexOf(" ");
        if (i > 0) FREQ.set(line.slice(0, i), Number(line.slice(i + 1)));
      }
    } catch {
      /* no dictionary: suggest nothing */
    }
  }
  return FREQ;
}

/** Contractions typed without the apostrophe, and the lone "i". */
const FIXED = {
  i: "I",
  im: "I'm",
  ive: "I've",
  ill: null, // "ill" is a real word; leave it
  dont: "don't",
  cant: "can't",
  wont: "won't",
  didnt: "didn't",
  doesnt: "doesn't",
  isnt: "isn't",
  wasnt: "wasn't",
  arent: "aren't",
  couldnt: "couldn't",
  wouldnt: "wouldn't",
  shouldnt: "shouldn't",
  thats: "that's",
  whats: "what's",
  youre: "you're",
  theyre: "they're",
  theres: "there's",
};

const LETTERS = "abcdefghijklmnopqrstuvwxyz";

function edits1(word) {
  const out = new Set();
  for (let i = 0; i <= word.length; i += 1) {
    const a = word.slice(0, i);
    const b = word.slice(i);
    if (b) out.add(a + b.slice(1)); // delete
    if (b.length > 1) out.add(a + b[1] + b[0] + b.slice(2)); // transpose
    for (const c of LETTERS) {
      if (b) out.add(a + c + b.slice(1)); // replace
      out.add(a + c + b); // insert
    }
  }
  return out;
}

function best(cands, dict) {
  let pick = null;
  let pickF = 0;
  for (const c of cands) {
    const f = dict.get(c) ?? 0;
    if (f > pickF) {
      pick = c;
      pickF = f;
    }
  }
  return pick ? { word: pick, f: pickF } : null;
}

/** Best correction for one lowercase word, or null to leave it. */
export function correctWord(lower) {
  const dict = freq();
  if (!dict.size) return null;
  if (Object.hasOwn(FIXED, lower)) return FIXED[lower];
  if (lower.length < 3 || /[^a-z']/.test(lower)) return null;

  const known = dict.get(lower) ?? 0;
  const one = best(edits1(lower), dict);

  if (known) {
    // A real but rare word right next to a very common one is usually a slip: "withy" -> "with".
    if (known < 200 && one && one.f >= known * 1000 && one.f > 50000) return one.word;
    return null;
  }
  if (one) return one.word;
  if (lower.length < 5) return null;
  let two = null;
  for (const e of edits1(lower)) {
    const b = best(edits1(e), dict);
    if (b && (!two || b.f > two.f)) two = b;
  }
  return two ? two.word : null;
}

function matchCase(original, fixed) {
  if (fixed === "I" || fixed.startsWith("I'")) return fixed;
  if (original === original.toUpperCase() && original.length > 1) return fixed.toUpperCase();
  if (original[0] === original[0].toUpperCase()) return fixed[0].toUpperCase() + fixed.slice(1);
  return fixed;
}

/**
 * Suggest spelling fixes. Names (capitalised mid-sentence) and anything with digits are left alone.
 * Returns the corrected text and each change, so the person can see what would change.
 */
export function suggestSpelling(raw) {
  const text = String(raw ?? "").slice(0, 2000);
  const fixes = [];
  let sentenceStart = true;
  const corrected = text.replace(/([A-Za-z']+)|([.!?\n]+)/g, (token, word, stop) => {
    if (stop) {
      sentenceStart = true;
      return token;
    }
    const atStart = sentenceStart;
    sentenceStart = false;
    const lower = word.toLowerCase();
    const looksLikeName = !atStart && /^[A-Z][a-z]/.test(word) && lower !== "i";
    if (looksLikeName) return word;
    const fix = correctWord(lower.replace(/^'+|'+$/g, ""));
    if (!fix || fix.toLowerCase() === lower) {
      if (word === "i") {
        fixes.push({ from: word, to: "I" });
        return "I";
      }
      return word;
    }
    const to = matchCase(word, fix);
    fixes.push({ from: word, to });
    return to;
  });
  return { corrected, changed: corrected !== text, fixes };
}
