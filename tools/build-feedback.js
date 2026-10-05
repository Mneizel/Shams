// tools/build-feedback.js — يجمعُ إجابات الناس من مستودع الإجابات ويولّدُ data/feedback-learned.data.js
// الاستعمال:  node tools/build-feedback.js [مسارُ مجلّد مستودع الإجابات]
// الافتراض: المستودعُ مستنسَخٌ بجانب المشروع باسم shams-feedback (عبر GitHub Desktop).
//
// الحساباتُ نفسُها التي يستعملُها الموقع (engines/learn.js): صوتٌ لكلّ شخص، والإصابةُ تُقارَنُ بالصدفة،
// والأشهرُ «العاديّة» لا تُحتسَب. ثمّ التقييم: تُعادُ قراءةُ كلّ شخصٍ بالأوزان المتعلَّمة من غيره
// وبلا أوزان، وتُقارَنُ بما صار فعلًا؛ فإن لم تُحسِّنِ الأوزانُ الجديدةُ الإصابةَ لا تُعتمَد.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const imp = (p) => import(pathToFileURL(path.join(ROOT, p)).href);
const L = (await imp("engines/learn.js")).default;
const SRC = path.resolve(process.argv[2] || path.join(ROOT, "..", "..", "shams-feedback"));
const DIR = path.join(SRC, "feedback");
const CUR = (fs.readFileSync(path.join(ROOT, "data", "engine-version.data.js"), "utf8").match(/ENGINE_VER = "([^"]+)"/) || [])[1] || null;
if (!fs.existsSync(DIR)) { console.error(`لا يوجد مجلّد إجابات في ${DIR}`); process.exit(1); }

const files = [];
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (f.name.endsWith(".json")) files.push(p); } })(DIR);

// آخرُ إجابةٍ لكلّ (شخص، نوع، عنصر) هي المعتمدة
const latest = new Map(), people = new Set();
const keyOf = (r) => r.kind === "month" || r.kind === "ask" ? `${r.month}|${r.topic}|${r.q || ""}|${r.item || ""}` : r.kind === "marriage" ? `${r.first}` : `${r.item}`;
for (const f of files) {
  let arr; try { arr = JSON.parse(fs.readFileSync(f, "utf8")); } catch { continue; }
  for (const r of Array.isArray(arr) ? arr : [arr]) {
    if (!r || !r.person || !r.kind) continue;
    if (typeof r.score === "string" && r.score !== "") r.score = +r.score;
    people.add(r.person);
    const k = `${r.person}|${r.kind}|${keyOf(r)}`;
    if (!latest.has(k) || latest.get(k).at < r.at) latest.set(k, r);
  }
}
const recs = [...latest.values()];
const kinds = recs.reduce((a, r) => ((a[r.kind] = (a[r.kind] || 0) + 1), a), {});
const wtOf = (e) => (!CUR || e.ver === CUR ? 1 : 0.5);   // إجاباتُ النسخة الحاليّة كاملة، والأقدمُ بنصف وزن
const arifRecs = recs.filter((r) => r.kind === "month" || r.kind === "ask");
const rate = L.okRate(arifRecs);

/** كلُّ الأوزان من مجموعةِ إجابات (تُستعمَلُ أيضًا في التقييم بإسقاط شخص) */
function learnFrom(rs) {
  const ar = rs.filter((r) => r.kind === "month" || r.kind === "ask");
  const t = L.arifTally(ar, { rate: L.okRate(ar), wtOf });
  const all = L.toWeights(t);
  const weights = {}, byTopic = { all: {}, work: {}, money: {}, love: {}, health: {}, study: {} };
  for (const [k, v] of Object.entries(all)) { const m = /^(\w+)\|(.+)$/.exec(k); if (m && byTopic[m[1]]) byTopic[m[1]][m[2]] = v; else weights[k] = v; }
  return { weights, byTopic, tally: t, marriageWeights: L.toWeights(L.marriageTally(rs, { wtOf }), { min: 10, minPeople: 5 }), lines: L.toWeights(L.lineTally(rs, { wtOf })) };
}
const W = learnFrom(recs);

// الزواجُ والكفّ (للتقرير)
const marriage = {}, palm = {};
for (const e of recs.filter((r) => r.kind === "marriage")) { const m = (marriage[e.state] = marriage[e.state] || { right: 0, wrong: 0 }); e.ok ? m.right++ : m.wrong++; }
for (const e of recs.filter((r) => r.kind === "palm")) { const p = (palm[e.item] = palm[e.item] || { right: 0, wrong: 0 }); e.ok ? p.right++ : p.wrong++; }

