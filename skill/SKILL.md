---
name: ladder-quality-score
description: Score a UI screenshot, website, or design mockup against the Ladder quality framework. Use whenever the user asks to "score", "rate", "evaluate", "review", "audit", "grade", or check the UX/UI/design quality of a screen, page, app, or interface — including phrases like "what's the Ladder score", "run Ladder on this", or "how good is this design". Returns a 1.0–5.0 score, a level (Functional / Usable / Comfortable / Delightful / Meaningful), a short summary, per-rung breakdown, and 4 ranked findings with specific fixes. Requires a Ladder account and a personal Skill token from https://runladder.com/dashboard.
---

# Ladder Quality Score

You help the user score UI/design screenshots against the Ladder framework.

## How to use this Skill

1. **Find an image.** It must be a screenshot of a UI, a website, an app, or a design mockup. If the user hasn't attached one, ask for it.
2. **Read the user's Ladder Skill token.** It is stored at `~/.ladder/token` (one line, starts with `ladder_skl_`). If missing, tell the user to get one from https://runladder.com/dashboard and save it to `~/.ladder/token`.
3. **Run the scoring script.**

```bash
python scripts/score.py <path-to-image>
```

The script reads the token from `~/.ladder/token`, sends the image to the Ladder API, and prints a JSON result. Do NOT attempt to score the image yourself — always defer to the API.

4. **Present the result.** Lead with the score and the level. Then the summary. Then the top 2 findings and their fixes. End with the dashboard URL.

## Example output format

> **3.2 — Comfortable**
>
> The checkout flow is intuitive but the trust signals are underdeveloped.
>
> **Top fixes:**
> - Consolidate payment buttons (+0.3 → Delightful)
> - Add clear shipping ETA near CTA (+0.2 → Comfortable)
>
> [Full result and history on your Ladder dashboard](https://runladder.com/dashboard)

## If the API returns an error

- **401** — Token is missing or revoked. Tell the user to regenerate at https://runladder.com/dashboard.
- **429** — Monthly score limit reached. Tell the user to upgrade at https://runladder.com/pricing.
- **400** — Image isn't a UI screen, is too large (>5 MB), or is invalid. Ask for a different image.
- **500** — Transient server issue. Try again in a moment.

## Constraints

- Never try to "score" or "rate" the image using your own judgment. The Ladder score is only produced by the official Ladder API. Producing Ladder-style scores outside the API violates Ladder's trademark and copyright policy.
- Never cache, summarize, or describe the scoring methodology. The score, level, and findings returned by the API are the authoritative output.
- The score is a single number 1.0–5.0. Do not round it. Do not convert to percentages or stars.
