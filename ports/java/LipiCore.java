// lipi — Bengali (বাংলা) DOCX & PDF generation.  https://github.com/bemoshiur/Bengali-Docgen-docx-PDF-production-grade
// Author: S M Moshiur Rahman  <bemoshiur@gmail.com>  ·  +8801717714676 (WhatsApp only)
// Free & open source under the MIT License. Keep this attribution if you use this code.
// lipi core primitives — Java port.
// odttf embedded-font obfuscation (ECMA-376 §17.8.1) + Bengali numerals and
// South-Asian Taka/Rupee formatting. Full OOXML writer stays TS-first (repo root).
// Run: javac LipiCore.java && java lipi.LipiCore   (run from the repo root)
package lipi;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

public final class LipiCore {
    public static final String[] BENGALI_DIGITS =
        {"০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"};
    public static final String TAKA_SIGN = "৳";
    public static final String RUPEE_SIGN = "₹";
    private static final long[] SFNT_MAGICS = {0x00010000L, 0x4F54544FL, 0x74727565L, 0x74746366L};

    private LipiCore() {}

    public static String makeFontKey() {
        return "{" + UUID.randomUUID().toString().toUpperCase(Locale.ROOT) + "}";
    }

    /** 16-byte XOR key: strip {}-, parse 32 hex -> 16 bytes, then REVERSE. */
    public static byte[] fontKeyToXorKey(String fontKey) {
        String hex = fontKey.replaceAll("[{}\\-]", "");
        if (!hex.matches("[0-9a-fA-F]{32}"))
            throw new IllegalArgumentException("invalid font key: " + fontKey);
        byte[] r = new byte[16];
        for (int i = 0; i < 16; i++) {
            int v = Integer.parseInt(hex.substring(i * 2, i * 2 + 2), 16);
            r[15 - i] = (byte) v; // parse left-to-right, store reversed
        }
        return r;
    }

    /** XOR the first 32 bytes. Symmetric (obfuscate == deobfuscate). */
    public static byte[] obfuscate(byte[] ttf, String fontKey) {
        byte[] key = fontKeyToXorKey(fontKey);
        byte[] out = ttf.clone();
        int n = Math.min(32, out.length);
        for (int i = 0; i < n; i++) out[i] ^= key[i % 16];
        return out;
    }

    public static byte[] deobfuscate(byte[] odttf, String fontKey) {
        return obfuscate(odttf, fontKey);
    }

    public static boolean hasSfntMagic(byte[] buf) {
        if (buf.length < 4) return false;
        long magic = ((buf[0] & 0xFFL) << 24) | ((buf[1] & 0xFFL) << 16)
                   | ((buf[2] & 0xFFL) << 8) | (buf[3] & 0xFFL);
        for (long m : SFNT_MAGICS) if (m == magic) return true;
        return false;
    }

    public static String toBengaliNumerals(Object value) {
        String s = String.valueOf(value);
        StringBuilder sb = new StringBuilder();
        for (char c : s.toCharArray())
            sb.append(c >= '0' && c <= '9' ? BENGALI_DIGITS[c - '0'] : String.valueOf(c));
        return sb.toString();
    }

    /** Last three digits, then groups of two: "1000000" -> "10,00,000". */
    public static String groupSouthAsian(String intDigits) {
        String s = intDigits.replaceFirst("^0+(?=\\d)", "");
        if (s.length() <= 3) return s;
        String head = s.substring(0, s.length() - 3);
        String tail = s.substring(s.length() - 3);
        List<String> parts = new ArrayList<>();
        while (head.length() > 2) {
            parts.add(0, head.substring(head.length() - 2));
            head = head.substring(0, head.length() - 2);
        }
        parts.add(0, head);
        return String.join(",", parts) + "," + tail;
    }

    private static String formatMoney(double amount, String symbolChar, String numerals, boolean symbol, Integer decimals) {
        boolean neg = amount < 0;
        double a = Math.abs(amount);
        String fixed;
        if (decimals != null) fixed = String.format(Locale.ROOT, "%." + decimals + "f", a);
        else if (a == Math.floor(a)) fixed = Long.toString((long) a);
        else fixed = String.format(Locale.ROOT, "%.2f", a);
        String body;
        if (fixed.contains(".")) {
            String[] p = fixed.split("\\.");
            body = groupSouthAsian(p[0]) + "." + p[1];
        } else {
            body = groupSouthAsian(fixed);
        }
        if ("bengali".equals(numerals)) body = toBengaliNumerals(body);
        return (neg ? "-" : "") + (symbol ? symbolChar : "") + body;
    }

    public static String formatTaka(double amount) {
        return formatMoney(amount, TAKA_SIGN, "bengali", true, null);
    }

    public static String formatRupee(double amount) {
        return formatMoney(amount, RUPEE_SIGN, "bengali", true, null);
    }

    private static Path findFont() {
        Path dir = Paths.get("").toAbsolutePath();
        while (dir != null) {
            Path p = dir.resolve("packages/fonts/fonts/NotoSansBengali-Regular.ttf");
            if (Files.exists(p)) return p;
            dir = dir.getParent();
        }
        throw new RuntimeException("bundled font not found; run from the repo root");
    }

    public static void main(String[] args) throws IOException {
        boolean[] ok = {true};
        java.util.function.BiConsumer<String, Boolean> check = (name, cond) -> {
            System.out.println((cond ? "  ✓ " : "  ✗ FAIL: ") + name);
            ok[0] &= cond;
        };
        byte[] ttf = Files.readAllBytes(findFont());
        String key = makeFontKey();
        byte[] odttf = obfuscate(ttf, key);
        check.accept("input has sfnt magic", hasSfntMagic(ttf));
        check.accept("obfuscated loses magic", !hasSfntMagic(odttf));
        check.accept("roundtrip is byte-identical", Arrays.equals(deobfuscate(odttf, key), ttf));
        check.accept("toBengaliNumerals(1234567)", toBengaliNumerals(1234567).equals("১২৩৪৫৬৭"));
        check.accept("formatTaka(1000000)", formatTaka(1000000).equals("৳১০,০০,০০০"));
        check.accept("formatRupee(1000000)", formatRupee(1000000).equals("₹১০,০০,০০০"));
        System.out.println(ok[0] ? "JAVA PORT OK ✓" : "JAVA PORT FAILED ✗");
        System.exit(ok[0] ? 0 : 1);
    }
}
