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


# \u2500\u2500\u2500 Claude Code conversation image extraction \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
# Claude Code stores attached images inside the conversation JSONL log at
# ~/.claude/projects/<project-slug>/<session-id>.jsonl. A user dropping an
# image into the chat is the most natural way to feed this script, so we
# read the most recent user-message image attachment directly and save it
# to a temp PNG/JPEG before falling back to clipboard / Desktop scans.
#
# Project slug is the CWD with "/" replaced by "-" and a leading "-".
# The active session is the most recently modified JSONL in that dir.
# We scan the file from the bottom up (the latest user attachment wins).

_IMAGE_MIME_EXT = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


def _claude_project_dir() -> Optional[Path]:
    """Resolve the current Claude Code project dir for cwd, if it exists.

    Slug rule: Claude Code replaces both "/" and "." with "-" in the
    absolute cwd. Because absolute paths start with "/", the slug
    naturally begins with "-" — no extra prefix needed. Example:
      /Users/foo/.claude/worktrees/bar  ->
      -Users-foo--claude-worktrees-bar

    Falls back to the longest project dir whose name is a prefix of the
    target slug, so running from a subdirectory of a tracked project
    still resolves."""
    try:
        cwd = os.getcwd()
    except OSError:
        return None
    projects_root = Path.home() / ".claude" / "projects"
    if not projects_root.is_dir():
        return None
    target = cwd.replace("/", "-").replace(".", "-")
    proj = projects_root / target
    if proj.is_dir():
        return proj
    candidates = [
        d for d in projects_root.iterdir()
        if d.is_dir() and target.startswith(d.name)
    ]
    if candidates:
        candidates.sort(key=lambda d: len(d.name), reverse=True)
        return candidates[0]
    return None


def _latest_jsonl(project_dir: Path) -> Optional[Path]:
    jsonls = list(project_dir.glob("*.jsonl"))
    if not jsonls:
        return None
    jsonls.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return jsonls[0]


def conversation_image() -> Optional[Path]:
    """Extract the most recent image attachment from the active Claude Code
    conversation. Returns a temp file path containing the decoded image, or
    None if no attachment is found (running outside Claude Code, no image
    in this conversation, unparseable JSONL, etc.)."""
    proj = _claude_project_dir()
    if proj is None:
        return None
    jsonl = _latest_jsonl(proj)
    if jsonl is None:
        return None

    try:
        # JSONL files can be large with embedded base64. Read once, scan
        # lines from newest to oldest.
        lines = jsonl.read_text(errors="ignore").splitlines()
    except OSError:
        return None

    for line in reversed(lines):
        if '"type":"image"' not in line:
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue
        # Only user messages \u2014 assistant tool results sometimes carry
        # images too (e.g., screenshot tools) and we don't want to
        # accidentally score those.
        if obj.get("type") != "user":
            continue
        msg = obj.get("message") or {}
        content = msg.get("content")
        if not isinstance(content, list):
            continue
        for block in reversed(content):
            if not isinstance(block, dict) or block.get("type") != "image":
                continue
            source = block.get("source") or {}
            if source.get("type") != "base64":
                continue
            media_type = source.get("media_type")
            data = source.get("data")
            if not media_type or not data:
                continue
            ext = _IMAGE_MIME_EXT.get(media_type)
            if not ext:
                continue
            try:
                raw = base64.b64decode(data)
            except Exception:
                continue
            tmp = Path(tempfile.gettempdir()) / f"ladder-claude-attachment{ext}"
            try:
                tmp.write_bytes(raw)
            except OSError:
                return None
            return tmp

    return None


def resolve_image(arg: Optional[str]) -> Path:
    """Resolve image path. Explicit arg wins; on miss, try tolerant
    matching. With no arg, look in the following order, picking the first
    that exists:
      1. Most recent image attachment in the active Claude Code
         conversation (handles "drop image into chat, run ladder").
      2. macOS clipboard (Cmd+Ctrl+Shift+4 just before).
      3. Latest Screenshot*.png on ~/Desktop (Cmd+Shift+4 just before)."""
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

    # The user-said-run-ladder-with-an-image-dropped-in-chat path. Most
    # natural Skill UX, so it's first.
    chat = conversation_image()
    if chat:
        sys.stderr.write(f"Using image from this Claude conversation: {chat}\n")
        return chat

    clip = clipboard_image()
    if clip:
        sys.stderr.write(f"Using image from clipboard: {clip}\n")
        return clip

    shot = latest_desktop_screenshot()
    if shot:
        sys.stderr.write(f"Using latest Desktop screenshot: {shot.name}\n")
        return shot

    sys.stderr.write(
        "No image provided. Either:\n"
        "  - Drop a screenshot into Claude and ask for a Ladder score, or\n"
        "  - Cmd+Shift+4 saves a screenshot to Desktop, re-run, or\n"
        "  - Cmd+Ctrl+Shift+4 copies a screenshot to clipboard, re-run, or\n"
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
