// engines/arif.js
// ─────────────────────────────────────────────────────────────────────────────
// «العارف بالأمر»: كلُّ العلومِ تحكي معًا. خطٌّ زمنيٌّ شهرًا بشهر (سنةٌ مضت + ٣٦ شهرًا قادمة)، وزبدةٌ عن الشخص
// وجوانبِ حياته، واستنتاجاتٌ مركّبة، وجوابُ سؤال.
//
// «عائلاتُ» الأدلّة (ما كان من مدخلٍ واحدٍ يُعَدُّ صوتًا واحدًا — متوسّطُ أصواتِه):
//   periods  أزمنةُ العمر من الميلاد: الفردارات (الكبرى والصغرى) والانتهاءُ السنويّ
//   sky      مرورُ الكواكب الآن على مواضعِ خريطة الميلاد (المشتري وزحل والمريخ)
//   numbers  علمُ الأرقام (Cheiro): سنواتُ رقمِك وفتراتُه من السنة
//   name     كوكبُ الاسم (الاسم + اسم الأمّ) مقابلَ كوكبِ الشهر (صاحبِ برجِ الشمس فيه)
//   question لحظةُ السؤال (الرمل) — في جواب السؤال فقط
// حتميّ: نفسُ البطاقةِ واليوم ⇒ نفسُ القراءة. لا ذكاءَ اصطناعيّ.
// ─────────────────────────────────────────────────────────────────────────────

import falak from "./falak.js";
import ak from "./asma-khuddam.js";
import hal from "./hal.js";
import life from "./life.js";
import body from "./body.js";
import raml from "./raml.js";
import { birthNumber } from "./hal.js";
import { PLANET_GOVERNS } from "../data/falak-ahkam.data.js";

export const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
export const FAMILIES = { periods: "أزمنةُ العمر", sky: "مرورُ الكواكب", numbers: "علمُ الأرقام", name: "الاسم", question: "لحظةُ السؤال" };
export const TOPICS = { all: "الكلّ", work: "الشغل", money: "المال", love: "الحبّ والعائلة", health: "الصحّة", study: "العلم والسفر" };

const NATURE = { المشتري: 1, الزهرة: 1, زحل: -1, المريخ: -1, الشمس: 0, القمر: 0, عطارد: 0 };
const FRIEND = {
  زحل: ["المشتري", "عطارد"], المشتري: ["الشمس", "الزهرة", "القمر", "زحل"], المريخ: ["الزهرة"],
  الشمس: ["المشتري", "المريخ"], الزهرة: ["المشتري", "المريخ", "عطارد", "القمر"], عطارد: ["زحل", "الزهرة"], القمر: ["المشتري", "الزهرة"],
};
const SIGN_RULER = { الحمل: "المريخ", الثور: "الزهرة", الجوزاء: "عطارد", السرطان: "القمر", الأسد: "الشمس", السنبلة: "عطارد", الميزان: "الزهرة", العقرب: "المريخ", القوس: "المشتري", الجدي: "زحل", الدلو: "زحل", الحوت: "المشتري" };
// Cheiro: الأرقامُ المتوافقة، وفتراتُ كلِّ رقمٍ من السنة [شهر، يوم، شهر، يوم] (الفصول ٣–١١)
const CHEIRO_FRIENDS = { 1: [2, 4, 7], 2: [1, 7], 3: [6, 9], 4: [1, 2, 7, 8], 5: [1, 2, 3, 4, 6, 7, 8, 9], 6: [3, 9], 7: [1, 2], 8: [4], 9: [3, 6] };
const CHEIRO_PERIODS = {
  1: [[7, 21, 8, 28], [3, 21, 4, 28]], 2: [[6, 20, 7, 27]], 3: [[2, 19, 3, 27], [11, 21, 12, 27]], 4: [[6, 21, 8, 31]],
  5: [[5, 21, 6, 27], [8, 21, 9, 27]], 6: [[4, 20, 5, 27], [9, 21, 10, 27]], 7: [[6, 21, 7, 27]], 8: [[12, 21, 2, 26]], 9: [[3, 21, 4, 26], [10, 21, 11, 27]],
};
const reduce = (n) => { while (n > 9) n = String(n).split("").reduce((a, d) => a + +d, 0); return n; };
const inPeriod = (date, [m1, d1, m2, d2]) => {
  const v = (date.getUTCMonth() + 1) * 100 + date.getUTCDate(), a = m1 * 100 + d1, b = m2 * 100 + d2;
  return a <= b ? v >= a && v <= b : v >= a || v <= b;
};
const sepDeg = (a, b) => { const d = Math.abs(((a - b) % 360 + 360) % 360); return d > 180 ? 360 - d : d; };
const aspectOf = (a, b, orb = 5) => {
  const d = sepDeg(a, b);
  for (const [ang, nm] of [[0, "conj"], [60, "sextile"], [90, "square"], [120, "trine"], [180, "opp"]]) if (Math.abs(d - ang) <= orb) return nm;
  return null;
};
const SIGNS = ["الحمل", "الثور", "الجوزاء", "السرطان", "الأسد", "السنبلة", "الميزان", "العقرب", "القوس", "الجدي", "الدلو", "الحوت"];
const signIdx = (lon) => Math.floor((((lon % 360) + 360) % 360) / 30);
const addMonths = (y, m, k) => { const t = y * 12 + m + k; return { y: Math.floor(t / 12), m: ((t % 12) + 12) % 12 }; };

