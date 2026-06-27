#!/usr/bin/env python3
"""
fetch-squads.py — Download the 2026 FIFA World Cup squads from Wikipedia
and emit src/data/squads.ts.

Usage:
    python3 scripts/fetch-squads.py

The script fetches the raw wikitext via the Wikipedia API (no external deps
beyond the standard library), parses every {{nat fs g player|...}} template,
cleans the player names, and writes a TypeScript module to src/data/squads.ts.

Re-run whenever squad changes need to be updated; the output is deterministic
for the same wikitext.
"""

import urllib.request
import json
import re
import os
import sys

WIKI_API = (
    "https://en.wikipedia.org/w/api.php"
    "?action=parse&page=2026_FIFA_World_Cup_squads&prop=wikitext&format=json"
)

# Map Wikipedia level-3 headings → internal team ids used in teams.ts
TEAM_ID_MAP: dict[str, str] = {
    # Group A
    "Mexico": "mex",
    "South Africa": "rsa",
    "South Korea": "kor",
    "Czech Republic": "cze",
    # Group B
    "Canada": "can",
    "Bosnia and Herzegovina": "bih",
    "Qatar": "qat",
    "Switzerland": "sui",
    # Group C
    "Brazil": "bra",
    "Morocco": "mar",
    "Haiti": "hai",
    "Scotland": "sco",
    # Group D
    "United States": "usa",
    "Paraguay": "par",
    "Australia": "aus",
    "Turkey": "tur",
    # Group E
    "Germany": "ger",
    "Curaçao": "cuw",
    "Ivory Coast": "civ",
    "Ecuador": "ecu",
    # Group F
    "Netherlands": "ned",
    "Japan": "jpn",
    "Sweden": "swe",
    "Tunisia": "tun",
    # Group G
    "Belgium": "bel",
    "Egypt": "egy",
    "Iran": "irn",
    "New Zealand": "nzl",
    # Group H
    "Spain": "esp",
    "Cape Verde": "cpv",
    "Saudi Arabia": "ksa",
    "Uruguay": "uru",
    # Group I
    "France": "fra",
    "Senegal": "sen",
    "Iraq": "irq",
    "Norway": "nor",
    # Group J
    "Argentina": "arg",
    "Algeria": "alg",
    "Austria": "aut",
    "Jordan": "jor",
    # Group K
    "Portugal": "por",
    "DR Congo": "cod",
    "Uzbekistan": "uzb",
    "Colombia": "col",
    # Group L
    "England": "eng",
    "Croatia": "cro",
    "Ghana": "gha",
    "Panama": "pan",
}

# Canonical team order — matches the order in src/data/teams.ts
TEAM_ORDER = [
    "mex", "rsa", "kor", "cze",
    "can", "bih", "qat", "sui",
    "bra", "mar", "hai", "sco",
    "usa", "par", "aus", "tur",
    "ger", "cuw", "civ", "ecu",
    "ned", "jpn", "swe", "tun",
    "bel", "egy", "irn", "nzl",
    "esp", "cpv", "ksa", "uru",
    "fra", "sen", "irq", "nor",
    "arg", "alg", "aut", "jor",
    "por", "cod", "uzb", "col",
    "eng", "cro", "gha", "pan",
]


