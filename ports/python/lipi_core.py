# lipi — Bengali (বাংলা) DOCX & PDF generation.  https://github.com/bemoshiur/Bengali-Docgen-docx-PDF-production-grade
# Author: S M Moshiur Rahman  <bemoshiur@gmail.com>  ·  +8801717714676 (WhatsApp only)
# Free & open source under the MIT License. Keep this attribution if you use this code.
"""
lipi core primitives — Python port.

Ports the two most reusable, self-contained pieces of `lipi`:
  1. `.odttf` embedded-font obfuscation (ECMA-376 §17.8.1) — the piece every
     language needs to embed a Bengali font in an OOXML file it builds itself.
  2. Bengali numerals + South-Asian (lakh/crore) Taka/Rupee formatting.

The full OOXML document writer stays TypeScript-first (see the repo root);
these primitives let you embed fonts and format numbers from Python today.

Run `python3 lipi_core.py` to self-test against the bundled fonts.
"""
from __future__ import annotations
import os
import re
import uuid

BENGALI_DIGITS = "০১২৩৪৫৬৭৮৯"
TAKA_SIGN = "৳"
RUPEE_SIGN = "₹"
_SFNT_MAGICS = {0x00010000, 0x4F54544F, 0x74727565, 0x74746366}


# ── odttf obfuscation ───────────────────────────────────────────────────────
def make_font_key() -> str:
    """A `w:fontKey` GUID string, e.g. '{XXXXXXXX-...}'."""
    return "{" + str(uuid.uuid4()).upper() + "}"


def font_key_to_xor_key(font_key: str) -> bytes:
    """16-byte XOR key: strip {}-, parse 32 hex → 16 bytes, then REVERSE."""
    hexs = re.sub(r"[{}\-]", "", font_key)
    if not re.fullmatch(r"[0-9a-fA-F]{32}", hexs):
        raise ValueError(f"invalid font key: {font_key!r}")
    return bytes.fromhex(hexs)[::-1]


def obfuscate(ttf: bytes, font_key: str) -> bytes:
    """XOR the first 32 bytes with the key. Symmetric (obfuscate == deobfuscate)."""
    key = font_key_to_xor_key(font_key)
    out = bytearray(ttf)
    for i in range(min(32, len(out))):
        out[i] ^= key[i % 16]
    return bytes(out)


deobfuscate = obfuscate


def has_sfnt_magic(buf: bytes) -> bool:
    if len(buf) < 4:
        return False
    return int.from_bytes(buf[:4], "big") in _SFNT_MAGICS


# ── Bengali numerals + currency ─────────────────────────────────────────────
def to_bengali_numerals(value) -> str:
    return "".join(BENGALI_DIGITS[int(c)] if c.isdigit() else c for c in str(value))


def group_south_asian(int_digits: str) -> str:
    """Last three digits, then groups of two: '1000000' → '10,00,000'."""
    s = int_digits.lstrip("0") or "0"
    if len(s) <= 3:
        return s
    head, tail = s[:-3], s[-3:]
    parts = []
    while len(head) > 2:
        parts.insert(0, head[-2:])
        head = head[:-2]
    parts.insert(0, head)
    return ",".join(parts) + "," + tail


def _format_money(amount, symbol_char, numerals="bengali", symbol=True, decimals=None) -> str:
    neg = amount < 0
    a = abs(amount)
    if decimals is not None:
        fixed = f"{a:.{decimals}f}"
    elif float(a).is_integer():
        fixed = str(int(a))
    else:
        fixed = f"{a:.2f}"
    if "." in fixed:
        ip, fp = fixed.split(".")
        body = group_south_asian(ip) + "." + fp
    else:
        body = group_south_asian(fixed)
    if numerals == "bengali":
        body = to_bengali_numerals(body)
    return ("-" if neg else "") + (symbol_char if symbol else "") + body


def format_taka(amount, **kw) -> str:
    return _format_money(amount, TAKA_SIGN, **kw)


def format_rupee(amount, **kw) -> str:
    return _format_money(amount, RUPEE_SIGN, **kw)


if __name__ == "__main__":
    font = os.path.join(
        os.path.dirname(__file__), "..", "..", "packages", "fonts", "fonts", "NotoSansBengali-Regular.ttf"
    )
    ok = True

    def check(name, cond):
        global ok
        print(("  ✓ " if cond else "  ✗ FAIL: ") + name)
        ok = ok and cond

    with open(font, "rb") as f:
        ttf = f.read()
    key = make_font_key()
    odttf = obfuscate(ttf, key)
    check("input has sfnt magic", has_sfnt_magic(ttf))
    check("obfuscated loses magic", not has_sfnt_magic(odttf))
    check("roundtrip is byte-identical", deobfuscate(odttf, key) == ttf)
    check("to_bengali_numerals(1234567)", to_bengali_numerals(1234567) == "১২৩৪৫৬৭")
    check("format_taka(1000000)", format_taka(1000000) == "৳১০,০০,০০০")
    check("format_rupee(1000000)", format_rupee(1000000) == "₹১০,০০,০০০")
    print("PYTHON PORT OK ✓" if ok else "PYTHON PORT FAILED ✗")
    raise SystemExit(0 if ok else 1)
