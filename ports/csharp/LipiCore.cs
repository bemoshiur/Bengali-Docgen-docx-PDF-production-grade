// lipi — Bengali (বাংলা) DOCX & PDF generation.  https://github.com/bemoshiur/Bengali-Docgen-docx-PDF-production-grade
// Author: S M Moshiur Rahman  <bemoshiur@gmail.com>  ·  +8801717714676 (WhatsApp only)
// Free & open source under the MIT License. Keep this attribution if you use this code.
// lipi core primitives — C# port.
// odttf embedded-font obfuscation (ECMA-376 §17.8.1) + Bengali numerals and
// South-Asian Taka/Rupee formatting. Full OOXML writer stays TS-first (repo root).
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace Lipi;

public static class LipiCore
{
    public static readonly string[] BengaliDigits =
        { "০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯" };
    public const string TakaSign = "৳";
    public const string RupeeSign = "₹";
    private static readonly uint[] SfntMagics = { 0x00010000, 0x4F54544F, 0x74727565, 0x74746366 };

    public static string MakeFontKey() => "{" + Guid.NewGuid().ToString().ToUpperInvariant() + "}";

    /// <summary>16-byte XOR key: strip {}-, parse 32 hex → 16 bytes, then REVERSE.</summary>
    public static byte[] FontKeyToXorKey(string fontKey)
    {
        var hex = Regex.Replace(fontKey, "[{}\\-]", "");
        if (!Regex.IsMatch(hex, "^[0-9a-fA-F]{32}$"))
            throw new ArgumentException($"invalid font key: {fontKey}");
        var b = Convert.FromHexString(hex);
        Array.Reverse(b);
        return b;
    }

    /// <summary>XOR the first 32 bytes. Symmetric (obfuscate == deobfuscate).</summary>
    public static byte[] Obfuscate(byte[] ttf, string fontKey)
    {
        var key = FontKeyToXorKey(fontKey);
        var outp = (byte[])ttf.Clone();
        int n = Math.Min(32, outp.Length);
        for (int i = 0; i < n; i++) outp[i] ^= key[i % 16];
        return outp;
    }

    public static byte[] Deobfuscate(byte[] odttf, string fontKey) => Obfuscate(odttf, fontKey);

    public static bool HasSfntMagic(byte[] buf)
    {
        if (buf.Length < 4) return false;
        uint magic = (uint)((buf[0] << 24) | (buf[1] << 16) | (buf[2] << 8) | buf[3]);
        return Array.IndexOf(SfntMagics, magic) >= 0;
    }

    public static string ToBengaliNumerals(object value)
    {
        var s = value.ToString() ?? "";
        var sb = new StringBuilder();
        foreach (var c in s)
            sb.Append(c >= '0' && c <= '9' ? BengaliDigits[c - '0'] : c.ToString());
        return sb.ToString();
    }

    /// <summary>Last three digits, then groups of two: "1000000" → "10,00,000".</summary>
    public static string GroupSouthAsian(string intDigits)
    {
        var s = Regex.Replace(intDigits, "^0+(?=\\d)", "");
        if (s.Length <= 3) return s;
        var head = s.Substring(0, s.Length - 3);
        var tail = s.Substring(s.Length - 3);
        var parts = new List<string>();
        while (head.Length > 2)
        {
            parts.Insert(0, head.Substring(head.Length - 2));
            head = head.Substring(0, head.Length - 2);
        }
        parts.Insert(0, head);
        return string.Join(",", parts) + "," + tail;
    }

    private static string FormatMoney(decimal amount, string symbolChar,
        string numerals = "bengali", bool symbol = true, int? decimals = null)
    {
        bool neg = amount < 0;
        var a = Math.Abs(amount);
        string fixedStr = decimals.HasValue
            ? a.ToString("F" + decimals.Value, CultureInfo.InvariantCulture)
            : (a == Math.Truncate(a)
                ? ((long)a).ToString(CultureInfo.InvariantCulture)
                : a.ToString("F2", CultureInfo.InvariantCulture));
        string body;
        if (fixedStr.Contains('.'))
        {
            var p = fixedStr.Split('.');
            body = GroupSouthAsian(p[0]) + "." + p[1];
        }
        else
        {
            body = GroupSouthAsian(fixedStr);
        }
        if (numerals == "bengali") body = ToBengaliNumerals(body);
        return (neg ? "-" : "") + (symbol ? symbolChar : "") + body;
    }

    public static string FormatTaka(decimal amount, string numerals = "bengali", bool symbol = true, int? decimals = null)
        => FormatMoney(amount, TakaSign, numerals, symbol, decimals);

    public static string FormatRupee(decimal amount, string numerals = "bengali", bool symbol = true, int? decimals = null)
        => FormatMoney(amount, RupeeSign, numerals, symbol, decimals);
}
