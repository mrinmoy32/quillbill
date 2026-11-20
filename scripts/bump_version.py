"""Bump the app version stored in the root VERSION file.

Usage:  python scripts/bump_version.py patch|minor|major

Semantic versioning, in plain words:
  patch  1.0.0 -> 1.0.1   bug fixes only
  minor  1.0.0 -> 1.1.0   new feature, nothing breaks for users
  major  1.0.0 -> 2.0.0   breaking change (e.g. API v1 -> v2)

After bumping: commit, merge to `prod`, and the pipeline tags `vX.Y.Z` for you.
"""
import sys
from pathlib import Path

VERSION_FILE = Path(__file__).resolve().parents[1] / "VERSION"


def main() -> None:
    kind = sys.argv[1] if len(sys.argv) > 1 else ""
    if kind not in {"patch", "minor", "major"}:
        sys.exit(__doc__)
    major, minor, patch = (int(x) for x in VERSION_FILE.read_text().strip().split("."))
    if kind == "major":
        major, minor, patch = major + 1, 0, 0
    elif kind == "minor":
        minor, patch = minor + 1, 0
    else:
        patch += 1
    new = f"{major}.{minor}.{patch}"
    VERSION_FILE.write_text(new + "\n")
    print(f"Version bumped to {new}. Add a line to CHANGELOG.md, then commit.")


if __name__ == "__main__":
    main()