/** المواضعُ الحسّاسةُ في خريطة الميلاد وموضوعاتُها */
function natalPoints(sky) {
  const lot = sky.lots?.lots?.["سهم السعادة"];
  const pts = [
    { key: "asc", ar: "طالعِك", lon: sky.ascendant.longitude, topics: ["all", "health"] },
    { key: "sun", ar: "شمسِك", lon: sky.planets["الشمس"].longitude, topics: ["all", "work"] },
    { key: "moon", ar: "قمرِك", lon: sky.planets["القمر"].longitude, topics: ["all", "love"] },
    { key: "venus", ar: "زهرتِك", lon: sky.planets["الزهرة"].longitude, topics: ["love"] },
  ];
  if (lot) pts.push({ key: "lot", ar: "سهمِ رزقِك", lon: lot.longitude, topics: ["money"] });
  return pts;
}
const HOUSE_TOPIC = { 1: ["all", "health"], 2: ["money"], 4: ["love"], 5: ["love"], 6: ["health"], 7: ["love"], 9: ["study"], 10: ["work"], 11: ["money", "all"], 12: ["health"] };
const HOUSE_PLAIN = {
  jup: { 1: "حضورٌ وثقةٌ وتحسّنٌ في الحال", 2: "مالٌ يدخل", 4: "خيرٌ في البيت والعائلة", 5: "فرحٌ من جهة الأولاد أو العاطفة", 7: "قربٌ ومودّةٌ في العلاقة أو شراكةٌ نافعة", 9: "سفرٌ أو علمٌ نافع", 10: "تقدّمٌ في الشغل", 11: "عونٌ من الأصدقاء", 6: "تحسّنٌ في الصحّة", 12: "فرجٌ بعد ضيق" },
  sat: { 1: "ثقلٌ على النفس والبدن", 2: "ضيقٌ في المال", 4: "همٌّ من جهة البيت أو الأهل", 7: "برودٌ أو تعبٌ في العلاقة", 10: "ضغطٌ وتأخيرٌ في الشغل", 6: "تعبٌ في البدن", 12: "عزلةٌ وهمٌّ خفيّ" },
};

