// tools/build-feedback.js — يجمعُ إجابات الناس من مستودع الإجابات ويولّدُ data/feedback-learned.data.js
// الاستعمال:  node tools/build-feedback.js [مسارُ مجلّد مستودع الإجابات]
// الافتراض: المستودعُ مستنسَخٌ بجانب المشروع باسم shams-feedback (عبر GitHub Desktop).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.resolve(process.argv[2] || path.join(ROOT, "..", "..", "shams-feedback"));
const DIR = path.join(SRC, "feedback");
if (!fs.existsSync(DIR)) { console.error(`لا يوجد مجلّد إجابات في ${DIR}`); process.exit(1); }

const files = [];
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (f.name.endsWith(".json")) files.push(p); } })(DIR);

// آخرُ إجابةٍ لكلّ (شخص، شهر، موضوع) هي المعتمدة
const latest = new Map(), people = new Set(), marriage = {};
for (const f of files) {
  let arr; try { arr = JSON.parse(fs.readFileSync(f, "utf8")); } catch { continue; }
  for (const r of Array.isArray(arr) ? arr : [arr]) {
  if (!r || !r.person) continue;
  people.add(r.person);
  if (r.kind === "month") {
    const k = `${r.person}|${r.month}|${r.topic}`;
    if (!latest.has(k) || latest.get(k).at < r.at) latest.set(k, r);
  } else if (r.kind === "marriage") {
    const m = (marriage[r.state] = marriage[r.state] || { right: 0, wrong: 0 });
    r.ok ? m.right++ : m.wrong++;
  }
  }
}

// نفسُ منطق الموقع: «صار» يصدّقُ العائلةَ التي وافق حكمُها حكمَ الشهر، و«لم يصر» يكذّبُها
function weightsOf(recs) {
  const tally = {};
  for (const e of recs) for (const [fam, s] of Object.entries(e.fams || {})) {
    if (!s) continue;
    const t = (tally[fam] = tally[fam] || { hit: 0, miss: 0 });
    const agreed = Math.sign(s) === Math.sign(e.score || 0) || !e.score;
    if (e.ok === agreed) t.hit++; else t.miss++;
  }
  const w = {};
  // للكلّ يُشترَطُ ٢٠ إجابةً على الأقلّ للعائلة قبل أن يتغيّر وزنُها
  for (const [f, t] of Object.entries(tally)) { const n = t.hit + t.miss; if (n >= 20) w[f] = Math.round(Math.max(0.5, Math.min(1.5, 1 + 0.5 * (t.hit - t.miss) / n)) * 100) / 100; }
  return { w, tally };
}
const recs = [...latest.values()];
const all = weightsOf(recs);
const byTopic = {};
for (const t of ["all", "work", "money", "love", "health", "study"]) byTopic[t] = weightsOf(recs.filter((r) => r.topic === t)).w;

const LEARNED = { generated: new Date().toISOString(), answers: recs.length, people: people.size, weights: all.w, tally: all.tally, byTopic, marriage };
const out = `// data/feedback-learned.data.js — يُولَّدُ آليًّا من إجابات الناس (node tools/build-feedback.js). لا تعدّلْه يدويًّا.
// أوزانُ عائلات العارف المتعلَّمة من كلّ الإجابات (٠٫٥–١٫٥)، تُستعمَلُ لمن ليست له إجاباتٌ كافية.
export const LEARNED = ${JSON.stringify(LEARNED, null, 1)};
`;
// لا يُعادُ كتابةُ الملفّ إن لم يتغيّر شيءٌ سوى وقتِ التوليد (فلا تُصنَعُ commits فارغةٌ كلَّ يوم)
const OUT = path.join(ROOT, "data", "feedback-learned.data.js");
const strip = (t) => t.replace(/"generated": "[^"]*"/, "").replace(/generated: null/, "");
const prev = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
if (strip(prev) !== strip(out)) fs.writeFileSync(OUT, out); else console.log("لا جديد في الأوزان");
console.log(`إجابات: ${recs.length} من ${people.size} شخصًا · أوزان: ${JSON.stringify(all.w)} · الزواج: ${JSON.stringify(marriage)}`);
