// Something Good: the words, the pauses and the pace. No dependencies.
//
// Every builder returns the same session three ways:
//   steps -> ordered lines with a speaking rate and the silence after each (for any voice front end)
//   ssml  -> one <speak> document Alexa can say as-is, with real timed breaks
//   text  -> plain text, for reading or for an agent to paraphrase from

export const NAME = "Something Good";
export const TAGLINE = "Something good is about to happen.";

/** Breath timing in milliseconds. The long out-breath is the letting go. */
export const BREATH_MS = { in: 4000, hold: 2000, out: 7000 };

const RATE = { normal: "medium", slow: "slow", verySlow: "x-slow" };

const line = (text, rate = RATE.slow, pauseMs = 700, phase) => ({ text, rate, pauseMs, ...(phase ? { phase } : {}) });
/** Lines that belong on the same screen as the answer box. */
const ask = (text, pauseMs) => ({ ...line(text, RATE.slow, pauseMs), group: "ask" });

export const OPENING = [
  line("Welcome to Something Good. This is the place to name what you're not grateful for.", RATE.normal, 1200),
];

export function breath(count = 1) {
  const n = Math.min(3, Math.max(1, Math.round(Number(count) || 1)));
  const steps = [];
  for (let i = 0; i < n; i += 1) {
    steps.push(line("Breathe in slowly…", RATE.slow, BREATH_MS.in, "in"));
    steps.push(line("Hold it gently…", RATE.slow, BREATH_MS.hold, "hold"));
    steps.push(line("Slowly release…", RATE.verySlow, 1500, "out"));
    steps.push(line("just let it go.", RATE.verySlow, BREATH_MS.out - 1500, "out"));
  }
  return steps;
}

/** What they chose to name. "else" (or nothing) asks the open question. */
export const FOCUS = ["challenge", "situation", "missing", "change", "else"];

/** "Consider…" and "turn it around" lines, shaped by what they chose. */
const NAMING = {
  challenge: {
    consider: "Consider what is the challenge that you are not grateful for in your life.",
    turn: "Right now, at this moment in time, change your challenge. Turn it around.",
  },
  situation: {
    consider: "Consider what is the situation that you are not grateful for in your life.",
    turn: "Right now, at this moment in time, change your situation. Turn it around.",
  },
  missing: {
    consider: "Consider what is missing in your life, that you are not grateful for.",
    turn: "Right now, at this moment in time, change what is missing. Turn it around.",
  },
  change: {
    consider: "Consider what you want to change, that you are not grateful for in your life.",
    turn: "Right now, at this moment in time, change it. Turn it around.",
  },
  else: {
    consider: "Consider what it is that you are not grateful for in your life.",
    turn: "Right now, at this moment in time, change it. Turn it around.",
  },
};

export const PERFECT_RESULT = "Your perfect result:";

export const CLOSE = "It's going to be alright. All is well. Something good is about to happen.";

/** Take your time, name it, turn it around, then say the perfect result. Alexa then listens. */
export function question(focus) {
  const n = NAMING[focus] ?? NAMING.else;
  return [
    ask("Take your time.", 2500),
    ask(n.consider, 4000),
    ask(`${n.turn} What would you like it to be?`, 2500),
    ask(PERFECT_RESULT, 0),
  ];
}

/** Their words, turned to face them: "my money worries" -> "your money worries". Never claims it is solved. */
export function reflect(raw) {
  const text = String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/, "")
    .slice(0, 200);
  if (!text) return "what you named";
  const lowered = /^[A-Z][a-z]/.test(text) && !/^I\b/.test(text) ? text[0].toLowerCase() + text.slice(1) : text;
  const swaps = [
    [/\bI'm\b/g, "you're"],
    [/\bI am\b/g, "you are"],
    [/\bI've\b/g, "you've"],
    [/\bI'll\b/g, "you'll"],
    [/\bI'd\b/g, "you'd"],
    [/\bI\b/g, "you"],
    [/\bmyself\b/gi, "yourself"],
    [/\bmine\b/gi, "yours"],
    [/\bmy\b/gi, "your"],
    [/\bme\b/gi, "you"],
  ];
  return swaps.reduce((t, [from, to]) => t.replace(from, to), lowered);
}

export const thankYou = (named) => `Thank you. Something good is about to happen with ${reflect(named)}.`;

// ---- sessions ---------------------------------------------------------------

/** First half: opening, one slow breath, then the question (shaped by what they chose). Alexa then listens. */
export function start(focus) {
  return pack([...OPENING, ...breath(1), ...question(focus)]);
}

/**
 * Their perfect result, kept in their own first-person words, tidied into sentences:
 * "i am happy and grateful i'm living in my own home" -> "I am happy and grateful I'm living in my own home."
 */
export function affirm(raw) {
  const sentences = String(raw ?? "")
    .split(/\n+/)
    .map((t) => t.trim().replace(/\s+/g, " ").replace(/…+$/, "").replace(/[.!?,;:]+$/, ""))
    .filter(Boolean)
    .map((t) => t.replace(/\bi\b/g, "I").replace(/\bi('m|'ve|'ll|'d)\b/g, "I$1"))
    .map((t) => `${t[0].toUpperCase()}${t.slice(1)}.`);
  return sentences.join(" ").slice(0, 600);
}

/** Second half: one card. Thank you, their perfect result in their own words, something good is about to happen. */
export function finish(named) {
  const result = affirm(named);
  const text = result
    ? `Thank you. ${result} Something good is about to happen.`
    : "Thank you. Something good is about to happen.";
  return pack([line(text, RATE.slow, 0)]);
}

export function breathOnly(count) {
  return pack(breath(count));
}

// ---- rendering --------------------------------------------------------------

const escapeXml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** Alexa allows breaks up to 10 seconds each; longer silences are chained. */
function breaks(ms) {
  const out = [];
  let left = Math.round(ms);
  while (left > 0) {
    const chunk = Math.min(10000, left);
    out.push(`<break time="${chunk}ms"/>`);
    left -= chunk;
  }
  return out.join("");
}

export function toSsml(steps) {
  const body = steps
    .map((s) => `<prosody rate="${s.rate}">${escapeXml(s.text.replace(/…/g, "..."))}</prosody>${breaks(s.pauseMs)}`)
    .join(" ");
  return `<speak>${body}</speak>`;
}

export const toText = (steps) => steps.map((s) => s.text).join("\n");

function pack(steps) {
  return { steps, ssml: toSsml(steps), text: toText(steps) };
}