/** أصواتُ شهرٍ واحد */
function monthVoices(ctx, y, m) {
  const date = new Date(Date.UTC(y, m, 15, 12));
  const V = [];
  const push = (fam, s, plain, why, topics = ["all"]) => { if (s !== 0 || plain) V.push({ fam, s, plain, why, topics }); };
  // ١) أزمنةُ العمر
  if (date > ctx.birth) {
    const F = falak.firdaria(ctx.birth, date, { byNight: ctx.byNight });
    const maj = NATURE[F.majorLord] ?? 0, min = NATURE[F.minorLord] ?? 0;
    const sF = Math.max(-1, Math.min(1, 0.45 * maj + 0.55 * min));
    push("periods", sF, sF <= -0.5 ? "تعبٌ وتأخيرٌ في الأمور" : sF >= 0.5 ? "خفّةٌ وتيسيرٌ في الحال" : sF < 0 ? "شيءٌ من الثقل" : sF > 0 ? "شيءٌ من التيسير" : "",
      `الفترةُ الكبرى لـ${F.majorLord} والصغرى لـ${F.minorLord} (${PLANET_GOVERNS[F.minorLord] || ""})`);
    const P = falak.annualProfection(ctx.birth, date, ctx.sky.ascendant.longitude);
    const sP = NATURE[P.yearLord] ?? 0;
    push("periods", sP, sP > 0 ? "السنةُ في صالحك" : sP < 0 ? "السنةُ فيها شدّة" : "", `سنةُ العمر ${P.age} يحكمُها ${P.yearLord} (بيتُ ${P.houseName})`, HOUSE_TOPIC[P.profectedHouse] || ["all"]);
  }
  // ٢) مرورُ الكواكب على الخريطة
  const pos = falak.planetPositions(date);
  const J = pos["المشتري"].longitude, S = pos["زحل"].longitude, M = pos["المريخ"].longitude;
  for (const pt of ctx.points) {
    const aj = aspectOf(J, pt.lon), as = aspectOf(S, pt.lon), am = aspectOf(M, pt.lon, 3);
    if (aj && ["conj", "trine", "sextile"].includes(aj)) push("sky", 1, pt.key === "lot" ? "بابُ رزقٍ ينفتح" : pt.key === "venus" ? "مودّةٌ وقرب" : pt.key === "sun" ? "فرصةٌ أو ظهورٌ في الشغل" : pt.key === "moon" ? "راحةٌ في البيت والنفس" : "بابُ فرصةٍ ينفتح", `المشتري ${({ conj: "يقارن", trine: "يثلّث", sextile: "يسدّس" })[aj]} ${pt.ar}`, pt.topics);
    if (as && ["conj", "square", "opp"].includes(as)) push("sky", -1, pt.key === "lot" ? "ضيقٌ في المال" : pt.key === "venus" ? "برودٌ في العلاقة" : pt.key === "sun" ? "ضغطٌ في الشغل" : pt.key === "moon" ? "همٌّ في النفس أو البيت" : "ثقلٌ وضغط", `زحل ${({ conj: "يقارن", square: "يربّع", opp: "يقابل" })[as]} ${pt.ar}`, pt.topics);
    if (am && ["conj", "square", "opp"].includes(am) && ["asc", "sun", "moon"].includes(pt.key)) push("sky", -0.5, "توتّرٌ وعصبيّة", `المريخ ${({ conj: "يقارن", square: "يربّع", opp: "يقابل" })[am]} ${pt.ar}`, pt.topics);
  }
  const hJ = ((signIdx(J) - ctx.ascIdx + 12) % 12) + 1, hS = ((signIdx(S) - ctx.ascIdx + 12) % 12) + 1;
  if (HOUSE_PLAIN.jup[hJ]) push("sky", 0.5, HOUSE_PLAIN.jup[hJ], `المشتري في بيتِك ${hJ}`, HOUSE_TOPIC[hJ] || ["all"]);
  if (HOUSE_PLAIN.sat[hS]) push("sky", -0.5, HOUSE_PLAIN.sat[hS], `زحل في بيتِك ${hS}`, HOUSE_TOPIC[hS] || ["all"]);
  // ٣) علمُ الأرقام
  if (ctx.bn) {
    const yr = reduce(String(y).split("").reduce((a, d) => a + +d, 0));
    if (yr === ctx.bn) push("numbers", 0.6, "سنةٌ توافقُ رقمَك", `السنة ${y} ⇒ ${yr} = رقمُ ميلادِك`);
    else if ((CHEIRO_FRIENDS[ctx.bn] || []).includes(yr)) push("numbers", 0.3, "", `السنة ${y} ⇒ ${yr} يتوافقُ مع ${ctx.bn}`);
    if ((CHEIRO_PERIODS[ctx.bn] || []).some((p) => inPeriod(date, p))) push("numbers", 0.7, "توفيقٌ في ما تبدؤه", `الشهرُ في «فترة الرقم ${ctx.bn}» عند Cheiro`);
  }
  // ٤) الاسم
  if (ctx.namePlanet) {
    const mr = SIGN_RULER[SIGNS[signIdx(pos["الشمس"].longitude)]];
    const s = mr === ctx.namePlanet ? 0.8 : (FRIEND[ctx.namePlanet] || []).includes(mr) ? 0.4 : -0.4;
    push("name", s, s >= 0.8 ? "الأمورُ تمشي بسهولة" : s < 0 ? "عوائقُ صغيرةٌ مزعجة" : "", `كوكبُ اسمِك ${ctx.namePlanet} وكوكبُ الشهر ${mr}`);
  }
  return V;
}

