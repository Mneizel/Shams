// tools/build-corpus.js
// يحوّل النصوص الخام في text/sources/*.txt (OCR) و text/sources/shamela_epub/*.xhtml
// (نسخة مكتوبة نظيفة من الشاملة) إلى وحدة قابلة للاستيراد text/corpus.data.js
// (مقاطع نظيفة) ليعمل بحثُ الموقع بلا سيرفر.
//   node tools/build-corpus.js
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const SRC_DIR = "text/sources";
const EPUB_DIR = "text/sources/shamela_epub";
const OUT = "text/corpus.data.js";
const CHUNK = 600; // حجم المقطع بالحروف تقريبًا

const DIAC = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
const arRatio = (s) => {
  const ar = (s.match(/[ء-ي]/g) || []).length;
  return s.length ? ar / s.length : 0;
};

function clean(raw) {
  return raw
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.replace(DIAC, "").replace(/[«»"”“]/g, "").trim())
    // اطرح أسطر الضجيج: قصيرة جدًّا وغير عربية، أو نسبة العربية فيها ضعيفة وطويلة
    .filter((l) => {
      if (!l) return false;
      if (l.length <= 2) return false;
      if (arRatio(l) < 0.45 && l.length > 12) return false;
      return true;
    })
    .join("\n");
}

function chunk(text, src) {
  // وحّد كل النصّ سطرًا واحدًا ثم قسّمه على علامات الوقف إلى جُمَل
  const flat = text.replace(/\n+/g, " ").replace(/\s{2,}/g, " ").trim();
  const sentences = flat.split(/(?<=[.؟!،؛:])\s+|(?<=\s)(?=فصل |باب |الباب |الفصل |مطلب )/);
  const out = [];
  let buf = "";
  const flush = () => {
    const t = buf.replace(/\s{2,}/g, " ").trim();
    if (t.length >= 40) out.push(t);
    buf = "";
  };
  for (let s of sentences) {
    s = s.trim();
    if (!s) continue;
    // جملة أطول من الحدّ: قسّمها بالكلمات
    while (s.length > CHUNK) {
      const cut = s.lastIndexOf(" ", CHUNK);
      const piece = s.slice(0, cut > 40 ? cut : CHUNK);
      buf += (buf ? " " : "") + piece;
      flush();
      s = s.slice((cut > 40 ? cut : CHUNK)).trim();
    }
    if ((buf + " " + s).length > CHUNK) flush();
    buf += (buf ? " " : "") + s;
    if (buf.length >= CHUNK) flush();
  }
  flush();
  return out.map((t, i) => ({ id: `${src}#${i + 1}`, src, text: t }));
}

function htmlToText(html) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h\d|li)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/[«»"”“]/g, "");
}

let all = [];

// ١) نسخة الشاملة المكتوبة (نظيفة — أولويّة الاستشهاد)
if (existsSync(EPUB_DIR)) {
  const chapters = readdirSync(EPUB_DIR).filter((f) => /^ch\d+\.xhtml$/.test(f)).sort();
  for (const f of chapters) {
    const html = readFileSync(join(EPUB_DIR, f), "utf8");
    const text = htmlToText(html);
    if (text.replace(/\s/g, "").length < 200) continue; // فصول عنوانٍ فارغة تقريبًا
    const chunks = chunk(text, "shamela_epub_" + f.replace(".xhtml", ""));
    console.log(`${f} (شاملة، نصّ مكتوب): ${text.length} حرف ⇒ ${chunks.length} مقطع`);
    all = all.concat(chunks.map((c) => ({ ...c, quality: "typed" })));
  }
}

// ٢) نسخ الـ OCR (مسحٌ مصوَّر — احتياطيّة/تقاطعيّة فقط)
for (const f of readdirSync(SRC_DIR).filter((f) => f.endsWith(".txt"))) {
  const raw = readFileSync(join(SRC_DIR, f), "utf8");
  const cleaned = clean(raw);
  const chunks = chunk(cleaned, f.replace(/_djvu\.txt$|\.txt$/, ""));
  console.log(`${f} (OCR): ${raw.length} حرف خام ⇒ ${chunks.length} مقطع`);
  all = all.concat(chunks.map((c) => ({ ...c, quality: "ocr" })));
}

const typed = all.filter((c) => c.quality === "typed").length;
const header =
  "// مُولَّد آليًّا عبر tools/build-corpus.js — لا تُحرّره يدويًّا.\n" +
  `// مصدران: نصّ الشاملة المكتوب (${typed} مقطع، دقيق) + نسخ OCR (${all.length - typed} مقطع، تقاطعيّ).\n` +
  `// شمس المعارف — مؤلَّفٌ في المجال العامّ (ت ٦٢٢هـ). فهرسُ بحثٍ محلّيّ للأداة.\n` +
  `// عدد المقاطع: ${all.length}\n`;
writeFileSync(OUT, header + "export const CORPUS = " + JSON.stringify(all) + ";\nexport default CORPUS;\n");
console.log(`كُتب ${OUT} — ${all.length} مقطع (${typed} مكتوب + ${all.length - typed} OCR)، ${(JSON.stringify(all).length / 1048576).toFixed(1)} م.ب`);
