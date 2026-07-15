<?php
// lipi — Bengali (বাংলা) DOCX & PDF generation.  https://github.com/bemoshiur/Bengali-Docgen-docx-PDF-production-grade
// Author: S M Moshiur Rahman  <bemoshiur@gmail.com>  ·  +8801717714676 (WhatsApp only)
// Free & open source under the MIT License. Keep this attribution if you use this code.
// lipi core primitives — PHP port.
// odttf embedded-font obfuscation (ECMA-376 §17.8.1) + Bengali numerals and
// South-Asian Taka/Rupee formatting. Full OOXML writer stays TS-first (repo root).
// Run: php lipi_core.php
namespace LipiCore;

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const TAKA_SIGN = '৳';
const RUPEE_SIGN = '₹';
const SFNT_MAGICS = [0x00010000, 0x4F54544F, 0x74727565, 0x74746366];

function make_font_key(): string
{
    $hex = strtoupper(bin2hex(random_bytes(16)));
    return sprintf(
        '{%s-%s-%s-%s-%s}',
        substr($hex, 0, 8),
        substr($hex, 8, 4),
        substr($hex, 12, 4),
        substr($hex, 16, 4),
        substr($hex, 20, 12)
    );
}

/** 16-byte XOR key: strip {}-, parse 32 hex → 16 bytes, then REVERSE. */
function font_key_to_xor_key(string $fontKey): array
{
    $hex = preg_replace('/[{}\-]/', '', $fontKey);
    if (!preg_match('/^[0-9a-fA-F]{32}$/', $hex)) {
        throw new \InvalidArgumentException("invalid font key: $fontKey");
    }
    return array_reverse(array_values(unpack('C*', hex2bin($hex))));
}

/** XOR the first 32 bytes. Symmetric (obfuscate == deobfuscate). */
function obfuscate(string $ttf, string $fontKey): string
{
    $key = font_key_to_xor_key($fontKey);
    $n = min(32, strlen($ttf));
    $head = '';
    for ($i = 0; $i < $n; $i++) {
        $head .= chr(ord($ttf[$i]) ^ $key[$i % 16]);
    }
    return $head . substr($ttf, $n);
}

function deobfuscate(string $odttf, string $fontKey): string
{
    return obfuscate($odttf, $fontKey);
}

function has_sfnt_magic(string $buf): bool
{
    if (strlen($buf) < 4) {
        return false;
    }
    return in_array(unpack('N', substr($buf, 0, 4))[1], SFNT_MAGICS, true);
}

function to_bengali_numerals($value): string
{
    $out = '';
    foreach (str_split((string) $value) as $c) {
        $out .= ctype_digit($c) ? BENGALI_DIGITS[(int) $c] : $c;
    }
    return $out;
}

/** Last three digits, then groups of two: '1000000' → '10,00,000'. */
function group_south_asian(string $intDigits): string
{
    $s = preg_replace('/^0+(?=\d)/', '', $intDigits);
    if (strlen($s) <= 3) {
        return $s;
    }
    $head = substr($s, 0, -3);
    $tail = substr($s, -3);
    $parts = [];
    while (strlen($head) > 2) {
        array_unshift($parts, substr($head, -2));
        $head = substr($head, 0, -2);
    }
    array_unshift($parts, $head);
    return implode(',', $parts) . ',' . $tail;
}

function format_money($amount, string $symbolChar, string $numerals = 'bengali', bool $symbol = true, ?int $decimals = null): string
{
    $neg = $amount < 0;
    $a = abs($amount);
    if ($decimals !== null) {
        $fixed = number_format($a, $decimals, '.', '');
    } elseif ($a == (int) $a) {
        $fixed = (string) (int) $a;
    } else {
        $fixed = number_format($a, 2, '.', '');
    }
    if (strpos($fixed, '.') !== false) {
        [$ip, $fp] = explode('.', $fixed);
        $body = group_south_asian($ip) . '.' . $fp;
    } else {
        $body = group_south_asian($fixed);
    }
    if ($numerals === 'bengali') {
        $body = to_bengali_numerals($body);
    }
    return ($neg ? '-' : '') . ($symbol ? $symbolChar : '') . $body;
}

function format_taka($amount, string $numerals = 'bengali', bool $symbol = true, ?int $decimals = null): string
{
    return format_money($amount, TAKA_SIGN, $numerals, $symbol, $decimals);
}

function format_rupee($amount, string $numerals = 'bengali', bool $symbol = true, ?int $decimals = null): string
{
    return format_money($amount, RUPEE_SIGN, $numerals, $symbol, $decimals);
}

// ── self-test ───────────────────────────────────────────────────────────────
if (PHP_SAPI === 'cli' && isset($argv[0]) && realpath($argv[0]) === realpath(__FILE__)) {
    $ok = true;
    $check = function (string $name, bool $cond) use (&$ok) {
        echo ($cond ? '  ✓ ' : '  ✗ FAIL: ') . $name . "\n";
        $ok = $ok && $cond;
    };
    $ttf = file_get_contents(__DIR__ . '/../../packages/fonts/fonts/NotoSansBengali-Regular.ttf');
    $key = make_font_key();
    $odttf = obfuscate($ttf, $key);
    $check('input has sfnt magic', has_sfnt_magic($ttf));
    $check('obfuscated loses magic', !has_sfnt_magic($odttf));
    $check('roundtrip is byte-identical', deobfuscate($odttf, $key) === $ttf);
    $check('to_bengali_numerals(1234567)', to_bengali_numerals(1234567) === '১২৩৪৫৬৭');
    $check('format_taka(1000000)', format_taka(1000000) === '৳১০,০০,০০০');
    $check('format_rupee(1000000)', format_rupee(1000000) === '₹১০,০০,০০০');
    echo ($ok ? "PHP PORT OK ✓\n" : "PHP PORT FAILED ✗\n");
    exit($ok ? 0 : 1);
}