/** درجةُ الشهر لموضوع: متوسّطُ كلِّ عائلة ثمّ المجموع (والأوزانُ من «صح/غلط» إن وُجدت) */
function scoreFor(V, topic = "all", weights = {}) {
  const fam = {};
  for (const v of V) {
    const w = v.topics.includes(topic) ? 1 : topic === "all" ? 0.5 : (v.topics.includes("all") ? 0.5 : 0);
    if (!w) continue;
    (fam[v.fam] = fam[v.fam] || []).push(v.s * w);
  }
  let total = 0;
  for (const [f, a] of Object.entries(fam)) total += (a.reduce((p, c) => p + c, 0) / a.length) * (weights[f] ?? 1);
  return Math.round(total * 100) / 100;
}
const level = (s) => s >= 1.2 ? "ممتاز" : s >= 0.45 ? "جيّد" : s <= -1.2 ? "صعب" : s <= -0.45 ? "ثقيل" : "عاديّ";
function monthText(V, topic, s) {
  const rel = V.filter((v) => v.plain && (topic === "all" || v.topics.includes(topic) || v.topics.includes("all")));
  const uniq = (a) => [...new Set(a)];
  const pos = uniq(rel.filter((v) => v.s > 0).map((v) => v.plain)), neg = uniq(rel.filter((v) => v.s < 0).map((v) => v.plain));
  const join = (a) => a.length > 1 ? a.slice(0, -1).join("، ") + " و" + a[a.length - 1] : a[0] || "";
  if (pos.length && neg.length) return s >= 0 ? `${join(pos.slice(0, 3))}، مع ${join(neg.slice(0, 2))}.` : `${join(neg.slice(0, 3))}، لكن ${join(pos.slice(0, 2))}.`;
  if (pos.length) return `${join(pos.slice(0, 3))}.`;
  if (neg.length) return `${join(neg.slice(0, 3))}.`;
  return "شهرٌ هادئٌ بلا أحداثٍ كبيرة.";
}
// جرُّ المثنّى بعد «إلى»
const gen = (t) => (t || "").replace(/الكليتان/g, "الكليتين").replace(/المنكبان/g, "المنكبين").replace(/اليدان/g, "اليدين").replace(/الفخذان/g, "الفخذين").replace(/الوركان/g, "الوركين").replace(/الركبتان/g, "الركبتين").replace(/الساقان/g, "الساقين").replace(/القدمان/g, "القدمين").replace(/أسفلُ/g, "أسفلِ").replace(/الرأسُ/g, "الرأسِ").replace(/الرقبةُ/g, "الرقبةِ").replace(/الصدرُ/g, "الصدرِ").replace(/الظهرُ/g, "الظهرِ").replace(/البطنُ/g, "البطنِ").replace(/الأعضاءُ/g, "الأعضاءِ");
const advice = (s) => s >= 0.45 ? "وقتٌ مناسبٌ لتبدأ ما أجّلتَه." : s <= -0.45 ? "لا تبدأ أمرًا كبيرًا هذا الشهر، وأنجزْ ما بين يديك." : "تابعْ ما بدأتَه دون استعجال.";

