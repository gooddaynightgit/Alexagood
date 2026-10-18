// Turn their perfect result around: positive, uplifting and making sense, then confirm it with them.
// The rewrite is done by Amazon Nova on Amazon Bedrock. Every rule in check.mjs still applies,
// before the rewrite (to what they said) and after it (to what Nova wrote).

import { checkPerfectResult, crisisSupport, NUDGE } from "./check.mjs";
import { affirm, reflect, toSsml } from "./script.mjs";

export const MODEL = "us.amazon.nova-2-lite-v1:0";
export const TIMEOUT_MS = 6000;

export const SYSTEM = `You help with Something Good, a gentle gratitude ritual. The person named what they are not grateful for, then wrote their "perfect result": how they want life to be, said as if already true.

Rewrite their perfect result so that:
1. It is positive and uplifting. It says what they DO have or feel. It contains NONE of these kinds of words: not, no, never, nothing, don't, can't, won't, without, anymore, free (as in free of), debt, broke, poor, sick, ill, pain, hurt, alone, lonely, stress, stressed, worry, anxious, afraid, scared, fail, lose, lost, hate, angry, stop, quit, problem, struggle.
   Examples: "I am debt free" -> "I am fully paid up." ; "not lonely and not stressed" -> "I am surrounded by people who love me, and I feel calm." ; "no more pain in my back" -> "My back feels comfortable and strong." ; "I can afford my rent without worrying" -> "I pay my rent with ease."
2. It is first person ("I", "my"), present tense, as if already true. Calm and believable. Never add things they did not mean.
3. It keeps their meaning, their sentences and as many of their own words as possible. If it is already positive and makes sense, return it unchanged except for obvious grammar or a final full stop.
4. At most 3 short sentences, under 200 characters.
5. If it is an unfinished fragment or nonsense whose meaning you cannot be sure of (e.g. "Move to my", "I am happy that I have", "I have", "asdf"), do not guess: return unclear.
6. If it mentions harming themselves or not wanting to live, return crisis.

Reply with one line of JSON only, no code fences: {"status":"ok","result":"..."} or {"status":"unclear"} or {"status":"crisis"}.`;

/** Ways of checking back with them. Always "understand" or "clarify", never "heard". */
export const CONFIRM_LEADS = [
  "Just making sure I understand:",
  "Let me clarify, so I get it right:",
  "Just to clarify:",
  "I want to be sure I understand you:",
  "So, to clarify:",
  "Let me make sure I understand:",
];
export const CONFIRM_QUESTION = "Is that right?";
export const YES = "Yes, that's it";
export const CHANGE = "Let me change it";

export const UNCLEAR =
  `${NUDGE} That doesn't read as a full sentence yet. Try finishing the thought, like "I have my own home".`;
export const NOT_POSITIVE =
  `${NUDGE} Try saying what you do want, as if it's already true, like "I have enough money".`;

/** Ask Amazon Nova on Bedrock. Uses the AWS SDK built into the Lambda Node.js runtime. */
export async function askBedrock(text, env = process.env) {
  const { BedrockRuntimeClient, ConverseCommand } = await import("@aws-sdk/client-bedrock-runtime");
  const client = new BedrockRuntimeClient({ region: env.SG_BEDROCK_REGION ?? env.AWS_REGION ?? "us-east-1" });
  const out = await client.send(
    new ConverseCommand({
      modelId: env.SG_MODEL ?? MODEL,
      system: [{ text: SYSTEM }],
      messages: [{ role: "user", content: [{ text }] }],
      inferenceConfig: { maxTokens: 150, temperature: 0 },
    }),
    { abortSignal: AbortSignal.timeout(TIMEOUT_MS) },
  );
  return out.output?.message?.content?.find((c) => c.text)?.text ?? "";
}

/** Nova's reply as { status, result }. Anything odd counts as no answer. */
export function parseReply(raw) {
  const m = String(raw ?? "").match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]);
    if (j.status === "ok" && typeof j.result === "string" && j.result.trim()) return { status: "ok", result: j.result.trim() };
    if (j.status === "unclear" || j.status === "crisis") return { status: j.status };
  } catch {
    /* not JSON */
  }
  return null;
}

/** "I am fully paid up." -> "Just to clarify: you are fully paid up. Is that right?" */
export function confirmLine(result, lead) {
  // "My son and I share…" reads back as "you and your son share…", not "your son and you share…".
  const facing = reflect(result).replace(/\byour ((?:[\w'-]+ ){0,2}[\w'-]+) and you\b/gi, "you and your $1");
  return `${lead} ${facing}. ${CONFIRM_QUESTION}`;
}

const blocked = (message) => ({ status: "block", ok: false, message });

function crisis(country) {
  const support = crisisSupport(country);
  return { status: "crisis", ok: false, message: support.message, support };
}

/**
 * Check, rewrite positively, check again, and build the confirm question.
 * status: confirm (show `result` and ask `confirm`), block (show `message`, let them edit), crisis.
 * `ask` and `pick` are swappable for tests.
 */
export async function turnAround(raw, country, { ask = askBedrock, pick = Math.random } = {}) {
  const before = checkPerfectResult(raw, country);
  if (before.status === "crisis") return crisis(country);
  if (before.status === "block") return { status: "block", ok: false, message: before.message };

  let result;
  let reply = null;
  try {
    reply = parseReply(await ask(String(raw).trim()));
  } catch {
    reply = null; // Bedrock unreachable: fall back to the word rules alone
  }

  if (reply?.status === "crisis") return crisis(country);
  if (reply?.status === "unclear") return blocked(UNCLEAR);
  if (reply?.status === "ok") {
    let after = checkPerfectResult(reply.result, country);
    if (after.status === "crisis") return crisis(country);
    if (after.status === "nudge") {
      // The rewrite kept a negative word ("debts"): ask once more, saying so.
      try {
        const again = parseReply(
          await ask(`${String(raw).trim()}\n\n(Your rewrite "${reply.result}" still had a negative word. Rewrite it again with none of those words.)`),
        );
        if (again?.status === "ok") {
          reply = again;
          after = checkPerfectResult(again.result, country);
          if (after.status === "crisis") return crisis(country);
        }
      } catch {
        /* keep the first answer */
      }
    }
    if (after.status === "ok") result = reply.result;
  }

  if (!result) {
    // No usable rewrite: their own words, only if they're already positive.
    if (before.status !== "ok") return blocked(NOT_POSITIVE);
    result = String(raw).trim();
  }

  result = affirm(result);
  const lead = CONFIRM_LEADS[Math.floor(pick() * CONFIRM_LEADS.length) % CONFIRM_LEADS.length];
  const confirm = confirmLine(result, lead);
  const steps = [{ text: confirm, rate: "slow", pauseMs: 0 }];
  return {
    status: "confirm",
    ok: true,
    message: "",
    original: String(raw).trim(),
    result,
    changed: affirm(raw) !== result,
    confirm,
    yes: YES,
    change: CHANGE,
    steps,
    text: confirm,
    ssml: toSsml(steps),
  };
}
