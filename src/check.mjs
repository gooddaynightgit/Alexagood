// Rules for "Your perfect result". Shared by Alexa and the web page through the MCP server.
//
// status:
//   ok     - fine, carry on
//   nudge  - allowed, with a gentle suggestion (negative wording)
//   block  - must be changed before finishing (empty, too short/long, junk, swearing, personal details)
//   crisis - stop the ritual and offer real support

export const MIN_WORDS = 3;
export const MAX_CHARS = 300;
export const NUDGE = "Gently nudging you to correct the text.";

/**
 * Crisis lines by country (ISO 3166 alpha-2), each checked against the service's own site in Oct 2026.
 * Anywhere else: local emergency number plus findahelpline.com (ThroughLine's free global directory).
 */
export const SUPPORT = {
  ZA: { name: "SADAG Suicide Crisis Helpline", phone: "0800 567 567", note: "free, 24 hours a day", emergency: "10111 (or 112 from a cell phone)" },
  US: { name: "988 Suicide & Crisis Lifeline", phone: "988", note: "call or text, free, 24/7", emergency: "911" },
  CA: { name: "988 Suicide Crisis Helpline", phone: "988", note: "call or text, free, 24/7", emergency: "911" },
  GB: { name: "Samaritans", phone: "116 123", note: "free, 24/7", emergency: "999" },
  IE: { name: "Samaritans", phone: "116 123", note: "free, 24/7", emergency: "112 or 999" },
  AU: { name: "Lifeline", phone: "13 11 14", note: "24/7", emergency: "000" },
  NZ: { name: "1737, Need to talk?", phone: "1737", note: "call or text, free, 24/7", emergency: "111" },
};
export const HELPLINE_DIRECTORY = "https://findahelpline.com";

const CRISIS_OPENING = "It sounds like you're carrying something very heavy right now, and you deserve real support.";

export function crisisSupport(country) {
  const line = SUPPORT[String(country ?? "").toUpperCase()];
  if (line) {
    return {
      ...line,
      url: HELPLINE_DIRECTORY,
      message:
        `${CRISIS_OPENING} Please reach out now to ${line.name} on ${line.phone} (${line.note}). ` +
        `If you're in danger right now, call ${line.emergency}. You can come back to this later.`,
    };
  }
  return {
    name: "Find A Helpline",
    phone: "",
    note: "free helplines in your country",
    emergency: "your local emergency number",
    url: HELPLINE_DIRECTORY,
    message:
      `${CRISIS_OPENING} Please call your local emergency number if you're in danger right now, ` +
      `or find a free helpline in your country at findahelpline.com. You can come back to this later.`,
  };
}

/** Kept for callers that don't know the country. */
export const CRISIS_MESSAGE = crisisSupport("ZA").message;

