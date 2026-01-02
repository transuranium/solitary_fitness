#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import re
from pathlib import Path

NEW_INNER_HTML = (
    '<strong>Protocolo isométrico.</strong> '
    'Tensión de 12 segundos. '
    'Descansa hasta recuperar la respiración. '
    'Repite 10 veces. '
    'Por lado, si aplica. '
    'Más detalles en <a href="breathing.html">Respiración</a>.'
)

P_TAG_RE = re.compile(
    r'(?is)(?P<open><p\b[^>]*\bclass\s*=\s*(?P<q>["\'])[^"\']*\biso-protocolo\b[^"\']*(?P=q)[^>]*>)'
    r'(?P<inner>.*?)'
    r'(?P<close></p>)'
)

def process_file(path: Path, write: bool, backup: bool) -> int:
    text = path.read_text(encoding="utf-8", errors="strict")
    count = 0

    def repl(m: re.Match) -> str:
        nonlocal count
        inner = m.group("inner")
        # Меняем ТОЛЬКО старый 12s протокол
        if re.search(r'tensión\s*:\s*12\s*s', inner, flags=re.I) and re.search(r'descanso', inner, flags=re.I):
            count += 1
            return f"{m.group('open')}{NEW_INNER_HTML}{m.group('close')}"
        return m.group(0)

    new_text = P_TAG_RE.sub(repl, text)

    if count and write:
        if backup:
            path.with_suffix(path.suffix + ".bak").write_text(text, encoding="utf-8")
        path.write_text(new_text, encoding="utf-8")

    return count

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("root", nargs="?", default=".", help="Project folder")
    ap.add_argument("--write", action="store_true", help="Apply changes (default: dry-run)")
    ap.add_argument("--no-backup", action="store_true", help="No .bak files")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    files = 0
    total = 0

    for f in root.rglob("*.html"):
        try:
            n = process_file(f, write=args.write, backup=(not args.no_backup))
        except UnicodeDecodeError:
            continue
        if n:
            files += 1
            total += n
            print(("CHANGED" if args.write else "WOULD_CHANGE") + f": {f} (replacements: {n})")

    print(f"\nRESULT:\nFiles affected: {files}\nTotal replacements: {total}")

if __name__ == "__main__":
    main()