// ── التقييم: هل تُحسِّنُ الأوزانُ الإصابة؟ (لكلّ شخصٍ أوزانٌ تعلّمناها من غيره)
async function evaluate() {
  const arif = (await imp("engines/arif.js")).default;
  const { CITY_INDEX, tzOffsetAt } = await imp("web/cities.data.js");
  const byPerson = {};
  for (const r of arifRecs.filter((x) => x.kind === "month" && !x.item && x.date && x.time && x.city && L.counted(x))) (byPerson[r.person] = byPerson[r.person] || []).push(r);
  let n = 0, before = 0, after = 0, persons = 0;
  for (const [pid, rs] of Object.entries(byPerson).slice(0, 300)) {
    const loc = CITY_INDEX[rs[0].city]; if (!loc) continue;
    const [y, mo, d] = rs[0].date.split("-").map(Number), [hh, mm] = rs[0].time.split(":").map(Number);
    const tz = (loc.zone && tzOffsetAt(loc.zone, y, mo, d, hh, mm)) ?? loc.tz ?? 0;
    const birth = new Date(Date.UTC(y, mo - 1, d, hh - Math.trunc(tz), mm - Math.round((tz % 1) * 60)));
    const now = new Date(rs.map((r) => r.at).sort().at(-1));
    const c = { name: rs[0].name, mother: rs[0].mother, sex: rs[0].sex === "f" ? "f" : "m", birth, birthDay: d, lat: loc.lat, lon: loc.lon, now };
    const Wx = learnFrom(recs.filter((r) => r.person !== pid));
    const flat = { ...Wx.weights, ...Object.fromEntries(Object.entries(Wx.byTopic).flatMap(([t, ws]) => Object.entries(ws).map(([k, v]) => [`${t}|${k}`, v]))) };
    if (!Object.keys(flat).length) continue;
    let R0, R1;
    try { R0 = arif.read(c, { weights: {} }); R1 = arif.read(c, { weights: flat }); } catch { continue; }
    persons++;
    for (const r of rs) {
      const [ry, rm] = r.month.split("-").map(Number);
      const i = R0.months.findIndex((m) => m.y === ry && m.m === rm - 1); if (i < 0) continue;
      const s0 = R0.months[i].scores[r.topic], s1 = R1.months[i].scores[r.topic];
      if (Math.abs(s0) < L.STRONG) continue;
      n++; before += r.ok ? 1 : 0;
      // إن انقلب الحكمُ بالأوزان فما صدّقه الشخصُ يصيرُ خطأً والعكس؛ وإن صار «عاديًّا» فنصفُ إصابة
      after += Math.abs(s1) < L.STRONG ? 0.5 : Math.sign(s1) === Math.sign(s0) ? (r.ok ? 1 : 0) : (r.ok ? 0 : 1);
    }
  }
  return n ? { answers: n, people: persons, before: Math.round((before / n) * 1000) / 10, after: Math.round((after / n) * 1000) / 10 } : null;
}
const evalRes = await evaluate().catch((e) => ({ error: String(e).slice(0, 200) }));

// الأوزانُ الجديدةُ تُعتمَدُ فقط إن لم تُنقِصِ الإصابة (أو لم تتوفّرْ إجاباتٌ كافيةٌ للتقييم بعد)
const OUT = path.join(ROOT, "data", "feedback-learned.data.js");
const prevTxt = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
let prevW = null; try { prevW = JSON.parse((prevTxt.match(/export const LEARNED = ([\s\S]*);\s*$/) || [])[1] || "null"); } catch {}
const rejected = !!(evalRes && !evalRes.error && evalRes.answers >= 30 && evalRes.after < evalRes.before);
const use = rejected && prevW ? { weights: prevW.weights || {}, byTopic: prevW.byTopic || {} } : { weights: W.weights, byTopic: W.byTopic };

const LEARNED = {
  generated: new Date().toISOString(), engine: CUR, kinds, answers: recs.length, people: people.size, okRate: Math.round(rate * 100) / 100,
  weights: use.weights, byTopic: use.byTopic, marriageWeights: W.marriageWeights, lines: W.lines,
  eval: evalRes ? { ...evalRes, rejected } : null,
  tally: L.slim(W.tally), marriage, palm,
};
const out = `// data/feedback-learned.data.js — يُولَّدُ آليًّا من إجابات الناس (node tools/build-feedback.js). لا تعدّلْه يدويًّا.
// أوزانُ العارف وحالك والزواج المتعلَّمة (٠٫٥–١٫٥)، مع تقييمِ الإصابة قبل الأوزان وبعدها.
export const LEARNED = ${JSON.stringify(LEARNED, null, 1)};
`;
// لا يُعادُ كتابةُ الملفّ إن لم يتغيّر شيءٌ سوى وقتِ التوليد (فلا تُصنَعُ commits فارغةٌ كلَّ يوم)
const strip = (t) => t.replace(/"generated": "[^"]*"/, "").replace(/generated: null/, "");
if (strip(prevTxt) !== strip(out)) fs.writeFileSync(OUT, out); else console.log("لا جديد في الأوزان");
console.log(`إجابات: ${recs.length} من ${people.size} شخصًا · ${JSON.stringify(kinds)} · نسبةُ «صار»: ${Math.round(rate * 100)}% · أوزان: ${JSON.stringify(use.weights)} · تقييم: ${JSON.stringify(LEARNED.eval)}${rejected ? " ⇒ لم تُعتمَدِ الأوزانُ الجديدة" : ""}`);
