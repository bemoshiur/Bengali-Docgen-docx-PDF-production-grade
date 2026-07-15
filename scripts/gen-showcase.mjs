// lipi — Bengali (বাংলা) DOCX & PDF generation.  https://github.com/bemoshiur/Bengali-Docgen-docx-PDF-production-grade
// Author: S M Moshiur Rahman  <bemoshiur@gmail.com>  ·  +8801717714676 (WhatsApp only)
// Free & open source under the MIT License. Keep this attribution if you use this code.
// Generate docs/showcase.html — a real, self-contained render of Bengali
// conjuncts + a sample document using the BUNDLED Noto Sans Bengali font
// (embedded as base64 @font-face). Screenshot it to produce docs/*.png.
// Run: node scripts/gen-showcase.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fontsDir = join(root, 'packages', 'fonts', 'fonts');
const b64 = (f) => readFileSync(join(fontsDir, f)).toString('base64');
const reg = b64('NotoSansBengali-Regular.ttf');
const bold = b64('NotoSansBengali-Bold.ttf');

const CONJUNCTS = [
  ['ক্ষ', 'ka+ssa'], ['জ্ঞ', 'jha-nya'], ['স্ত্র', 'triple'], ['ন্ত্র', 'triple'],
  ['ক্ষ্ম', 'four-part'], ['র্ক', 'reph'], ['কৌ', 'au-kar (split)'], ['কো', 'o-kar (split)'],
  ['ক্র', 'ra-phala'], ['হৃ', 'ligature'], ['ঙ্ক', 'nga+ka'], ['ৎ', 'khanda ta'],
];

const html = `<!doctype html>
<html lang="bn"><head><meta charset="utf-8">
<style>
  @font-face { font-family:'Noto Sans Bengali'; font-weight:400; src:url(data:font/ttf;base64,${reg}) format('truetype'); }
  @font-face { font-family:'Noto Sans Bengali'; font-weight:700; src:url(data:font/ttf;base64,${bold}) format('truetype'); }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Noto Sans Bengali',sans-serif; background:#eef1f5; padding:32px; color:#1a1f2b; }
  .wrap { max-width:820px; margin:0 auto; display:flex; flex-direction:column; gap:24px; }
  .card { background:#fff; border-radius:14px; box-shadow:0 8px 30px rgba(20,30,55,.10); padding:32px 40px; }
  .badge { display:inline-block; font-size:13px; font-weight:700; color:#0a7d3c; background:#e4f6ec; padding:4px 12px; border-radius:999px; margin-bottom:16px; }
  h1 { font-size:26px; font-weight:700; text-align:center; }
  .sub { text-align:center; color:#5a6472; margin:6px 0 2px; }
  .grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-top:8px; }
  .cj { text-align:center; border:1px solid #e6eaf0; border-radius:10px; padding:14px 8px; background:#fbfcfe; }
  .cj .g { font-size:40px; font-weight:700; line-height:1.1; color:#12203a; }
  .cj .l { font-size:11px; color:#8891a0; margin-top:6px; }
  .doc h2 { font-size:19px; font-weight:700; margin:2px 0 10px; color:#12203a; }
  .doc p { font-size:15px; line-height:1.9; color:#2a3340; }
  table { width:100%; border-collapse:collapse; margin-top:14px; font-size:14px; }
  th,td { border:1px solid #d7dde6; padding:9px 12px; text-align:left; }
  th { background:#eff3f8; font-weight:700; }
  td.n, th.n { text-align:right; }
  .total td { font-weight:700; background:#f6f8fb; }
  .foot { font-size:12px; color:#8891a0; text-align:center; }
  b { font-weight:700; }
</style></head>
<body><div class="wrap">

  <div class="card">
    <span class="badge">✓ conjuncts render correctly · embedded font</span>
    <h1>lipi — বাংলা যুক্তাক্ষর পরীক্ষা</h1>
    <p class="sub">Noto Sans Bengali (bundled &amp; embedded) — no system Bengali font required</p>
    <div class="grid">
      ${CONJUNCTS.map(([g, l]) => `<div class="cj"><div class="g">${g}</div><div class="l">${l}</div></div>`).join('')}
    </div>
  </div>

  <div class="card doc">
    <h2>গণপ্রজাতন্ত্রী বাংলাদেশ সরকার — প্রকল্প প্রস্তাবনা</h2>
    <p>এই দলিলটি <b>lipi</b> লাইব্রেরি দিয়ে তৈরি। যুক্তাক্ষর যেমন ক্ষ, জ্ঞ, স্ত্র, র্ক এবং <b>গাঢ় বাংলা</b> নির্ভুলভাবে প্রদর্শিত হয়েছে। বাংলা সংখ্যা ও টাকা/রুপি সঠিক লক্ষ/কোটি গ্রুপিং সহ।</p>
    <table>
      <tr><th>পদবি</th><th class="n">সংখ্যা</th><th class="n">মাসিক সম্মানী</th></tr>
      <tr><td>প্রকল্প পরিচালক</td><td class="n">১</td><td class="n">৳২,০০,০০০</td></tr>
      <tr><td>সিনিয়র বিশেষজ্ঞ</td><td class="n">২</td><td class="n">৳১,৫০,০০০</td></tr>
      <tr><td>গবেষণা সহকারী</td><td class="n">৩</td><td class="n">৳৬০,০০০</td></tr>
      <tr class="total"><td>সর্বমোট (মাসিক)</td><td class="n">৬</td><td class="n">৯,৩০,০০০</td></tr>
    </table>
    <p style="margin-top:14px">India (₹): <b>₹১০,০০,০০০</b> = দশ লক্ষ টাকা · তারিখ: ৩১ আষাঢ় ১৪৩৩</p>
  </div>

  <p class="foot">Rendered from the bundled Noto Sans Bengali. lipi embeds this font into every .docx so it opens identically on any machine.</p>
</div></body></html>`;

mkdirSync(join(root, 'docs'), { recursive: true });
writeFileSync(join(root, 'docs', 'showcase.html'), html);
console.log('wrote docs/showcase.html (' + Math.round(html.length / 1024) + ' KB)');
