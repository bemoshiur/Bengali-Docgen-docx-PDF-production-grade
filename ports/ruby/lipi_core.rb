# lipi — Bengali (বাংলা) DOCX & PDF generation.  https://github.com/bemoshiur/Bengali-Docgen-docx-PDF-production-grade
# Author: S M Moshiur Rahman  <bemoshiur@gmail.com>  ·  +8801717714676 (WhatsApp only)
# Free & open source under the MIT License. Keep this attribution if you use this code.
require 'securerandom'

# lipi core primitives — Ruby port.
# Ports odttf embedded-font obfuscation (ECMA-376 §17.8.1) + Bengali numerals and
# South-Asian Taka/Rupee formatting. Full OOXML writer stays TS-first (repo root).
# Run: ruby lipi_core.rb
module LipiCore
  BENGALI_DIGITS = %w[০ ১ ২ ৩ ৪ ৫ ৬ ৭ ৮ ৯].freeze
  TAKA_SIGN = '৳'.freeze
  RUPEE_SIGN = '₹'.freeze
  SFNT_MAGICS = [0x00010000, 0x4F54544F, 0x74727565, 0x74746366].freeze

  module_function

  def make_font_key
    '{' + SecureRandom.uuid.upcase + '}'
  end

  # 16-byte XOR key: strip {}-, parse 32 hex → 16 bytes, then REVERSE.
  def font_key_to_xor_key(font_key)
    hexs = font_key.gsub(/[{}\-]/, '')
    raise ArgumentError, "invalid font key: #{font_key}" unless hexs =~ /\A[0-9a-fA-F]{32}\z/
    [hexs].pack('H*').bytes.reverse
  end

  # XOR the first 32 bytes. Symmetric (obfuscate == deobfuscate).
  def obfuscate(ttf, font_key)
    key = font_key_to_xor_key(font_key)
    out = ttf.bytes
    [32, out.length].min.times { |i| out[i] ^= key[i % 16] }
    out.pack('C*')
  end

  def deobfuscate(odttf, font_key)
    obfuscate(odttf, font_key)
  end

  def sfnt_magic?(buf)
    return false if buf.bytesize < 4
    SFNT_MAGICS.include?(buf.byteslice(0, 4).unpack1('N'))
  end

  def to_bengali_numerals(value)
    value.to_s.chars.map { |c| c =~ /[0-9]/ ? BENGALI_DIGITS[c.to_i] : c }.join
  end

  # Last three digits, then groups of two: '1000000' → '10,00,000'.
  def group_south_asian(int_digits)
    s = int_digits.sub(/\A0+(?=\d)/, '')
    return s if s.length <= 3
    head = s[0...-3]
    tail = s[-3..]
    parts = []
    while head.length > 2
      parts.unshift(head[-2..])
      head = head[0...-2]
    end
    parts.unshift(head)
    parts.join(',') + ',' + tail
  end

  def format_money(amount, symbol_char, numerals: 'bengali', symbol: true, decimals: nil)
    neg = amount < 0
    a = amount.abs
    fixed = if decimals
              format("%.#{decimals}f", a)
            elsif a == a.to_i
              a.to_i.to_s
            else
              format('%.2f', a)
            end
    if fixed.include?('.')
      ip, fp = fixed.split('.')
      body = group_south_asian(ip) + '.' + fp
    else
      body = group_south_asian(fixed)
    end
    body = to_bengali_numerals(body) if numerals == 'bengali'
    (neg ? '-' : '') + (symbol ? symbol_char : '') + body
  end

  def format_taka(amount, **kw)
    format_money(amount, TAKA_SIGN, **kw)
  end

  def format_rupee(amount, **kw)
    format_money(amount, RUPEE_SIGN, **kw)
  end
end

if __FILE__ == $PROGRAM_NAME
  ok = true
  check = lambda do |name, cond|
    puts((cond ? '  ✓ ' : '  ✗ FAIL: ') + name)
    ok &&= cond
  end

  font = File.join(__dir__, '..', '..', 'packages', 'fonts', 'fonts', 'NotoSansBengali-Regular.ttf')
  ttf = File.binread(font)
  key = LipiCore.make_font_key
  odttf = LipiCore.obfuscate(ttf, key)
  check.call('input has sfnt magic', LipiCore.sfnt_magic?(ttf))
  check.call('obfuscated loses magic', !LipiCore.sfnt_magic?(odttf))
  check.call('roundtrip is byte-identical', LipiCore.deobfuscate(odttf, key) == ttf)
  check.call('to_bengali_numerals(1234567)', LipiCore.to_bengali_numerals(1_234_567) == '১২৩৪৫৬৭')
  check.call('format_taka(1000000)', LipiCore.format_taka(1_000_000) == '৳১০,০০,০০০')
  check.call('format_rupee(1000000)', LipiCore.format_rupee(1_000_000) == '₹১০,০০,০০০')
  puts(ok ? 'RUBY PORT OK ✓' : 'RUBY PORT FAILED ✗')
  exit(ok ? 0 : 1)
end
