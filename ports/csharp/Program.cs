// lipi — Bengali (বাংলা) DOCX & PDF generation.  https://github.com/bemoshiur/Bengali-Docgen-docx-PDF-production-grade
// Author: S M Moshiur Rahman  <bemoshiur@gmail.com>  ·  +8801717714676 (WhatsApp only)
// Free & open source under the MIT License. Keep this attribution if you use this code.
// lipi core primitives — C# port self-test. Run: dotnet run
using System.Text;
using Lipi;

Console.OutputEncoding = Encoding.UTF8;

bool ok = true;
void Check(string name, bool cond)
{
    Console.WriteLine((cond ? "  ✓ " : "  ✗ FAIL: ") + name);
    ok &= cond;
}

var ttf = File.ReadAllBytes(FindFont());
var key = LipiCore.MakeFontKey();
var odttf = LipiCore.Obfuscate(ttf, key);

Check("input has sfnt magic", LipiCore.HasSfntMagic(ttf));
Check("obfuscated loses magic", !LipiCore.HasSfntMagic(odttf));
Check("roundtrip is byte-identical", LipiCore.Deobfuscate(odttf, key).SequenceEqual(ttf));
Check("ToBengaliNumerals(1234567)", LipiCore.ToBengaliNumerals(1234567) == "১২৩৪৫৬৭");
Check("FormatTaka(1000000)", LipiCore.FormatTaka(1000000m) == "৳১০,০০,০০০");
Check("FormatRupee(1000000)", LipiCore.FormatRupee(1000000m) == "₹১০,০০,০০০");

Console.WriteLine(ok ? "CSHARP PORT OK ✓" : "CSHARP PORT FAILED ✗");
return ok ? 0 : 1;

// Walk up from the build output to find the bundled font in the repo.
static string FindFont()
{
    var dir = new DirectoryInfo(AppContext.BaseDirectory);
    while (dir != null)
    {
        var p = Path.Combine(dir.FullName, "packages", "fonts", "fonts", "NotoSansBengali-Regular.ttf");
        if (File.Exists(p)) return p;
        dir = dir.Parent;
    }
    throw new FileNotFoundException("bundled font not found walking up from " + AppContext.BaseDirectory);
}
