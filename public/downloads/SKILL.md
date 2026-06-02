---
name: ladder-quality-score
description: Score a UI screenshot, website, or design mockup against the Ladder quality framework. Trigger on "Run Ladder", "Ladder this", "Ladder score", "Ladder it", or any request to score, rate, evaluate, audit, or review the UX/UI/design quality of a screen, page, app, or interface.
---

# Ladder Quality Score

You score UI and design screenshots against the Ladder quality framework.

## Requirements

You need two things to run a score:

1. **A Ladder token** — stored in this project's instructions as `My Ladder token is ladder_skl_xxxxxx`. If no token is found, tell the user: "Add your Ladder token to this project's instructions as: My Ladder token is ladder_skl_xxxxxx — get one at https://runladder.com/dashboard"

2. **An image** — attached to the user's message. If no image is attached, say: "Attach a screenshot or design export to your message and say Run Ladder."

## Steps

**1. Get the image.** The user has attached an image to their message. Use that image directly — do not search the Desktop, Downloads, clipboard, or any file system location. If no image is attached to this specific message, stop and say: "Please attach a screenshot or design export to your message and say Run Ladder."

**2. Read the token** from the project instructions.

**3. Convert the attached image** to a base64 data URL.

**4. POST to the Ladder API:**

- URL: `https://runladder.com/api/skill/score`
- Method: POST
- Headers:
  - `Authorization: Bearer {token}`
  - `Content-Type: application/json`
- Body:
```json
  {
    "image": "data:image/png;base64,{base64_image_data}",
    "source": "claude-skill"
  }
```

**5. Present the result:**

**{score} — {label}**
{summary}

**Rungs:**
- Meaningful: {rungs.meaningful.score} — {rungs.meaningful.summary}
- Delightful: {rungs.delightful.score} — {rungs.delightful.summary}
- Comfortable: {rungs.comfortable.score} — {rungs.comfortable.summary}
- Usable: {rungs.usable.score} — {rungs.usable.summary}
- Functional: {rungs.functional.score} — {rungs.functional.summary}

**Top findings:**
1. {findings[0].title} — {findings[0].impact} Fix: {findings[0].fix}
2. {findings[1].title} — {findings[1].impact} Fix: {findings[1].fix}
3. {findings[2].title} — {findings[2].impact} Fix: {findings[2].fix}
4. {findings[3].title} — {findings[3].impact} Fix: {findings[3].fix}

Full result: {dashboardUrl}

**6. Handle usage warnings:**
- If `usage.status` is `approaching` — add: "Heads up: you're approaching your monthly limit ({usage.monthlyUsed}/{usage.monthlyLimit} scores)."
- If `usage.status` is `over` — add: "You're past your monthly cap. Email hello@drawbackwards.com to continue."

**7. Handle errors:**
- 401: "Your Ladder token is invalid or revoked. Get a new one at https://runladder.com/dashboard."
- 429 with `upgrade: true`: "You've used all your free Ladder scores. Upgrade at https://runladder.com/pricing."
- 429 with `hardCapped: true`: "Monthly scoring paused — you're past 2x your tier's cap. Email hello@drawbackwards.com."
- Any other error: show the error message from the API.
