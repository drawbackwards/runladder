#!/usr/bin/env python3
"""
Ladder Skill — UserPromptSubmit hook.

Fires on every prompt submitted in Claude Code. When the user's message
matches a Ladder trigger phrase, prints an instruction to stdout that
Claude sees as context — telling it to invoke the Ladder skill immediately
rather than relying on autonomous skill discovery (which is unreliable).

Exit 0 always: this hook never blocks a prompt.
"""

import json
import re
import sys

TRIGGERS = re.compile(
    r"\b(run\s+ladder|ladder\s+this|ladder\s+score|ladder\s+it|"
    r"score\s+(this|it|the\s+(screen|ui|design|interface|page|app))|"
    r"(what['\u2019]?s\s+the\s+)?ladder\s+score|"
    r"rate\s+(this|the)\s+(ui|ux|design|screen|interface|page|app)|"
    r"evaluate\s+(this|the)\s+(ui|ux|design|screen|interface|page|app)|"
    r"audit\s+(this|the)\s+(ui|ux|design|screen|interface|page|app))\b",
    re.IGNORECASE,
)

def main() -> None:
    try:
        payload = json.load(sys.stdin)
        prompt = payload.get("prompt", "")
    except Exception:
        sys.exit(0)

    if TRIGGERS.search(prompt):
        print(
            "[Ladder hook] Ladder trigger detected. "
            "Invoke the ladder-quality-score skill now: "
            "run scripts/score.py from ~/.claude/skills/ladder-quality-score/ "
            "using the image attached to this conversation. "
            "If no image is attached, tell the user to attach a screenshot or "
            "design export to their message. "
            "Do not start a dev server or take any other action."
        )

    sys.exit(0)

if __name__ == "__main__":
    main()
