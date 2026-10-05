// tools/build-standalone.js
// يدمج كلّ شيء (المحرّكات + البيانات + astronomy-engine + النصّ + app.js + CSS)
// في ملفٍّ واحد: web/شمس-المعارف.html — يُفتح بالنقر المزدوج بلا سيرفر.
//   node tools/build-standalone.js
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { basename } from "node:path";
import { writeVersion } from "./build-version.js";

// نسخةُ الحسابات تُحدَّثُ أوّلًا (بصمةُ ملفّات المحرّك)
writeVersion();

const ROOT = process.cwd();
const KEY = (spec) => basename(spec).replace(/\.js$/, "");

// كلّ الوحدات (المفتاح = اسم الملفّ بلا امتداد)
const FILES = [
  ...readdirSync("data").filter((f) => f.endsWith(".js")).map((f) => "data/" + f),
  ...readdirSync("engines").filter((f) => f.endsWith(".js")).map((f) => "engines/" + f),
  "vendor/astronomy-engine.js",
  "text/corpus.data.js",
  ...readdirSync("web").filter((f) => f.endsWith(".data.js")).map((f) => "web/" + f),
  "web/feedback-config.js",
];

const mods = FILES.map((path) => {
  const src = readFileSync(path, "utf8");
  const deps = [...src.matchAll(/\bfrom\s*["']([^"']+\.js)["']/g)].map((m) => KEY(m[1]));
  return { path, key: KEY(path), src, deps };
});
const byKey = new Map(mods.map((m) => [m.key, m]));

// ترتيب طوبولوجيّ
const order = [];
const seen = new Set();
function visit(m, stack = []) {
  if (seen.has(m.key)) return;
  if (stack.includes(m.key)) throw new Error("دورة تبعيّات: " + stack.concat(m.key).join(" → "));
  for (const d of m.deps) { const dm = byKey.get(d); if (dm) visit(dm, stack.concat(m.key)); }
  seen.add(m.key);
  order.push(m);
}
mods.forEach((m) => visit(m));

// تحويل وحدة ESM إلى تعبيرٍ يُرجِع كائن صادراتها
function transform(src) {
  const exp = new Set();
  let b = src;

  // استيرادات
  b = b.replace(/^[ \t]*import\s+([A-Za-z_$][\w$]*)\s*,\s*\{([^}]*)\}\s*from\s*["']([^"']+)["'];?/gm,
    (_, def, named, spec) => `const ${def}=__M[${JSON.stringify(KEY(spec))}].default;const {${named.replace(/\s+as\s+/g, ": ")}}=__M[${JSON.stringify(KEY(spec))}];`);
  b = b.replace(/^[ \t]*import\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s*from\s*["']([^"']+)["'];?/gm,
    (_, ns, spec) => `const ${ns}=__M[${JSON.stringify(KEY(spec))}];`);
  b = b.replace(/^[ \t]*import\s+([A-Za-z_$][\w$]*)\s*from\s*["']([^"']+)["'];?/gm,
    (_, def, spec) => `const ${def}=__M[${JSON.stringify(KEY(spec))}].default;`);
  b = b.replace(/^[ \t]*import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["'];?/gm,
    (_, named, spec) => `const {${named.replace(/\s+as\s+/g, ": ")}}=__M[${JSON.stringify(KEY(spec))}];`);
  b = b.replace(/^[ \t]*import\s+["'][^"']+["'];?/gm, "");

  // صادرات
  b = b.replace(/^([ \t]*)export\s+default\s+/gm, "$1__exports.default = ");
  b = b.replace(/^([ \t]*)export\s+((?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*))/gm,
    (_, ws, decl, name) => { exp.add(name); return ws + decl; });
  b = b.replace(/^[ \t]*export\s*\{([^}]*)\}\s*;?[ \t]*$/gm, (_, inner) => {
    inner.split(",").forEach((p) => {
      p = p.trim(); if (!p) return;
      const parts = p.split(/\s+as\s+/);
      exp.add((parts[1] || parts[0]).trim());
    });
    return "";
  });

  const tail = [...exp].map((n) => `__exports[${JSON.stringify(n)}]=${n};`).join("");
  return `(function(){"use strict";const __exports={};\n${b}\n;${tail}return __exports;})()`;
}

let bundle = `/* مُولَّد آليًّا — tools/build-standalone.js */\nconst __M={};\n`;
for (const m of order) bundle += `__M[${JSON.stringify(m.key)}]=${transform(m.src)};\n`;

// app.js: نقطة الدخول — تُنفَّذ مباشرةً (صادراتها تُهمَل)
let app = readFileSync("web/app.js", "utf8");
app = app
  .replace(/^[ \t]*import\s+([A-Za-z_$][\w$]*)\s*,\s*\{([^}]*)\}\s*from\s*["']([^"']+)["'];?/gm,
    (_, def, named, spec) => `const ${def}=__M[${JSON.stringify(KEY(spec))}].default;const {${named.replace(/\s+as\s+/g, ": ")}}=__M[${JSON.stringify(KEY(spec))}];`)
  .replace(/^[ \t]*import\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s*from\s*["']([^"']+)["'];?/gm,
    (_, ns, spec) => `const ${ns}=__M[${JSON.stringify(KEY(spec))}];`)
  .replace(/^[ \t]*import\s+([A-Za-z_$][\w$]*)\s*from\s*["']([^"']+)["'];?/gm,
    (_, def, spec) => `const ${def}=__M[${JSON.stringify(KEY(spec))}].default;`)
  .replace(/^[ \t]*import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["'];?/gm,
    (_, named, spec) => `const {${named.replace(/\s+as\s+/g, ": ")}}=__M[${JSON.stringify(KEY(spec))}];`);
bundle += `\n/* ===== app ===== */\n(function(){"use strict";\n${app}\n})();\n`;

// اجمع الـ HTML
const html = readFileSync("web/index.html", "utf8");
const css = readFileSync("web/style.css", "utf8");
const out = html
  .replace(/<link rel="stylesheet" href="style\.css">/, `<style>\n${css}\n</style>`)
  .replace(/<script type="module" src="app\.js"><\/script>/, `<script>\n${bundle}\n</script>`)
  // مسارات صور الأرواح: نسبيّة من web/ ⇒ اجعلها من جوار الملفّ (يتوقّع مجلّد assets بجانبه)
  .replace(/\.\.\/assets\/spirits\//g, "assets/spirits/");

const OUT = "web/شمس-المعارف.html";
writeFileSync(OUT, out);
const mb = (Buffer.byteLength(out) / 1048576).toFixed(2);
console.log(`كُتب ${OUT}  (${mb} م.ب، ${order.length} وحدة)`);
console.log("انقله مع مجلّد assets/ إن أردت ظهور صور الأرواح.");