/** @param c {name, mother, sex, birth, birthDay, lat, lon, now} · opt {weights, past=12, future=36} */
export function timeline(c, opt = {}) {
  const now = c.now ? new Date(c.now) : new Date();
  const sky = falak.snapshot(c.birth, c.lat, c.lon);
  const ctx = {
    birth: new Date(c.birth), sky, byNight: sky.lots?.sect === "ليليّ", points: natalPoints(sky), ascIdx: signIdx(sky.ascendant.longitude),
    bn: birthNumber(c.birthDay || new Date(c.birth).getUTCDate()), namePlanet: c.mother ? ak.reading(c.name, c.mother).planet.name : null,
  };
  const past = opt.past ?? 12, future = opt.future ?? 36;
  const months = [];
  for (let k = -past; k < future; k++) {
    const { y, m } = addMonths(now.getUTCFullYear(), now.getUTCMonth(), k);
    const V = monthVoices(ctx, y, m);
    const scores = Object.fromEntries(Object.keys(TOPICS).map((t) => [t, scoreFor(V, t, opt.weights)]));
    months.push({ k, y, m, label: `${MONTHS[m]} ${y}`, past: k < 0, now: k === 0, voices: V, scores,
      text: Object.fromEntries(Object.keys(TOPICS).map((t) => [t, monthText(V, t, scores[t])])),
      level: Object.fromEntries(Object.keys(TOPICS).map((t) => [t, level(scores[t])])),
      advice: Object.fromEntries(Object.keys(TOPICS).map((t) => [t, advice(scores[t])])) });
  }
  return { months, ctx };
}

// نوافذُ الوقت
function windows(months, topic, from = 0) {
  const fut = months.filter((x) => x.k >= from);
  const avg = (i, n) => fut.slice(i, i + n).reduce((a, x) => a + x.scores[topic], 0) / n;
  let best = { i: 0, v: -9 }, worst = { i: 0, v: 9 };
  for (let i = 0; i + 3 <= fut.length; i++) { const v = avg(i, 3); if (v > best.v) best = { i, v }; if (v < worst.v) worst = { i, v }; }
  // أوّلُ انفراج: أوّلُ شهرٍ قادمٍ يبدأ عنده ثلاثةُ أشهرٍ متوسّطُها جيّد، بعد حالٍ ثقيل
  let relief = null;
  if (avg(0, 2) < 0.3) for (let i = 1; i + 3 <= fut.length; i++) if (avg(i, 3) >= 0.45) { relief = fut[i]; break; }
  // آخرُ الثقل: آخرُ شهرٍ قبل الانفراج
  const heavyUntil = relief ? fut[fut.indexOf(relief) - 1] : null;
  const span = (i) => `${MONTHS[fut[i].m]}${fut[i].y !== fut[i + 2].y ? " " + fut[i].y : ""} – ${MONTHS[fut[i + 2].m]} ${fut[i + 2].y}`;
  return { best: { from: fut[best.i], to: fut[best.i + 2], v: best.v, label: span(best.i) }, worst: { from: fut[worst.i], to: fut[worst.i + 2], v: worst.v, label: span(worst.i) }, relief, heavyUntil, nowAvg: avg(0, 2) };
}

/** نقاطُ التحوّل: تبدّلُ الفترة الكبرى/الصغرى، ودخولُ سنةِ عمرٍ بطبعٍ مختلف، ومرورُ المشتري على الطالع أو الشمس */
function turningPoints(c, ctx, months) {
  const out = [];
  let prev = null;
  for (const mo of months.filter((x) => x.k >= 0)) {
    const d = new Date(Date.UTC(mo.y, mo.m, 15));
    const F = falak.firdaria(ctx.birth, d, { byNight: ctx.byNight });
    if (prev && F.minorLord !== prev.minorLord) {
      const n = NATURE[F.minorLord] ?? 0;
      out.push({ k: mo.k, label: mo.label, text: n > 0 ? "تبدأ فترةٌ ألطفُ وأيسر." : n < 0 ? "تبدأ فترةٌ أشدُّ تحتاجُ صبرًا." : `تبدأ فترةُ ${({ عطارد: "حركةٍ وأوراقٍ وكلام", الشمس: "ظهورٍ ومسؤوليّة", القمر: "تنقّلٍ وتقلّبٍ في الأحوال" })[F.minorLord] || "تغيّر"}.`, why: `الفترةُ الصغرى: ${prev.minorLord} ⇐ ${F.minorLord}` + (F.majorLord !== prev.majorLord ? `، والكبرى: ${prev.majorLord} ⇐ ${F.majorLord}` : "") });
    }
    prev = F;
    const jup = mo.voices.find((v) => v.fam === "sky" && v.s === 1 && /المشتري يقارن (طالعِك|شمسِك)/.test(v.why));
    if (jup && !out.some((o) => o.k === mo.k - 1 && /المشتري/.test(o.why))) out.push({ k: mo.k, label: mo.label, text: "انفراجٌ وبابُ فرصة: من أقوى أشهرِك.", why: jup.why });
  }
  return out.sort((a, b) => a.k - b.k).slice(0, 4);
}

