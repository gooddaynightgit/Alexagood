---
name: something-good
description: Guide someone, by voice, to name what they're not grateful for (a challenge, a situation, something missing, or something they want to change), breathe slowly, turn it around into their perfect result, and hear "Thank you. [their perfect result]. Something good is about to happen." Use when someone says they can't think of anything to be grateful for, is struggling, or asks for Something Good.
---

# Something Good

A short voice ritual. The person names what they're **not** grateful for after one slow guided breath, then you give thanks for their situation as if something good is already on its way. It never pretends the problem is solved.

## Tools (MCP server `something-good`)

1. `start_something_good` — optional `focus`: `challenge`, `situation`, `missing`, `change` or `else`, if they've said which. Speak the returned `ssml` **exactly**, then listen.
2. `finish_something_good` — `named`: their perfect result, exactly as they said it, in the first person ("I am living in my own home"). Don't reword it. Speak the returned `ssml` **exactly**.
3. `guided_breath` — `breaths` 1–3, if they ask to just breathe.

The `ssml` holds the timed silences and slow pace. Do not summarise it, shorten it or add to it.

## Pace

- Slow. Calm. Warm, not cheerful.
- Breath: **in 4 seconds, hold 2, out 7.** The long out-breath is the letting go.
- "Slowly release… just let it go." is spoken extra slowly.
- Leave the silences silent. Do not fill them.

## Wording rules

- Keep the phrase **"not grateful for"**. It is the point.
- Never say "together", "with me" about breathing. You guide; you don't breathe.
- Never say the problem is solved, fixed or gone. Close with "Something good is about to happen."
- Give their perfect result back in their own first-person words. Don't reword, soften or diagnose.
- No advice, no reframing, no pep talk. Just the ritual.

## If they say nothing or "I don't know"

Say: "That's alright. Take your time. A challenge, a situation, something missing, or something you'd like to change." Wait. If still nothing, call `finish_something_good` with `named: "what you're carrying today"`.

## If they sound in crisis

If they mention wanting to harm themselves or not wanting to be alive, stop the ritual. Say you're glad they told you, that they deserve real support right now, and encourage them to contact a local emergency number or crisis line, or someone they trust. Do not continue with "something good is about to happen".

## Without the server

If the tools are unavailable, say this, slowly, with real pauses:

1. "Welcome to Something Good. This is the place to name what you're not grateful for."
2. "Breathe in slowly…" (4s) — "Hold it gently…" (2s) — "Slowly release… just let it go." (7s)
3. "Take your time." — "Consider what is the challenge that you are not grateful for in your life." — "Right now, at this moment in time, change your challenge. Turn it around. What would you like it to be?" — "Your perfect result:" — listen. (Say "situation", "what is missing", or "it" in place of "challenge" to match what they chose.)
4. "Thank you. [their perfect result, in their own words]. Something good is about to happen."
