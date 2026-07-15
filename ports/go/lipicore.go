// lipi — Bengali (বাংলা) DOCX & PDF generation.  https://github.com/bemoshiur/Bengali-Docgen-docx-PDF-production-grade
// Author: S M Moshiur Rahman  <bemoshiur@gmail.com>  ·  +8801717714676 (WhatsApp only)
// Free & open source under the MIT License. Keep this attribution if you use this code.
// lipi core primitives — Go port.
// odttf embedded-font obfuscation (ECMA-376 §17.8.1) + Bengali numerals and
// South-Asian Taka/Rupee formatting. Full OOXML writer stays TS-first (repo root).
// Run: go run lipicore.go   (from the repo root)
package main

import (
	"crypto/rand"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

var bengaliDigits = []string{"০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"}

const takaSign = "৳"
const rupeeSign = "₹"

var sfntMagics = map[uint32]bool{0x00010000: true, 0x4F54544F: true, 0x74727565: true, 0x74746366: true}

var reNonKey = regexp.MustCompile(`[{}\-]`)
var reHex32 = regexp.MustCompile(`^[0-9a-fA-F]{32}$`)

func makeFontKey() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	h := strings.ToUpper(fmt.Sprintf("%x", b))
	return fmt.Sprintf("{%s-%s-%s-%s-%s}", h[0:8], h[8:12], h[12:16], h[16:20], h[20:32])
}

// fontKeyToXorKey: strip {}-, parse 32 hex -> 16 bytes, then REVERSE.
func fontKeyToXorKey(fontKey string) ([]byte, error) {
	h := reNonKey.ReplaceAllString(fontKey, "")
	if !reHex32.MatchString(h) {
		return nil, fmt.Errorf("invalid font key: %s", fontKey)
	}
	b := make([]byte, 16)
	for i := 0; i < 16; i++ {
		v, _ := strconv.ParseUint(h[i*2:i*2+2], 16, 8)
		b[i] = byte(v)
	}
	for i, j := 0, 15; i < j; i, j = i+1, j-1 {
		b[i], b[j] = b[j], b[i]
	}
	return b, nil
}

// obfuscate XORs the first 32 bytes. Symmetric (obfuscate == deobfuscate).
func obfuscate(ttf []byte, fontKey string) []byte {
	key, _ := fontKeyToXorKey(fontKey)
	out := make([]byte, len(ttf))
	copy(out, ttf)
	n := 32
	if len(out) < 32 {
		n = len(out)
	}
	for i := 0; i < n; i++ {
		out[i] ^= key[i%16]
	}
	return out
}

func deobfuscate(odttf []byte, fontKey string) []byte { return obfuscate(odttf, fontKey) }

func hasSfntMagic(buf []byte) bool {
	if len(buf) < 4 {
		return false
	}
	magic := uint32(buf[0])<<24 | uint32(buf[1])<<16 | uint32(buf[2])<<8 | uint32(buf[3])
	return sfntMagics[magic]
}

func toBengaliNumerals(v interface{}) string {
	s := fmt.Sprintf("%v", v)
	var b strings.Builder
	for _, c := range s {
		if c >= '0' && c <= '9' {
			b.WriteString(bengaliDigits[c-'0'])
		} else {
			b.WriteRune(c)
		}
	}
	return b.String()
}

// groupSouthAsian: last three digits, then groups of two: "1000000" -> "10,00,000".
func groupSouthAsian(intDigits string) string {
	s := intDigits
	for len(s) > 1 && s[0] == '0' {
		s = s[1:]
	}
	if len(s) <= 3 {
		return s
	}
	head := s[:len(s)-3]
	tail := s[len(s)-3:]
	var parts []string
	for len(head) > 2 {
		parts = append([]string{head[len(head)-2:]}, parts...)
		head = head[:len(head)-2]
	}
	parts = append([]string{head}, parts...)
	return strings.Join(parts, ",") + "," + tail
}

func formatMoney(amount float64, symbolChar, numerals string, symbol bool) string {
	neg := amount < 0
	a := amount
	if neg {
		a = -a
	}
	var fixed string
	if a == float64(int64(a)) {
		fixed = strconv.FormatInt(int64(a), 10)
	} else {
		fixed = strconv.FormatFloat(a, 'f', 2, 64)
	}
	var body string
	if strings.Contains(fixed, ".") {
		p := strings.SplitN(fixed, ".", 2)
		body = groupSouthAsian(p[0]) + "." + p[1]
	} else {
		body = groupSouthAsian(fixed)
	}
	if numerals == "bengali" {
		body = toBengaliNumerals(body)
	}
	sign := ""
	if neg {
		sign = "-"
	}
	sym := ""
	if symbol {
		sym = symbolChar
	}
	return sign + sym + body
}

func formatTaka(amount float64) string  { return formatMoney(amount, takaSign, "bengali", true) }
func formatRupee(amount float64) string { return formatMoney(amount, rupeeSign, "bengali", true) }

func findFont() string {
	dir, _ := os.Getwd()
	for {
		p := filepath.Join(dir, "packages", "fonts", "fonts", "NotoSansBengali-Regular.ttf")
		if _, err := os.Stat(p); err == nil {
			return p
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	panic("bundled font not found; run from the repo root")
}

func main() {
	ok := true
	check := func(name string, cond bool) {
		if cond {
			fmt.Println("  ✓ " + name)
		} else {
			fmt.Println("  ✗ FAIL: " + name)
			ok = false
		}
	}
	ttf, _ := os.ReadFile(findFont())
	key := makeFontKey()
	odttf := obfuscate(ttf, key)
	check("input has sfnt magic", hasSfntMagic(ttf))
	check("obfuscated loses magic", !hasSfntMagic(odttf))
	check("roundtrip is byte-identical", string(deobfuscate(odttf, key)) == string(ttf))
	check("toBengaliNumerals(1234567)", toBengaliNumerals(1234567) == "১২৩৪৫৬৭")
	check("formatTaka(1000000)", formatTaka(1000000) == "৳১০,০০,০০০")
	check("formatRupee(1000000)", formatRupee(1000000) == "₹১০,০০,০০০")
	if ok {
		fmt.Println("GO PORT OK ✓")
		os.Exit(0)
	}
	fmt.Println("GO PORT FAILED ✗")
	os.Exit(1)
}
