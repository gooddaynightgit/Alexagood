---
name: something-good
description: Guide someone, by voice, to name what they're not grateful for (a challenge, a situation, something missing, or something they want to change), breathe slowly, turn it around into their perfect result, and hear "Thank you. [their perfect result]. Something good is about to happen." Use when someone says they can't think of anything to be grateful for, is struggling, or asks for Something Good.
---

# Something Good

A short voice ritual. The person names what they're **not** grateful for after one slow guided breath, then you give thanks for their situation as if something good is already on its way. It never pretends the problem is solved.

## Tools (MCP server `something-good`)

1. `start_something_good` — optional `focus`: `challenge`, `situation`, `missing`, `change` or `else`, if they've said which. Speak the returned `ssml` **exactly**, then listen.
2. `turn_around_perfect_result` — `text`: their perfect result, exactly as they said it; `country`: the device's country code if you know it (for the right crisis line). It checks every rule, then rewrites it to be positive, uplifting and clear ("I am debt free" becomes "I am fully paid up."). Always call it before finishing.
   - `confirm`: speak the returned `ssml` (e.g. "Just to clarify: you are fully paid up. Is that right?") and listen. On yes, call `finish_something_good` with `result`. On no, say "Of course. How would you like it to be?" and call this tool again with their new words. Allow three confirm rounds at most: after a third no, call `finish_something_good` with `gentleEnd: true` (it closes with "Thank you. Something good is about to happen." and never repeats a version they turned down).
   - `block`: say the `message` gently and let them try again.
   - `crisis`: stop the ritual and say the `message` (it offers real support).
3. `finish_something_good` — `named`: the `result` they confirmed. Speak the returned `ssml` **exactly**.
4. `check_perfect_result` — the same rules without the rewrite, if you only need a check.
5. `guided_breath` — `breaths` 1–3, if they ask to just breathe.

## Helping them start

If they're unsure how to say their perfect result, offer a few ways to begin: "You could start with 'I am so happy that…', 'I have…', 'I am feeling…', 'I feel relief knowing…', 'I feel a sense of accomplishment…', or 'It's awesome that…'." Then listen.

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
- Their perfect result is always positive, uplifting and makes sense before the closing card. Keep their meaning and as many of their own words as possible; only `turn_around_perfect_result` rewords it, and they always confirm it first.
- When checking back, say "understand" or "clarify", never "heard".
- No advice, no reframing, no pep talk. Just the ritual.

## If they say nothing or "I don't know"

Say: "That's alright. Take your time. A challenge, a situation, something missing, or something you'd like to change." Wait. If still nothing, call `finish_something_good` with `named: "what you're carrying today"`.

## If they sound in crisis

If they mention wanting to harm themselves or not wanting to be alive, stop the ritual. Say you're glad they told you and that they deserve real support right now. Give the helpline from `turn_around_perfect_result` (it knows South Africa, the US, Canada, the UK, Ireland, Australia and New Zealand), or else their local emergency number and findahelpline.com. Do not continue with "something good is about to happen".

## Without the server

If the tools are unavailable, say this, slowly, with real pauses:

1. "Welcome to Something Good." (pause) "This is the place to name what you're not grateful for." (pause) "Then turn it around." (said with excitement)
2. "Breathe in slowly…" (4s) — "Hold it gently…" (2s) — "Slowly release… just let it go." (7s)
3. "Take your time." — "Consider what is the challenge that you are not grateful for in your life." — "Right now, at this moment in time, change your challenge. Turn it around. What would you like it to be?" — "Your perfect result:" — listen. (Say "situation", "what is missing", or "it" in place of "challenge" to match what they chose.)
4. Turn it positive if needed, keeping their words, and ask: "Just to clarify: you [their perfect result]. Is that right?" On yes, go on.
5. Show "Thank you. [their perfect result]. Something good is about to happen." Say only: "Thank you." (pause) "Something good is about to happen."