def fetch_wikitext() -> str:
    print("Fetching wikitext from Wikipedia API …")
    req = urllib.request.Request(WIKI_API, headers={"User-Agent": "worldcup-2026-app/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read().decode())
    wikitext = data["parse"]["wikitext"]["*"]
    print(f"  Downloaded {len(wikitext):,} characters")
    return wikitext


def strip_wiki(s: str) -> str:
    """Remove wiki markup from a field value, returning a clean player name."""
    # [[Display|Link]] → Display
    s = re.sub(r'\[\[([^|\]]+)\|([^\]]*)\]\]', r'\2', s)
    # [[Name (disambiguation)]] → Name
    s = re.sub(r'\[\[([^(\]]+)\s*\([^)]*\)\]\]', r'\1', s)
    # [[Name]] → Name
    s = re.sub(r'\[\[([^\]]+)\]\]', r'\1', s)
    # Stray [[ or ]]
    s = re.sub(r'\[\[|\]\]', '', s)
    # {{template}}
    s = re.sub(r'\{\{[^}]*\}\}', '', s)
    # Bold / italic
    s = re.sub(r"'''?", '', s)
    # XML refs
    s = re.sub(r'<ref[^>]*/>', '', s)
    s = re.sub(r'<ref[^>]*>.*?</ref>', '', s, flags=re.DOTALL)
    # Parenthetical disambiguators that slipped through
    s = re.sub(r'\s*\([^)]*footballer[^)]*\)', '', s)
    s = re.sub(r'\s*\([^)]*born\s*\d+[^)]*\)', '', s)
    return s.strip()


def parse_squads(wikitext: str) -> dict[str, list[dict]]:
    squads: dict[str, list[dict]] = {}

    # Split by level-3 headings (===Team===)
    parts = re.split(r'(?m)^===([^=].+?)===\s*$', wikitext)

    for i in range(1, len(parts), 2):
        heading = parts[i].strip()
        body = parts[i + 1] if i + 1 < len(parts) else ""
        team_id = TEAM_ID_MAP.get(heading)
        if not team_id:
            continue

        players: list[dict] = []
        for m in re.finditer(r'\{\{nat fs g player\|([^}]+)\}\}', body, re.IGNORECASE):
            params = m.group(1)
            no_m = re.search(r'(?:^|\|)no=(\d+)', params)
            pos_m = re.search(r'(?:^|\|)pos=(\w+)', params)
            name_m = re.search(r'(?:^|\|)name=([^|]+)', params)
            if not (no_m and pos_m and name_m):
                continue
            pos = pos_m.group(1).upper()
            if pos not in ("GK", "DF", "MF", "FW"):
                continue
            name = strip_wiki(name_m.group(1))
            if not name:
                continue
            players.append({
                "number": int(no_m.group(1)),
                "name": name,
                "position": pos,
            })

        players.sort(key=lambda p: p["number"])
        squads[team_id] = players
        print(f"  {heading:45s} ({team_id}): {len(players)} players")

    return squads


def emit_typescript(squads: dict[str, list[dict]], out_path: str) -> None:
    lines = [
        "// 2026 FIFA World Cup squads — 48 teams × 26 players each.",
        "// Source: https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_squads",
        "// Generated by scripts/fetch-squads.py — do not edit by hand.",
        "// Player names in Latin script per Wikipedia. Shirt numbers per official FIFA list.",
        "",
        "import type { Player } from '../types/tournament'",
        "",
        "export const squads: Record<string, Player[]> = {",
    ]

    for tid in TEAM_ORDER:
        players = squads.get(tid, [])
        lines.append(f"  {tid}: [")
        for p in players:
            name = p["name"].replace("\\", "\\\\").replace("'", "\\'")
            lines.append(
                f"    {{ number: {p['number']}, name: '{name}', position: '{p['position']}' }},"
            )
        lines.append("  ],")

    lines.append("}")
    lines.append("")

    content = "\n".join(lines)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(content)

    total = sum(len(squads.get(t, [])) for t in TEAM_ORDER)
    print(f"\nWrote {out_path}")
    print(f"  {len(TEAM_ORDER)} teams, {total} players, {len(content):,} bytes")


def main() -> None:
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_path = os.path.join(repo_root, "src", "data", "squads.ts")

    wikitext = fetch_wikitext()
    squads = parse_squads(wikitext)

    missing = [tid for tid in TEAM_ORDER if tid not in squads]
    if missing:
        print(f"\nWARNING: missing data for teams: {missing}", file=sys.stderr)

    emit_typescript(squads, out_path)


if __name__ == "__main__":
    main()