const CRISIS = [
  /\bsuicid/i,
  /\bkill(ing)?\s+(myself|me)\b/i,
  /\b(hurt|harm|cut)(ing)?\s+myself\b/i,
  /\bself[\s-]?harm/i,
  /\bwant(ed)?\s+to\s+die\b/i,
  /\b(end|ending)\s+(it\s+all|my\s+life)\b/i,
  /\bno\s+reason\s+to\s+live\b/i,
  /\b(don'?t|do\s+not)\s+want\s+to\s+(live|be\s+alive|be\s+here|wake\s+up)\b/i,
  /\bbetter\s+off\s+dead\b/i,
];

// Swearing and abuse (English and common South African words), matched as whole words.
const PROFANITY = [
  /\bf+u+c+k\w*/i,
  /\bmotherf\w*/i,
  /\bsh[i1]t\w*/i,
  /\bbullsh[i1]t\b/i,
  /\bb[i1]tch\w*/i,
  /\bbastard\w*/i,
  /\ba(ss|rse)hole\w*/i,
  /\bcunt\w*/i,
  /\bdick(head)?s?\b/i,
  /\bpiss(ed)?\b/i,
  /\bslut\w*/i,
  /\bwhore\w*/i,
  /\bwank\w*/i,
  /\btwat\w*/i,
  /\bprick\b/i,
  /\bkak\b/i,
  /\bpoes\b/i,
  /\bdoos\b/i,
  /\bmoer\b/i,
  /\bnigg\w*/i,
  /\bkaffir\w*/i,
  /\bretard\w*/i,
];

// Words that usually mean "what I don't want". Only nudges; never blocks.
const NEGATIVE = [
  /\b(don'?t|do\s+not|can'?t|cannot|won'?t|wouldn'?t|never|no\s+longer|not)\b/i,
  /\b(hate|stop|quit|lose|losing|lost)\b/i,
  /\b(broke|debt|debts|sick|ill|lonely|alone|fail\w*|poor|pain|scared|afraid|worried|worry|anxious|sad|depressed|angry|stress\w*)\b/i,
];
// ...unless it's said as freedom from it: "free of debt", "debt-free", "no more pain".
const POSITIVE_FRAME = /\b(free\s+(of|from)|debt[\s-]free|no\s+more|out\s+of|healed\s+from|recovered\s+from)\b/i;

const KEYBOARD_RUNS = /(qwert|asdf|zxcv|hjkl|uiop|wasd|jkl;|yuio)/i;

// A sentence can't stop on these: "Move to my", "I have the", "Peace and".
const DANGLING_END = new Set([
  "a", "an", "the", "my", "your", "our", "their", "its", "his",
  "to", "of", "for", "with", "from", "into", "at", "than", "towards",
  "and", "or", "but", "because", "if", "that", "so", "very", "really", "more", "most",
]);

// Little words that carry no meaning on their own. A perfect result needs at least one word that isn't one.
const FILLER = new Set([
  ...DANGLING_END,
  "i", "i'm", "im", "me", "we", "you", "it", "is", "am", "are", "was", "be", "been",
  "this", "these", "those", "there", "here", "in", "on", "up", "out", "by", "all", "just", "now",
  "yes", "no", "ok", "okay", "um", "uh", "hmm", "the", "do", "did", "can", "will", "would",
]);

const bare = (w) => w.toLowerCase().replace(/[^\p{L}']/gu, "");

/** Does it read as a whole thought, not a fragment like "Move to my"? Checked per line or sentence. */
function makesSense(text) {
  const parts = text.split(/[\n.!?;]+/).map((p) => p.trim()).filter((p) => /\p{L}/u.test(p));
  for (const part of parts) {
    const ws = part.split(/[\s,]+/).map(bare).filter(Boolean);
    if (DANGLING_END.has(ws[ws.length - 1])) return false;
  }
  const all = text.split(/\s+/).map(bare).filter(Boolean);
  if (!all.some((w) => w.length > 1 && !FILLER.has(w))) return false;
  if (new Set(all).size < Math.min(3, all.length)) return false;
  return true;
}

function issue(status, hint, country) {
  if (status === "crisis") {
    const support = crisisSupport(country);
    return { status, ok: false, message: support.message, support };
  }
  return { status, ok: status !== "block", message: `${NUDGE} ${hint}` };
}

export function checkPerfectResult(raw, country) {
  const text = String(raw ?? "").trim();

  if (!text) return issue("block", "Please type or say your perfect result.");
  if (CRISIS.some((re) => re.test(text))) return issue("crisis", "", country);
  if (text.length > MAX_CHARS) {
    return issue("block", `Please keep it to ${MAX_CHARS} characters or fewer (you have ${text.length}).`);
  }
  if (/https?:\/\/|www\.|\.(com|co\.za|net|org)\b/i.test(text)) return issue("block", "Please leave out links.");
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(text)) return issue("block", "Please leave out email addresses.");
  if (/\d[\d\s-]{8,}\d/.test(text)) return issue("block", "Please leave out phone, ID and account numbers.");
  if (PROFANITY.some((re) => re.test(text))) {
    return issue("block", "Please use kind words. Your perfect result deserves them.");
  }

  const words = text.split(/\s+/).filter((w) => /\p{L}/u.test(w));
  const letters = (text.match(/\p{L}/gu) ?? []).length;
  const visible = text.replace(/\s/g, "").length;
  const vowelless = words.filter((w) => w.length > 4 && !/[aeiouy]/i.test(w)).length;
  const junk =
    letters / Math.max(1, visible) < 0.6 ||
    /(.)\1{4,}/.test(text) ||
    KEYBOARD_RUNS.test(text) ||
    vowelless > Math.max(1, words.length / 3);
  if (junk) return issue("block", "That doesn't look like words yet. Try something like \"I have my own home\".");

  if (words.length < MIN_WORDS) {
    return issue("block", "Please add a few more words, like \"I have my own home\".");
  }

  if (!makesSense(text)) {
    return issue("block", "That doesn't read as a full sentence yet. Try finishing the thought, like \"I have my own home\".");
  }

  if (NEGATIVE.some((re) => re.test(text)) && !POSITIVE_FRAME.test(text)) {
    return issue("nudge", "Try saying what you do want, as if it's already true, like \"I have enough money\".");
  }

  return { status: "ok", ok: true, message: "" };
}
