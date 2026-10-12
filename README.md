# Something Good

**Name what you're not grateful for.**

Some days it's hard to feel grateful. Something Good starts there. You tell Alexa what you're dealing with: a challenge, a situation, something missing, or something you want to change. Alexa guides one slow breath, then says your own words back to you:

> "Thank you. I am living in my own home. Something good is about to happen."

It never pretends the problem is solved. It helps you hold it with a little more hope. About two minutes, voice only.

Built for the [Build, Ship, Shape Amazon Developer Hackathon](https://amazonappdev2026.devpost.com/), Alexa+ track, by the maker of [GoodDayNight](https://gooddaynight.com).

## What's here

| Path | What it is |
|---|---|
| `src/mcp.mjs` | MCP server, Streamable HTTP transport, spec `2025-11-25`. Stateless, no dependencies. |
| `src/check.mjs` | Rules for the perfect result (shared by Alexa and the web page). |
| `src/script.mjs` | The words, pace and pauses. Builds SSML with real timed breaks for Alexa. |
| `src/lambda.mjs` | AWS Lambda entry point (Function URL). |
| `api/mcp.mjs` | Vercel entry point; the live endpoint is `/mcp`. |
| `src/local.mjs` | Run it on your own machine. |
| `skills/something-good/SKILL.md` | The Agent Skill: how Alexa+ should run the ritual. Also served by the server as an MCP resource. |

## MCP tools

| Tool | Input | Returns |
|---|---|---|
| `start_something_good` | optional `focus`: challenge, situation, missing, change, else | Welcome, one slow breath (in 4s, hold 2s, out 7s), then the question. |
| `finish_something_good` | `named`: their perfect result | One line: "Thank you.", their perfect result in their own words, "Something good is about to happen." |
| `check_perfect_result` | `text` | ok / nudge / block / crisis, with a gentle message. Blocks swearing, junk, personal details, too short or long; nudges negative wording; crisis words get the SADAG helpline. |
| `guided_breath` | `breaths`: 1 to 3 | Just the breath. |

Every tool returns `ssml` (speak it exactly), `text`, and `steps` (each line with its speaking rate and the silence after it, for custom voice front ends).

The skill is also available as the resource `skill://something-good/SKILL.md`.

## Run it

Needs Node.js 20 or later. No packages to install.

```bash
npm test     # run the tests
npm start    # http://localhost:8787/mcp
```

Try it:

```bash
curl -s localhost:8787/mcp \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"finish_something_good","arguments":{"named":"my money worries"}}}'
```

## Deploy to AWS Lambda

1. Create a Node.js 22 Lambda function with handler `src/lambda.handler` and upload this folder as a zip.
2. Add a Function URL (auth type `NONE`; the server checks `Origin` for browsers).
3. Optional: set `ALLOWED_ORIGINS` to a comma-separated list of web origins allowed to call it.

The MCP endpoint is the Function URL itself.

## Licence

MIT
