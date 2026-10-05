// tools/build-feedback.js — يجمعُ إجابات الناس من مستودع الإجابات ويولّدُ data/feedback-learned.data.js
// الاستعمال:  node tools/build-feedback.js [مسارُ مجلّد مستودع الإجابات]
// الافتراض: المستودعُ مستنسَخٌ بجانب المشروع باسم shams-feedback (عبر GitHub Desktop).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.resolve(process.argv[2] || path.join(ROOT, "..", "..", "shams-feedback"));
const DIR = path.join(SRC, "feedback");
// نسخةُ حسابات العارف الحاليّة (من engines/arif.js)
const CUR = (fs.readFileSync(path.join(ROOT, "data", "engine-version.data.js"), "utf8").match(/ENGINE_VER = "([^"]+)"/) || [])[1] || null;
if (!fs.existsSync(DIR)) { console.error(`لا يوجد مجلّد إجابات في ${DIR}`); process.exit(1); }

const files = [];
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (f.name.endsWith(".json")) files.push(p); } })(DIR);

// آخرُ إجابةٍ لكلّ (شخص، نوع، عنصر) هي المعتمدة
const latest = new Map(), people = new Set();
const keyOf = (r) => r.kind === "month" || r.kind === "ask" ? `${r.month}|${r.topic}|${r.q || ""}` : r.kind === "marriage" ? `${r.first}` : `${r.item}`;
for (const f of files) {
  let arr; try { arr = JSON.parse(fs.readFileSync(f, "utf8")); } catch { continue; }
  for (const r of Array.isArray(arr) ? arr : [arr]) {
    if (!r || !r.person || !r.kind) continue;
    people.add(r.person);
    const k = `${r.person}|${r.kind}|${keyOf(r)}`;
    if (!latest.has(k) || latest.get(k).at < r.at) latest.set(k, r);
  }
}
const recs = [...latest.values()];
const kinds = recs.reduce((a, r) => ((a[r.kind] = (a[r.kind] || 0) + 1), a), {});
const wtOf = (e) => (!CUR || e.ver === CUR ? 1 : 0.5);   // الإجاباتُ بحسابات النسخة الحاليّة كاملة، والأقدمُ بنصف وزن
// صوتٌ واحدٌ لكلّ شخص: إجاباتُ الشخص على الطريقة نفسها تُختصَرُ في معدّلٍ واحد (−١…+١)،
// ثمّ يُؤخَذُ معدّلُ الأشخاص — فمَن أجاب ثلاثين مرّةً لا يطغى على مَن أجاب مرّة.
// الحدّ: عددُ الإجابات (min) وعددُ الأشخاص (٥ على الأقلّ) معًا.
const MIN_PEOPLE = 5;
const toW = (tally, min = 20) => {
  const w = {};
  for (const [k, t] of Object.entries(tally)) {
    const ps = Object.values(t.people);
    if (t.n < min || ps.length < MIN_PEOPLE) continue;
    const votes = ps.map((p) => ({ v: (p.hit - p.miss) / (p.hit + p.miss), wt: p.wt / p.n }));
    const sw = votes.reduce((a, x) => a + x.wt, 0);
    const mean = sw ? votes.reduce((a, x) => a + x.v * x.wt, 0) / sw : 0;
    w[k] = Math.round(Math.max(0.5, Math.min(1.5, 1 + 0.5 * mean)) * 100) / 100;
  }
  return w;
};
const bump = (tally, k, hit, wt, person) => {
  const t = (tally[k] = tally[k] || { n: 0, hit: 0, miss: 0, people: {} }); t.n++; hit ? t.hit++ : t.miss++;
  const p = (t.people[person] = t.people[person] || { hit: 0, miss: 0, n: 0, wt: 0 }); p.n++; p.wt += wt; hit ? (p.hit += wt) : (p.miss += wt);
};
const slim = (tally) => Object.fromEntries(Object.entries(tally).map(([k, t]) => [k, { n: t.n, hit: t.hit, miss: t.miss, people: Object.keys(t.people).length }]));