/** الزبدةُ والجوانبُ والاستنتاجات */
export function read(c, opt = {}) {
  const T = timeline(c, opt);
  const { months, ctx } = T;
  const h = hal.reading(c);
  const L = life.all(ctx.sky, c.sex === "f" ? "f" : "m");
  const A = body.ailments(ctx.sky);
  const W = Object.fromEntries(Object.keys(TOPICS).map((t) => [t, windows(months, t)]));
  const f = c.sex === "f";
  const k_ = (mm, ff) => (f ? ff : mm);
  const g = W.all;

  // الحالُ الآن
  const nowLvl = g.nowAvg >= 0.45 ? "good" : g.nowAvg <= -0.45 ? "heavy" : "mid";
  const pills = [
    { cls: nowLvl === "good" ? "saad" : nowLvl === "heavy" ? "nahs" : "", text: nowLvl === "good" ? "الآن: فترةٌ طيّبة" : nowLvl === "heavy" ? "الآن: فترةٌ ثقيلة" : "الآن: فترةٌ وسط" },
  ];
  if (g.relief) pills.push({ cls: "gold", text: `أوّلُ انفراج: ${g.relief.label}` });
  pills.push({ cls: "saad", text: `أفضلُ فترة: ${g.best.label}` });
  let summary = nowLvl === "heavy"
    ? `${k_("أنت", "أنتِ")} الآن في فترةٍ ثقيلة${g.heavyUntil ? ` تمتدُّ حتّى ${g.heavyUntil.label}` : ""}: الأمورُ تتأخّرُ ويكثرُ التعب.${g.relief ? ` من ${g.relief.label} تبدأ بالانفراج تدريجيًّا،` : ""} وأحسنُ ما يمرُّ ${k_("عليك", "عليكِ")} في السنوات الثلاث بين ${g.best.label}.`
    : nowLvl === "good"
    ? `${k_("أنت", "أنتِ")} الآن في فترةٍ طيّبة، فاستفدْ منها. وأحسنُ ما يمرُّ ${k_("عليك", "عليكِ")} في السنوات الثلاث بين ${g.best.label}، وأثقلُ فترةٍ بين ${g.worst.label}.`
    : `${k_("حالُك", "حالُكِ")} الآن وسط. أحسنُ فترةٍ في السنوات الثلاث بين ${g.best.label}، وأثقلُها بين ${g.worst.label}.`;

  // الجوانب
  const pill = (t) => { const v = months.filter((x) => x.k >= 0 && x.k < 12).reduce((a, x) => a + x.scores[t], 0) / 12; return v >= 0.35 ? { cls: "saad", text: "يتحسّن" } : v <= -0.35 ? { cls: "nahs", text: t === "health" ? "انتبه" : "متأخّر" } : { cls: "", text: "وسط" }; };
  const areas = [
    { key: "love", title: "الزواج والعائلة", text: `${L.marriage.spouse[0] ? L.marriage.spouse[0].replace(/^زوجةٌ/, k_("زوجةٌ", "زوجةٌ")) + "؛ " : ""}أحسنُ وقتٍ للارتباط أو لترتيب البيت بين ${W.love.best.label}${W.love.worst.v < -0.45 ? `، والأصعبُ بين ${W.love.worst.label}` : ""}.`, src: "الزواج (بطليموس م٤ ف٥) + مرورُ الكواكب على القمر والزهرة + الأزمنة" },
    { key: "work", title: "الشغل", text: `${k_("يناسبُك", "يناسبُكِ")}: ${L.work.text.split("؛")[0]}. يقوى بين ${W.work.best.label}${W.work.worst.v < -0.45 ? `، ويثقلُ بين ${W.work.worst.label}` : ""}.`, src: "صاحبُ العمل (بطليموس م٤ ف٤) + المرورُ على الشمس والعاشر + الأزمنة" },
    { key: "study", title: "العلم والسفر", text: `أنسبُ وقتٍ لدراسةٍ أو دورةٍ أو سفرٍ نافع بين ${W.study.best.label}.`, src: "المرورُ على البيت التاسع + الأزمنة" },
    { key: "money", title: "المال", text: L.wealth ? `${L.wealth.text}${L.wealth.strong ? "" : "، لكن متأخّرًا"}. أحسنُ وقتٍ للمال بين ${W.money.best.label}${W.money.worst.v < -0.45 ? `، ولا ${k_("تُقرضْ ولا تدخلْ", "تُقرضي ولا تدخلي")} في دَينٍ بين ${W.money.worst.label}` : ""}.` : `أحسنُ وقتٍ للمال بين ${W.money.best.label}.`, src: "سهمُ السعادة وصاحبُه (بطليموس م٤ ف٢) + المرورُ عليه" },
    { key: "health", title: "الصحّة", text: `${k_("انتبهْ", "انتبهي")} إلى ${gen(A.hits[0] ? A.hits[0].part : A.ascPart.part)}، خاصّةً بين ${W.health.worst.label}.`, src: "آفاتُ البدن (بطليموس م٣ ف١٢) + المرورُ على الطالع والسادس" },
  ].map((a) => ({ ...a, pill: pill(a.key) }));

  // الاستنتاجاتُ المركّبة (قواعدُ من الكتب، مكتوبةٌ صراحةً)
  const insights = [];
  const curF = falak.firdaria(ctx.birth, c.now ? new Date(c.now) : new Date(), { byNight: ctx.byNight });
  const hot = h.temperament.chart.heat === "H" || h.temperament.final?.heat?.k === "H";
  const hotPeriod = ["المريخ", "الشمس"].includes(curF.majorLord), coldPeriod = ["زحل", "القمر"].includes(curF.majorLord);
  const angry = Object.values(h.groups).some((gr) => gr.firm.some((x) => x.id === "anger_quick" || x.id === "rash"));
  if (hot && hotPeriod) insights.push({ text: `طبعُ${k_("ك", "كِ")} حارّ${angry ? " سريعُ الغضب" : ""}، والفترةُ التي ${k_("أنت", "أنتِ")} فيها من نفسِ الطبع، فيشتدُّ ${k_("عليك", "عليكِ")} ذلك: أكثرُ ما قد ${k_("يخسّرُك", "يخسّرُكِ")} الآن قرارٌ ${k_("تأخذُه وأنت متضايق", "تأخذينه وأنتِ متضايقة")}.${g.relief ? ` أجّلِ القراراتِ الكبيرةَ إلى ما بعد ${g.relief.label}.` : ""}`, src: `مزاجُ الخريطة (Lilly) + الفترةُ الكبرى لـ${curF.majorLord} — «الطبعُ يشتدُّ إذا وافقه زمانُه» (بطليموس م٤ ف١٠)` });
  else if (hot && coldPeriod) insights.push({ text: `طبعُ${k_("ك", "كِ")} حارّ، والفترةُ التي ${k_("أنت", "أنتِ")} فيها باردةٌ تُهدّئه: وقتٌ مناسبٌ للتأنّي والتخطيط أكثر من الاندفاع.`, src: `مزاجُ الخريطة + الفترةُ الكبرى لـ${curF.majorLord}` });
  else if (!hot && hotPeriod) insights.push({ text: `طبعُ${k_("ك", "كِ")} يميلُ إلى الهدوء، والفترةُ حارّةٌ تدفعُ${k_("ك", "كِ")} إلى الحركة: استغلَّها في ما كان يحتاجُ جرأة.`, src: `مزاجُ الخريطة + الفترةُ الكبرى لـ${curF.majorLord}` });
  if (L.wealth) insights.push({ text: `رزقُ${k_("ك", "كِ")} ${L.wealth.text.replace(/^يأتي المالُ /, "يأتي ")}، وأحسنُ وقتٍ له بين ${W.money.best.label}${/الأصدقاء|الشراكة/.test(L.work.text + (months[0]?.voices.map((v) => v.why).join(" ") || "")) ? "، والأنفعُ مع شريك" : ""}.`, src: "المال (بطليموس م٤ ف٢) + الخطُّ الزمنيّ للمال" });
  if (A.hits[0]) insights.push({ text: `${k_("بدنُك", "بدنُكِ")} أضعفُ في ${gen(A.hits[0].part)}، وأثقلُ فترةٍ عليه بين ${W.health.worst.label}: ${k_("خفّفْ", "خفّفي")} الحِملَ فيها ولا ${k_("تؤجّلْ", "تؤجّلي")} الكشف إن ${k_("أحسستَ", "أحسستِ")} بشيء.`, src: "آفاتُ البدن (بطليموس م٣ ف١٢) + الخطُّ الزمنيّ للصحّة" });

  return { summary, pills, areas, insights, months, windows: W, turning: turningPoints(c, ctx, months), ctx: { namePlanet: ctx.namePlanet, bn: ctx.bn } };
}

