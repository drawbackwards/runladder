#!/usr/bin/env python3
"""
Ladder Skill — thin client for the Ladder scoring API.

Reads an image path from argv[1], loads the user's Skill token from
~/.ladder/token, and POSTs to https://runladder.com/api/skill/score.

This script contains no scoring logic. All evaluation happens server-side.
"""

import base64
import json
import mimetypes
import os
import sys
from pathlib import Path
from urllib import request, error

API_URL = os.environ.get("LADDER_API_URL", "https://runladder.com/api/skill/score")
TOKEN_PATH = Path.home() / ".ladder" / "token"
VERSION_PATH = Path(__file__).parent.parent / "VERSION"
SKILL_VERSION = VERSION_PATH.read_text().strip() if VERSION_PATH.exists() else "unknown"


def read_token() -> str:
    if not TOKEN_PATH.exists():
        sys.stderr.write(
            "No Ladder token found at ~/.ladder/token.\n"
            "Get one at https://runladder.com/dashboard and save it with:\n"
            "  mkdir -p ~/.ladder && echo 'YOUR_TOKEN' > ~/.ladder/token\n"
        )
        sys.exit(2)
    token = TOKEN_PATH.read_text().strip()
    if not token.startswith("ladder_skl_"):
        sys.stderr.write("Token in ~/.ladder/token does not look like a Ladder Skill token.\n")
        sys.exit(2)
    return token


def encode_image(path: Path) -> str:
    if not path.exists():
        sys.stderr.write(f"Image not found: {path}\n")
        sys.exit(2)
    mime, _ = mimetypes.guess_type(str(path))
    if mime not in {"image/png", "image/jpeg", "image/webp", "image/gif"}:
        sys.stderr.write(
            f"Unsupported image type: {mime or 'unknown'}. Use PNG, JPEG, WEBP, or GIF.\n"
        )
        sys.exit(2)
    data = path.read_bytes()
    if len(data) > 5 * 1024 * 1024:
        sys.stderr.write("Image is larger than 5 MB. Please resize and try again.\n")
        sys.exit(2)
    b64 = base64.b64encode(data).decode("ascii")
    return f"data:{mime};base64,{b64}"


def score(image_path: str) -> dict:
    token = read_token()
    data_url = encode_image(Path(image_path).expanduser())

    body = json.dumps({
        "image": data_url,
        "source": "claude-skill",
    }).encode("utf-8")

    req = request.Request(
        API_URL,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": f"ladder-skill/{SKILL_VERSION}",
            "X-Ladder-Skill-Version": SKILL_VERSION,
        },
    )

    try:
        with request.urlopen(req, timeout=90) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except error.HTTPError as e:
        try:
            payload = json.loads(e.read().decode("utf-8"))
            payload["_status"] = e.code
            return payload
        except Exception:
            return {"error": f"HTTP {e.code}", "_status": e.code}
    except error.URLError as e:
        return {"error": f"Could not reach Ladder API: {e.reason}"}


def main() -> None:
    if len(sys.argv) < 2:
        sys.stderr.write("Usage: score.py <image-path>\n")
        sys.exit(2)
    result = score(sys.argv[1])
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