// العارف: «صار» يصدّقُ ما وافق حكمُه حكمَ الشهر؛ والأشهرُ «العاديّة» (|حكمُها| < ٠٫٤٥) لا تُحتسَب
function weightsOf(rs) {
  const tally = {};
  for (const e of rs) {
    if (!Number.isFinite(e.score) || Math.abs(e.score) < 0.45) continue;
    for (const [k, s] of Object.entries({ ...(e.fams || {}), ...(e.meths || {}) })) if (s) bump(tally, k, e.ok === (Math.sign(s) === Math.sign(e.score)), wtOf(e), e.person);
  }
  return { w: toW(tally), tally: slim(tally) };
}
const arifRecs = recs.filter((r) => r.kind === "month" || r.kind === "ask");
const all = weightsOf(arifRecs);
const byTopic = {};
for (const t of ["all", "work", "money", "love", "health", "study"]) byTopic[t] = weightsOf(arifRecs.filter((r) => r.topic === t)).w;

// الزواج: «صح» يصدّقُ الطرقَ التي صنعت نافذةَ الزواج، و«مش صح» يكذّبُها ⇒ marriage:<طريقة>
const marriage = {}, marrTally = {};
for (const e of recs.filter((r) => r.kind === "marriage")) {
  const m = (marriage[e.state] = marriage[e.state] || { right: 0, wrong: 0 }); e.ok ? m.right++ : m.wrong++;
  // مع تاريخ الزواج الحقيقيّ: لكلّ طريقةٍ أصابت (+١) أو أخطأت (−١)؛ وإلّا فالقديم: «صح/مش صح» على طرق النافذة
  if (e.meths && Object.keys(e.meths).length) for (const [k, v] of Object.entries(e.meths)) bump(marrTally, `marriage:${k}`, v > 0, wtOf(e), e.person);
  else for (const k of e.lines || []) bump(marrTally, `marriage:${k}`, e.ok, wtOf(e), e.person);
}
const marriageWeights = toW(marrTally, 10);

// حالك: «فيّ» يصدّقُ كلَّ خطٍّ (كتاب) شهد للصفة، و«مش فيّ» يكذّبُه
const lineTally = {};
for (const e of recs.filter((r) => r.kind === "trait")) for (const [l, v] of Object.entries(e.meths && Object.keys(e.meths).length ? e.meths : Object.fromEntries((e.lines || []).map((x) => [x, e.ok ? 1 : -1])))) bump(lineTally, l, v > 0, wtOf(e), e.person);
const lines = toW(lineTally);

// الكفّ: للتقرير فقط (أيُّ الأبواب يصيبُ)
const palm = {};
for (const e of recs.filter((r) => r.kind === "palm")) { const p = (palm[e.item] = palm[e.item] || { right: 0, wrong: 0 }); e.ok ? p.right++ : p.wrong++; }

const LEARNED = { generated: new Date().toISOString(), engine: CUR, kinds, answers: recs.length, people: people.size, weights: all.w, tally: all.tally, byTopic, marriage, marriageWeights, lines, lineTally: slim(lineTally), palm };
const out = `// data/feedback-learned.data.js — يُولَّدُ آليًّا من إجابات الناس (node tools/build-feedback.js). لا تعدّلْه يدويًّا.
// أوزانُ عائلات العارف المتعلَّمة من كلّ الإجابات (٠٫٥–١٫٥)، تُستعمَلُ لمن ليست له إجاباتٌ كافية.
export const LEARNED = ${JSON.stringify(LEARNED, null, 1)};
`;
// لا يُعادُ كتابةُ الملفّ إن لم يتغيّر شيءٌ سوى وقتِ التوليد (فلا تُصنَعُ commits فارغةٌ كلَّ يوم)
const OUT = path.join(ROOT, "data", "feedback-learned.data.js");
const strip = (t) => t.replace(/"generated": "[^"]*"/, "").replace(/generated: null/, "");
const prev = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
if (strip(prev) !== strip(out)) fs.writeFileSync(OUT, out); else console.log("لا جديد في الأوزان");
console.log(`إجابات: ${recs.length} من ${people.size} شخصًا · ${JSON.stringify(kinds)} · أوزان: ${JSON.stringify(all.w)} · الزواج: ${JSON.stringify(marriageWeights)} · الكتب: ${JSON.stringify(lines)}`);
