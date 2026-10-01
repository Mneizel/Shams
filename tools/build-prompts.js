// tools/build-prompts.js
// يُنشئ assets/spirits/ ويكتب فيه:
//   PROMPTS.md    — لكل كائن: اسم الملفّ المطلوب + برومبت عربيّ + إنجليزيّ
//   prompts.json  — نفس البيانات للاستهلاك البرمجيّ
//   _placeholders/ — (اختياري) لا شيء؛ المستخدم يضع <slug>.png هنا
//   node tools/build-prompts.js
import { mkdirSync, writeFileSync } from "node:fs";
import art from "../engines/spirit-art.js";
import spirits from "../data/spirits.data.js";
import { PLANETS, SIGNS, MANSIONS } from "../data/falak.data.js";
import { MANSION_ANGELS } from "../data/mansion-angels.data.js";

const OUT = "assets/spirits";
mkdirSync(OUT, { recursive: true });

// ── الأدوار ────────────────────────────────────────────────────────────
const seen = new Set();
const uniq = (e) => { const k = (e.name || e.king); if (seen.has(k)) return false; seen.add(k); return true; };

const CORE = [
  ...spirits.SEVEN_KINGS.map((e) => ({ ...e, tier: "الملوك السبعة" })),
  ...spirits.ARCHANGELS.map((e) => ({ ...e, kind: "angel", tier: "الملائكة الكبار" })),
  ...Object.entries(spirits.PLANET_ANGELS).map(([planet, name]) =>
    ({ name, kind: "angel", planet, domain: `الموكَّل بكوكب ${planet}`, tier: "ملائكة الكواكب" })),
  ...spirits.MARADA.map((e) => ({ ...e, kind: "marid", tier: "المردة والعفاريت" })),
  ...spirits.SONS_OF_IBLIS.map((e) => ({ ...e, kind: "shaytan", domain: e.task, tier: "أبناء إبليس" }))
].filter(uniq);

const OPT_LIGHT = [
  ...Object.entries(PLANETS).map(([name, p]) =>
    ({ name, kind: "planet", color: p.color, domain: p.theme, planet: name, tier: "الكواكب السبعة (زينة)" })),
  ...SIGNS.map((s) =>
    ({ name: s.name, kind: "sign", domain: `${s.element} — ${s.quality}`, planet: s.ruler, tier: "البروج الاثنا عشر (زينة)" }))
];

const OPT_HEAVY = [
  ...MANSIONS.map((m) =>
    ({ name: `منزلة ${m.name}`, kind: "mansion", domain: m.work, tier: "منازل القمر الـ٢٨ (زينة)" })),
  ...MANSION_ANGELS.map((a) =>
    ({ name: a.angel, kind: "angel", domain: `مَلَكُ المنزلة ${a.n}`, tier: "ملائكة المنازل الـ٢٨" }))
];

function rows(list) {
  return list.map((e) => {
    const s = art.slug(e.name || e.king);
    return {
      tier: e.tier,
      name: e.name || e.king,
      file: `${s}.png`,
      ar: art.imagePrompt(e, { lang: "ar" }),
      en: art.imagePrompt(e, { lang: "en" })
    };
  });
}

const core = rows(CORE), light = rows(OPT_LIGHT), heavy = rows(OPT_HEAVY);

// ── PROMPTS.md ────────────────────────────────────────────────────────
function section(title, list) {
  let md = `\n## ${title}  (${list.length})\n`;
  let lastTier = "";
  for (const r of list) {
    if (r.tier !== lastTier) { md += `\n### ${r.tier}\n`; lastTier = r.tier; }
    md += `\n**${r.name}** — \`assets/spirits/${r.file}\`\n\n` +
      `- عربي: ${r.ar}\n` +
      `- EN: ${r.en}\n`;
  }
  return md;
}

const md =
  `# برومبتات صور الأرواح\n\n` +
  `ولّدها: \`node tools/build-prompts.js\`. الأسلوب موحَّد ليتّسق المعرض.\n` +
  `ضع كل صورةٍ مولَّدةٍ باسم الملفّ المذكور في \`assets/spirits/\` فتظهر تلقائيًّا مكان الخَتم.\n` +
  `الصيغة: PNG مربّعة (مثلًا 1024×1024). لا كتابة داخل الصورة.\n\n` +
  `| المجموعة | العدد |\n|---|---|\n` +
  `| أساسيّة (بورتريهات) | ${core.length} |\n` +
  `| زينة خفيفة (كواكب + بروج) | ${light.length} |\n` +
  `| زينة ثقيلة (منازل + ملائكة منازل) | ${heavy.length} |\n` +
  `| **الإجمالي الأقصى** | **${core.length + light.length + heavy.length}** |\n` +
  section("١) الأساسيّة — ابدأ بهذه", core) +
  section("٢) زينة خفيفة — اختياريّة", light) +
  section("٣) زينة ثقيلة — اختياريّة، لاحقًا", heavy);

writeFileSync(`${OUT}/PROMPTS.md`, md);
writeFileSync(`${OUT}/prompts.json`, JSON.stringify({ core, light, heavy }, null, 2));

console.log(`assets/spirits/PROMPTS.md + prompts.json`);
console.log(`أساسيّة: ${core.length} | زينة خفيفة: ${light.length} | زينة ثقيلة: ${heavy.length} | الإجمالي: ${core.length + light.length + heavy.length}`);
