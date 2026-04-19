#!/usr/bin/env python3
"""
Ladder Skill — thin client for the Ladder scoring API.

Usage:
  python scripts/score.py                    # macOS: uses clipboard, then latest ~/Desktop screenshot
  python scripts/score.py <path-to-image>    # explicit path

Reads the user's Skill token from ~/.ladder/token and POSTs to
https://runladder.com/api/skill/score. Contains no scoring logic —
all evaluation happens server-side.
"""

import base64
import json
import mimetypes
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Optional
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


def clipboard_image() -> Optional[Path]:
    """macOS only: if the clipboard holds a PNG image, save it to a temp file and return the path."""
    if sys.platform != "darwin":
        return None
    tmp = Path(tempfile.gettempdir()) / "ladder-clipboard.png"
    # AppleScript: try to read «class PNGf» off the clipboard and write to tmp.
    # Returns the path on success, empty string on failure.
    script = (
        'try\n'
        '  set pngData to the clipboard as «class PNGf»\n'
        'on error\n'
        '  return ""\n'
        'end try\n'
        f'set outFile to POSIX file "{tmp}"\n'
        'set fd to open for access outFile with write permission\n'
        'set eof fd to 0\n'
        'write pngData to fd\n'
        'close access fd\n'
        'return POSIX path of outFile\n'
    )
    try:
        result = subprocess.run(
            ["osascript", "-e", script],
            capture_output=True,
            text=True,
            timeout=5,
        )
    except Exception:
        return None
    out = result.stdout.strip()
    if result.returncode == 0 and out and Path(out).exists() and Path(out).stat().st_size > 0:
        return Path(out)
    return None


def latest_desktop_screenshot() -> Optional[Path]:
    """Return the most recently modified Screenshot*.png on ~/Desktop, if any."""
    desktop = Path.home() / "Desktop"
    if not desktop.exists():
        return None
    shots = list(desktop.glob("Screenshot*.png"))
    if not shots:
        return None
    shots.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return shots[0]


def resolve_image(arg: Optional[str]) -> Path:
    """Resolve image path. Explicit arg wins; on miss, try tolerant matching.
    With no arg, fall back to macOS clipboard, then latest ~/Desktop screenshot."""
    if arg:
        p = Path(arg).expanduser()
        if p.exists():
            return p
        # macOS screenshot filenames embed U+202F (narrow no-break space) between
        # the time and AM/PM. If the user typed a regular space, retry with U+202F.
        nnbsp = "\u202f"
        alt_str = arg.replace(" PM", f"{nnbsp}PM").replace(" AM", f"{nnbsp}AM")
        alt = Path(alt_str).expanduser()
        if alt.exists():
            return alt
        # Last resort: glob with ? in place of spaces inside the basename.
        parent = p.parent
        pattern = p.name.replace(" ", "?")
        matches = sorted(parent.glob(pattern))
        if matches:
            return matches[0]
        sys.stderr.write(f"Image not found: {arg}\n")
        sys.exit(2)
    clip = clipboard_image()
    if clip:
        sys.stderr.write(f"Using image from clipboard: {clip}\n")
        return clip
    shot = latest_desktop_screenshot()
    if shot:
        sys.stderr.write(f"Using latest Desktop screenshot: {shot.name}\n")
        return shot
    sys.stderr.write(
        "No image provided. On macOS, either:\n"
        "  - Cmd+Shift+4 (saves to Desktop), then re-run, or\n"
        "  - Cmd+Ctrl+Shift+4 (copies to clipboard), then re-run, or\n"
        "  - Pass a path: python scripts/score.py /path/to/image.png\n"
    )
    sys.exit(2)


def encode_image(path: Path) -> str:
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


def score(image_arg: Optional[str]) -> dict:
    token = read_token()
    path = resolve_image(image_arg)
    data_url = encode_image(path)

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
        # The Ladder API itself never returns 403 — a 403 here means an
        # upstream network filter (typically a Claude workspace allowlist)
        # blocked egress to runladder.com before the request reached us.
        if e.code == 403:
            return {
                "error": (
                    "The Ladder API (runladder.com) is not reachable from your Claude "
                    "workspace. A workspace admin needs to add runladder.com to the "
                    "allowed network domains in Claude's workspace settings."
                ),
                "_status": 403,
                "_reason": "network_allowlist",
            }
        try:
            payload = json.loads(e.read().decode("utf-8"))
            payload["_status"] = e.code
            return payload
        except Exception:
            return {"error": f"HTTP {e.code}", "_status": e.code}
    except error.URLError as e:
        return {"error": f"Could not reach Ladder API: {e.reason}"}


def main() -> None:
    arg = sys.argv[1] if len(sys.argv) >= 2 else None
    result = score(arg)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
