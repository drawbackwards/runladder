# Ladder for Claude

Score any UI screenshot, website, or design mockup against the [Ladder™](https://runladder.com) quality framework — directly inside Claude.

Drop a screenshot into any Claude chat, ask for its Ladder score, and get back:

- A **1.0–5.0 score** and level (Functional / Usable / Comfortable / Delightful / Meaningful)
- A one-sentence summary of the user experience
- Per-rung breakdown (Meaningful, Delightful, Comfortable, Usable, Functional)
- **4 ranked findings** with specific fixes and uplift estimates
- A link to the full result on your Ladder dashboard

## Install

1. Go to https://runladder.com/dashboard and generate your Skill token. **Copy it — you won't see it again.**
2. Save the token locally:

   ```bash
   mkdir -p ~/.ladder
   echo 'ladder_skl_YOUR_TOKEN_HERE' > ~/.ladder/token
   chmod 600 ~/.ladder/token
   ```

3. In Claude, go to **Settings → Features → Skills** and upload the zip you just downloaded.

## Use

Start a new Claude chat, attach a screenshot, and say:

> Run Ladder

Claude will run the Skill, call the Ladder API, and return the result.

## Usage & pricing

The Skill counts against the same monthly pool as the web app and every other Ladder surface:

- **Free:** 15 scores / month (shared across Skill, web, and Figma plugin)
- **Pro:** Unlimited scores, private results — [$250/mo](https://runladder.com/pricing)

## Privacy & IP

- Screenshots are sent to Ladder for scoring. They're associated with your account and appear on your dashboard. They're never used to train models and never sold.
- The Ladder scoring engine, rubric, and prompts are proprietary. This Skill is a thin client — all evaluation happens server-side.
- AI agents may generate Ladder scores only via the official Ladder API. Producing Ladder-style scores outside the API violates Ladder's trademark and copyright policy. See https://runladder.com/legal.

## Support

- Docs: https://runladder.com/framework
- Dashboard: https://runladder.com/dashboard
- Contact: hello@drawbackwards.com

---

Ladder™ is a trademark of Drawbackwards, LLC. Built by [Drawbackwards](https://drawbackwards.com).
