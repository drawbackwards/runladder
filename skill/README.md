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

3. Install the Skill. Two paths depending on where you use Claude:

   **Claude.ai (chat):** Go to **Settings → Capabilities → Skills** and upload the zip you just downloaded.

   **Claude Code (CLI):** Run this one-liner — the Skill installs to `~/.claude/skills/ladder-quality-score/`:

   ```bash
   mkdir -p ~/.claude/skills && \
     curl -fsSL https://runladder.com/downloads/ladder-skill-v1.0.3.zip -o /tmp/ladder-skill.zip && \
     unzip -oq /tmp/ladder-skill.zip -d ~/.claude/skills/ && \
     rm /tmp/ladder-skill.zip
   ```

   Claude Code runs the scoring script on your local machine, so it's not subject to the Claude.ai workspace network allowlist.

## Use

### macOS — fastest path

1. Take a screenshot:
   - **Cmd+Shift+4** → saves to `~/Desktop`
   - **Cmd+Ctrl+Shift+4** → copies to the clipboard
2. In Claude, say: **Run Ladder**

That's it. The Skill will auto-find your most recent Desktop screenshot (or pull the image off your clipboard) — no path typing required.

### Claude.ai (chat)

Attach the screenshot to the chat and say **Run Ladder**.

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