/** «اسأل العارف»: الرملُ للحظةِ السؤال + الخطُّ الزمنيّ لموضوعه ⇒ جوابٌ واضحٌ وأنسبُ وقت */
export function ask(c, question, opt = {}) {
  const now = c.now ? new Date(c.now) : new Date();
  const key = falak.classifyAstroTopic(question || "");
  const topic = { زواج: "love", حب: "love", ولد: "love", حمل: "love", رزق: "money", مال: "money", دين: "money", عمل: "work", وظيفة: "work", سلطان: "work", سفر: "study", مرض: "health", شفاء: "health" }[key] || "all";
  const r = raml.reading({ name: c.name, mother: c.mother, question, when: now });
  const T = opt.timeline || timeline(c, opt);
  const W = windows(T.months, topic);
  const rs = r.score ?? 0;
  const tl = T.months.filter((x) => x.k >= 0 && x.k < 12).reduce((a, x) => a + x.scores[topic], 0) / 12;
  const votes = [{ fam: "question", s: rs > 0.5 ? 1 : rs < -0.5 ? -1 : 0, why: `الرمل: ${r.verdict}` }, { fam: "periods+sky", s: tl > 0.3 ? 1 : tl < -0.3 ? -1 : 0, why: `الخطُّ الزمنيّ للموضوع في السنة القادمة: ${level(tl)}` }];
  const sum = votes.reduce((a, v) => a + v.s, 0);
  const big = sum >= 2 ? "يتمّ، والوقتُ في صالحك." : sum === 1 ? "يتمّ، لكن لا تستعجل." : sum === 0 ? "ممكن، لكنّه يحتاجُ وقتًا وصبرًا." : sum === -1 ? "فيه تعثّر، والأولى تأجيلُه." : "الأولى تركُه الآن.";
  const text = `${sum >= 0 ? "الأمرُ يمشي" : "الأمرُ متعثّرٌ الآن"}${r.timing?.text ? `، وأوّلُ ما يظهرُ منه ${r.timing.text.replace("نحوَ", "بعد نحو")}` : ""}. أنسبُ وقتٍ له بين ${W.best.label}${W.worst.v < -0.45 ? `، ${sum >= 0 ? "وتجنّبْ" : "وأسوأُه"} ما بين ${W.worst.label}` : ""}.`;
  return { topic, topicAr: TOPICS[topic], big, text, best: W.best, worst: W.worst, votes, raml: { verdict: r.verdict, figure: r.house?.figure?.ar, house: r.house?.name } };
}

export default { timeline, read, ask, MONTHS, TOPICS, FAMILIES };
