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

const QUESTIONS = {
  challenge: "Right at this moment, tell me: what challenge are you dealing with?",
  situation: "Right at this moment, tell me: what situation are you dealing with?",
  missing: "Right at this moment, tell me: what feels missing in your life?",
  change: "Right at this moment, tell me: what would you like to change?",
  else: "Right at this moment, tell me: what challenge or situation are you dealing with? Or is there something you'd like to change, or something missing in your life?",
};

export function question(focus) {
  const text = QUESTIONS[focus] ?? QUESTIONS.else;
  return [line("Take your time. There's no rush.", RATE.slow, 1500), line(text, RATE.slow, 0)];
}

export const CLOSE = "It's going to be alright. All is well. Something good is about to happen.";

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

/** Second half, once they've named it: their thank-you twice, then the close. */
export function finish(named) {
  const ty = thankYou(named);
  return pack([
    line(ty, RATE.slow, 2000),
    line("Say it with me.", RATE.slow, 1000),
    line(ty, RATE.slow, 2500),
    line(CLOSE, RATE.slow, 0),
  ]);
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
