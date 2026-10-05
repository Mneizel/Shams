// engines/hal.js
// ─────────────────────────────────────────────────────────────────────────────
// محرّكُ «قراءة الحال»: طبعُ الشخصِ ومزاجُه وانفعالاتُه وما يُتعِبُه — من بطاقتِه وحدَها، بلا سؤال.
//
// الفكرة: عدّةُ «خطوطِ أدلّة» مستقلّة عن الشخصِ نفسِه، وكلُّ كتابٍ يصفُ معنى كلِّ دليلٍ بلغةٍ مشتركة
// (data/hal-traits.data.js)، ثمّ يُدمَج:
//   • صفةٌ يشهدُ لها دليلان مستقلّان أو أكثر ولا يشهدُ أحدٌ لضدّها ⇒ تُقال بثقة.
//   • صفةٌ يشهدُ لها دليلٌ ولضدِّها دليلٌ آخر ⇒ «أحيانًا… وأحيانًا…» (لا يُختارُ أحدُهما ويُهمَلُ الآخر).
//   • صفةٌ لا يشهدُ لها إلّا دليلٌ واحد ⇒ «شهادةٌ منفردة»: تُذكَرُ منفصلةً ولا تُقدَّمُ كأنّها مؤكّدة.
// الأدلّة: (١) مزاجُ الخريطة بطريقةِ Lilly (٢) مزاجُ حروفِ الاسم (شمس المعارف) (٣) دليلُ الأخلاق
// (Lilly ف١٠٨) (٤) برجُ دليلِ الأخلاق (Lilly ف١٠٧) (٥) العقلُ من عطاردَ والقمر (Lilly ف١٠٩).
// الوصفُ: Lilly وابن سينا وشمس المعارف، كلٌّ بنصِّه ومرجعِه. حتميّ: نفسُ البطاقة ⇒ نفسُ القراءة.
// ─────────────────────────────────────────────────────────────────────────────

import falak from "./falak.js";
import abjad from "./abjad.js";
import { TRAITS, TRAIT_GROUPS } from "../data/hal-traits.data.js";
import * as L from "../data/hal-lilly.data.js";
import * as IS from "../data/hal-ibnsina.data.js";
import * as PT from "../data/hal-ptolemy.data.js";
import * as KF from "../data/hal-kashf.data.js";
import ak from "./asma-khuddam.js";
import darj from "./darj.js";
import * as CH from "../data/hal-cheiro.data.js";
import * as TH from "../data/hal-thamara.data.js";
import * as WM from "../data/hal-women.data.js";
import bodyM from "./body.js";
import dalil from "./dalil.js";
import * as AM from "../data/hal-abumashar.data.js";
import * as BR from "../data/hal-biruni.data.js";
import { MIZAJ } from "../data/huruf.data.js";

const SHAMS_SRC = "شمس المعارف الكبرى — مزاجُ الطبعِ الغالبِ في حروفِ الاسم";
// نصوصُ MIZAJ (data/huruf.data.js) مترجَمةً إلى الصفاتِ الموحّدة — بما في النصِّ نفسِه لا أكثر
const SHAMS_MIZAJ_TRAITS = {
  نار: ["anger_quick", "bold", "rash"],                       // حِدّةٌ وسرعةٌ وشجاعةٌ وغضب… ويُذمّ بالطيش
  هواء: ["clever", "eloquent", "changes_opinion"],             // خفّةٌ وذكاءٌ وكلامٌ وتقلّب… ويُذمّ بعدم الثبات
  ماء: ["secretive", "affable", "timid"],                      // لِينٌ وعاطفةٌ وخيالٌ وكِتمان… ويُذمّ بالضعف
  تراب: ["patient", "firm_opinion", "covetous", "slow_decide"], // بطءٌ وثباتٌ وصبرٌ وحرص… ويُذمّ بالجمود
};
const ASPECTS = [0, 60, 90, 120, 180];
const sep = (a, b) => { const d = Math.abs(((a - b) % 360 + 360) % 360); return d > 180 ? 360 - d : d; };
const aspectOrb = (a, b) => { const d = sep(a, b); let best = null; for (const x of ASPECTS) { const o = Math.abs(d - x); if (!best || o < best.orb) best = { angle: x, orb: o }; } return best; };
const QA = { H: "حرارة", C: "برودة", M: "رطوبة", D: "يبوسة" };
const qAr = (q) => q.map((x) => QA[x]).join(" و");

// ── (١) مزاجُ الخريطة: الشهاداتُ الخمس عند Lilly (ف١٠٦) ────────────────
function planetQ(name, sky) {
  if (name === "الشمس") return L.SEASON_QUALITY[sky.planets["الشمس"].sign] || [];
  if (name === "القمر") return moonPhaseQ(sky).q;
  const pq = L.PLANET_QUALITY[name]; if (!pq) return [];
  const ph = (sky.orientalOccidental?.[name]?.phase || "");
  return ph.startsWith("شرقي") ? pq.oriental : pq.occidental;
}
function moonPhaseQ(sky) {
  const el = ((sky.planets["القمر"].longitude - sky.planets["الشمس"].longitude) % 360 + 360) % 360;
  return L.MOON_PHASE_QUALITY.find((p) => el < p.upto);
}
const signQ = (sign) => { const el = falak.SIGNS.find((s) => s.name === sign)?.element; return L.ELEMENT_QUALITY[el] || []; };

export function lillyTemperament(sky, geniture) {
  const T = [];
  const add = (who, q, w, why) => { if (q && q.length) T.push({ who, q, w, why }); };
  const asc = sky.ascendant, ascLon = asc.longitude;
  const lord = asc.signInfo.ruler;
  const lordTriple = geniture && geniture === lord; // صاحبُ المولدِ والطالعِ واحد ⇒ ثلاثةُ أضعاف
  // أوّلًا: برجُ الطالعِ وصاحبُه
  add("برجُ الطالع", signQ(asc.sign), 1, `${asc.sign}`);
  const lp = sky.planets[lord];
  add(`صاحبُ الطالع (${lord})`, planetQ(lord, sky), lordTriple ? 3 : 1, lordTriple ? "وهو صاحبُ المولدِ أيضًا ⇒ ثلاثةُ أضعاف" : (lord === "الشمس" || lord === "القمر" ? "" : sky.orientalOccidental?.[lord]?.phase || ""));
  add(`برجُ صاحبِ الطالع (${lp.sign})`, signQ(lp.sign), lordTriple ? 3 : 1, "");
  // ثانيًا: الكواكبُ في الطالعِ أو الناظرةُ إليه نظرًا تامًّا (≤ ١°)
  const ascHouse = sky.houses?.[0]?.planets || [];
  for (const [n, p] of Object.entries(sky.planets)) {
    const inAsc = ascHouse.includes(n);
    const a = aspectOrb(p.longitude, ascLon);
    if (inAsc || a.orb <= 1) {
      add(`${n} ${inAsc ? "في الطالع" : `ينظرُ الطالعَ (${a.angle}°)`}`, planetQ(n, sky), 1, "");
      add(`برجُ ${n} (${p.sign})`, signQ(p.sign), 1, "");
    }
  }
  // ثالثًا: القمرُ (طورُه وبرجُه) والكواكبُ المتّصلةُ به في نصفِ مجموعِ جرمَيهما
  const moonInAsc = ascHouse.includes("القمر");
  const mph = moonPhaseQ(sky), moon = sky.planets["القمر"];
  add("طورُ القمر", mph.q, moonInAsc ? 2 : 1, mph.ar + (moonInAsc ? " — والقمرُ في الطالعِ ⇒ ضعفان" : ""));
  add(`برجُ القمر (${moon.sign})`, signQ(moon.sign), moonInAsc ? 2 : 1, "");
  for (const [n, p] of Object.entries(sky.planets)) {
    if (n === "القمر") continue;
    const a = aspectOrb(p.longitude, moon.longitude);
    if (a.orb <= (L.MOIETY[n] || 0) + L.MOIETY["القمر"]) {
      add(`${n} يتّصلُ بالقمر (${a.angle}°، فرقُ ${a.orb.toFixed(1)}°)`, planetQ(n, sky), 1, "");
      add(`برجُ ${n} (${p.sign})`, signQ(p.sign), 1, "");
    }
  }
  // رابعًا: فصلُ السنة (برجُ الشمس)
  const sq = L.SEASON_QUALITY[sky.planets["الشمس"].sign];
  add(`فصلُ الميلاد (الشمسُ في ${sky.planets["الشمس"].sign})`, sq, 1, L.SEASON_AR[sq.join("_")]);
  // خامسًا: صاحبُ المولد
  if (geniture && !lordTriple && sky.planets[geniture]) {
    add(`صاحبُ المولد (${geniture})`, planetQ(geniture, sky), 1, "");
    add(`برجُ صاحبِ المولد (${sky.planets[geniture].sign})`, signQ(sky.planets[geniture].sign), 1, "");
  }
  // زحلُ والمريخُ بنظرٍ خبيثٍ إلى الطالعِ أو القمر يُدخِلان كيفيّاتِهما «وإن اتّفقت سائرُ الشهادات»
  for (const n of ["زحل", "المريخ"]) {
    const p = sky.planets[n];
    for (const [tgt, lon, orb] of [["الطالع", ascLon, L.MOIETY[n]], ["القمر", moon.longitude, L.MOIETY[n] + L.MOIETY["القمر"]]]) {
      const a = aspectOrb(p.longitude, lon);
      if (L.MALEFIC_ASPECTS.includes(a.angle) && a.orb <= orb) add(`${n} ينظرُ ${tgt} نظرًا خبيثًا (${a.angle}°)`, planetQ(n, sky), 1, "يُدخِلُ كيفيّتَه وإن اتّفقت سائرُ الشهادات");
    }
  }
  const tally = { H: 0, C: 0, M: 0, D: 0 };
  for (const t of T) for (const q of t.q) tally[q] += t.w;
  return { testimonies: T, tally, ...axes(tally) };
}
// المتضادّاتُ يُسقِطُ بعضُها بعضًا (Lilly)، والباقي يحكم
function axes(tally) {
  const heat = tally.H - tally.C, moist = tally.M - tally.D;
  const heatK = heat > 0 ? "H" : heat < 0 ? "C" : null, moistK = moist > 0 ? "M" : moist < 0 ? "D" : null;
  const complexion = heatK && moistK ? L.COMPLEXION[`${heatK}_${moistK}`] : null;
  return { heat, moist, heatK, moistK, complexion };
}

// ── (٢) مزاجُ حروفِ الاسم (شمس المعارف) ──────────────────────────────
const ELEM_Q = { نار: ["H", "D"], هواء: ["H", "M"], ماء: ["C", "M"], تراب: ["C", "D"] };
export function nameTemperament(name) {
  const a = abjad.analyze(name);
  const counts = a.natureCountBlend || {};
  const tally = { H: 0, C: 0, M: 0, D: 0 };
  for (const [el, n] of Object.entries(counts)) for (const q of ELEM_Q[el] || []) tally[q] += n;
  const sorted = Object.entries(counts).sort((x, y) => y[1] - x[1]);
  const clearDominant = sorted.length && sorted[0][1] > 0 && (!sorted[1] || sorted[0][1] > sorted[1][1]) ? sorted[0][0] : null;
  return { counts, dominant: a.dominantNatureBlend, clearDominant, mizajText: clearDominant ? MIZAJ[clearDominant] : null, tally, ...axes(tally) };
}

// ── (٣) دليلُ الأخلاق (Lilly ف١٠٧) وقوّتُه ─────────────────────────────
function strength(name, sky) {
  const p = sky.planets[name];
  const d = falak.dignities(name, p.longitude);
  const house = (sky.houses || []).find((h) => (h.planets || []).includes(name))?.n;
  const ang = [1, 4, 7, 10].includes(house) ? 3 : [2, 5, 8, 11].includes(house) ? 1 : -2;
  let asp = 0;
  for (const [n, q] of Object.entries(sky.planets)) {
    if (n === name) continue;
    const a = aspectOrb(q.longitude, p.longitude);
    const close = a.orb <= (L.MOIETY[n] || 4) + (L.MOIETY[name] || 4);
    if (!close) continue;
    if ((n === "المشتري" || n === "الزهرة") && [0, 60, 120].includes(a.angle)) asp += 1;
    if ((n === "زحل" || n === "المريخ") && [0, 90, 180].includes(a.angle)) asp -= 2;
  }
  const score = d.score + ang + asp;
  return { score, dignity: d.score, dignities: d.dignities, house, ang, asp, level: score >= 3 ? "strong" : score <= -1 ? "weak" : "middle" };
}
export function mannersSignificator(sky) {
  const ascHouse = sky.houses?.[0]?.planets || [];
  const inAsc = ascHouse.filter((n) => L.PLANET_MANNERS[n]);
  if (inAsc.length) return { planet: inAsc.sort((a, b) => strength(b, sky).score - strength(a, sky).score)[0], why: "كوكبٌ في برجِ الطالع" };
  const moon = sky.planets["القمر"], merc = sky.planets["عطارد"];
  let best = null;
  for (const [n, p] of Object.entries(sky.planets)) {
    if (!L.PLANET_MANNERS[n] || n === "عطارد") continue;
    for (const [tn, t] of [["القمر", moon], ["عطارد", merc]]) {
      const o = sep(p.longitude, t.longitude);
      if (o <= (L.MOIETY[n] || 4) + (L.MOIETY[tn] || 4) && (!best || o < best.o)) best = { planet: n, o, why: `يقارنُ ${tn}` };
    }
  }
  if (best) return { planet: best.planet, why: `كوكبٌ ${best.why}` };
  const lord = sky.ascendant.signInfo.ruler;
  return { planet: L.PLANET_MANNERS[lord] ? lord : null, why: "لا كوكبَ في الطالعِ ولا مقارنًا للقمرِ أو عطارد ⇒ صاحبُ الطالع" };
}

// ── (٥) العقل: عطاردُ والقمر (Lilly ف١٠٩) ─────────────────────────────
function witTestimony(sky) {
  const m = sky.planets["عطارد"], q = sky.planets["القمر"];
  const a = aspectOrb(m.longitude, q.longitude);
  const within = a.orb <= L.MOIETY["عطارد"] + L.MOIETY["القمر"];
  const out = [];
  if (within && a.angle === 0) out.push(L.WIT_RULES.conjunction);
  else if (within && (a.angle === 60 || a.angle === 120)) out.push(L.WIT_RULES.sextile);
  else if (within && (a.angle === 90 || a.angle === 180)) out.push(L.WIT_RULES.square);
  // «لا نظرَ» يُحكَمُ به فقط حين يبعدُ الفرقُ عن الحدِّ بأكثرَ من درجة — على الحدِّ لا يُحكَم
  else if (a.orb > L.MOIETY["عطارد"] + L.MOIETY["القمر"] + 1) out.push(L.WIT_RULES.none);
  if (["الجوزاء", "السنبلة"].includes(m.sign)) out.push(L.WIT_RULES.ownSign);
  const airy = Object.values(sky.planets).filter((p) => falak.SIGNS.find((s) => s.name === p.sign)?.element === "هواء").length;
  if (airy >= 4) out.push(L.WIT_RULES.airy);
  return out;
}

// ── بطليموس م٣ ف١٣: نوعُ برجَي عطاردَ والقمر، وحاكمُ النفس، وحالُ القمر ──
function ptolemySoul(sky) {
  const out = [];
  const modality = (sign) => falak.SIGNS.find((s) => s.name === sign)?.quality;
  const types = [...new Set(["عطارد", "القمر"].map((n) => modality(sky.planets[n].sign)).filter(Boolean))];
  for (const ty of types) { const st = PT.SIGN_TYPE_SOUL[ty]; if (st) out.push({ line: "ptol_signs", text: st.text, traits: st.traits }); }
  // حاكمُ النفس: الكوكبُ الأكثرُ حظوظًا في موضعَي عطاردَ والقمر؛ عند التعادلِ لا يُحكَم
  const totals = {};
  for (const n of ["عطارد", "القمر"]) for (const pl of falak.CHALDEAN) totals[pl] = (totals[pl] || 0) + Math.max(0, falak.dignities(pl, sky.planets[n].longitude).score);
  const ranked = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  let ruler = null, rulerStr = null;
  if (ranked[0][1] > 0 && ranked[0][1] > (ranked[1]?.[1] ?? -1) && PT.RULER_ALONE[ranked[0][0]]) {
    ruler = ranked[0][0]; rulerStr = strength(ruler, sky);
    if (rulerStr.level !== "middle") { // المتوسّطُ لا يُحكَمُ له بشرفٍ ولا بضدِّه
      const side = rulerStr.level === "strong" ? PT.RULER_ALONE[ruler].honour : PT.RULER_ALONE[ruler].dishonour;
      out.push({ line: "ptol_ruler", text: side.text, traits: side.traits });
    }
  }
  const el = ((sky.planets["القمر"].longitude - sky.planets["الشمس"].longitude) % 360 + 360) % 360;
  if (el > 12 && el < 168) out.push({ line: "ptol_moon", ...PT.MOON_STATE.waxing });
  else if (el > 192 && el < 348) out.push({ line: "ptol_moon", ...PT.MOON_STATE.waning });
  return { testimonies: out, ruler, rulerStrength: rulerStr, totals: ranked };
}

// ── الدمج ───────────────────────────────────────────────────────────────
const LINE_AR = { chart: "مزاجُ الخريطة", name: "مزاجُ حروفِ الاسم", manners: "دليلُ الأخلاق", sign: "برجُ دليلِ الأخلاق", wit: "عطاردُ والقمر", ptol_signs: "بروجُ عطاردَ والقمر", ptol_ruler: "حاكمُ النفس", ptol_moon: "حالُ القمر", am_asc: "طالعُ المولد (أبو معشر)", name_sign: "برجُ الاسم (كشف المكتوم)", asc_degree: "درجةُ الطالع (كتاب الدرج)", birth_number: "رقمُ يوم الميلاد (Cheiro)", th_social: "الطالعُ وصاحبُه (الثمرة)", th_merc: "عطاردُ في بُرجَي زحلَ أو المريخ (الثمرة)", dalil: "مرتبةُ الطالع (دليل الحيران)" };
// خطوطٌ مأخوذةٌ من مدخلٍ واحد تُعَدُّ عائلةً واحدة: برجُ الاسمِ ومزاجُ حروفِه كلاهما من الاسم، فلا يؤكّدان صفةً وحدَهما
// وطبعُ برجِ الطالع (أبو معشر) ودرجةُ الطالع (كتاب الدرج) كلاهما من الطالع
const FAMILY = { dalil: "name", name_sign: "name", am_asc: "asc", asc_degree: "asc", th_social: "asc", th_merc: "ptol_signs" };
// مصادرُ ثانويّة (متأخّرة): تشهدُ وتؤيّد، لكنّ اعتراضَها وحدَها لا يقلبُ صفةً اتّفق عليها دليلان أصليّان إلى «أحيانًا»
const SECONDARY = new Set(["name_sign", "birth_number", "dalil"]);

/** رقمُ الميلاد عند Cheiro: يومُ الشهر (المحلّيّ) مجموعًا حتّى رقمٍ واحد */
export function birthNumber(day) {
  let n = Math.trunc(day);
  while (n > 9) n = String(n).split("").reduce((a, d) => a + +d, 0);
  return n >= 1 && n <= 9 ? n : null;
}

/** @param c {name, mother, birth:Date (UTC), lat, lon} */
export function reading(c) {
  if (!c || !c.name || !c.birth) throw new Error("قراءةُ الحالِ تحتاجُ الاسمَ وتاريخَ الميلادِ ووقتَه ومكانَه");
  const sky = falak.snapshot(c.birth, c.lat, c.lon);
  let geniture = null; try { geniture = falak.almuten(c.birth, c.lat, c.lon).planet; } catch {}
  const chart = lillyTemperament(sky, geniture);
  const nm = nameTemperament(c.name);
  const sig = mannersSignificator(sky);
  const sigStr = sig.planet ? strength(sig.planet, sky) : null;

  // الشهاداتُ على الصفات: traitId ⇒ [{line, src, text}]
  const ev = {};
  const testify = (line, src, text, traits) => { for (const t of traits || []) (ev[t] = ev[t] || []).push({ line, src, text }); };
  const fromQualities = (line, ax) => {
    if (ax.heatK) testify(line, IS.IBNSINA_SRC, IS.SOUL_SIGNS[ax.heatK].text, IS.SOUL_SIGNS[ax.heatK].traits);
    if (ax.moistK) testify(line, IS.IBNSINA_SRC, IS.SOUL_SIGNS[ax.moistK].text, IS.SOUL_SIGNS[ax.moistK].traits);
    if (ax.complexion) { const cm = L.COMPLEXION_MANNERS[ax.complexion.key]; testify(line, `${L.LILLY_SRC}، ف١٠٧`, cm.text, cm.traits); }
    if (ax.heatK === "H") { testify(line, IS.IBNSINA_SRC, IS.ACTION_SIGNS.H.text, IS.ACTION_SIGNS.H.traits); testify(line, IS.IBNSINA_SRC, IS.DREAM_SIGNS.H.text, IS.DREAM_SIGNS.H.traits); }
    if (ax.heatK === "C") testify(line, IS.IBNSINA_SRC, IS.DREAM_SIGNS.C.text, IS.DREAM_SIGNS.C.traits);
    if (ax.heatK === "C" && ax.moistK === "M") testify(line, IS.IBNSINA_SRC, IS.SLEEP_SIGNS.moistCold.text, IS.SLEEP_SIGNS.moistCold.traits);
    if (ax.heatK === "H" && ax.moistK === "D") testify(line, IS.IBNSINA_SRC, IS.SLEEP_SIGNS.dryHot.text, IS.SLEEP_SIGNS.dryHot.traits);
  };
  fromQualities("chart", chart);
  fromQualities("name", nm);
  if (nm.clearDominant && SHAMS_MIZAJ_TRAITS[nm.clearDominant]) testify("name", SHAMS_SRC, MIZAJ[nm.clearDominant], SHAMS_MIZAJ_TRAITS[nm.clearDominant]);
  if (sig.planet && sigStr) {
    const pm = L.PLANET_MANNERS[sig.planet];
    const side = sigStr.level === "weak" ? pm.weak : pm.strong; // «متوسّط» يُعامَلُ بالقويّ (Lilly: الكوكبُ الحسنُ الضعيفُ يُظهِرُ الحسن)
    testify("manners", `${L.LILLY_SRC}، ف١٠٨`, side.text, side.traits);
    const sm = L.SIGN_MANNERS[sky.planets[sig.planet].sign];
    if (sm) testify("sign", `${L.LILLY_SRC}، ف١٠٧`, sm.text, sm.traits);
  }
  for (const w of witTestimony(sky)) testify("wit", `${L.LILLY_SRC}، ف١٠٩`, w.text, w.traits);
  // المرأة: «مواليد النساء» عند أبي معشر وبابُ «المرأة» في كشف المكتوم بدلَ أبواب الرجال
  const female = c.sex === "f";
  const am = female ? WM.ASC_NATURE_WOMAN[sky.ascendant.sign] : AM.ASC_NATURE[sky.ascendant.sign];
  const amSrc = female ? `${AM.ABUMASHAR_SRC} — مواليد النساء` : AM.ABUMASHAR_SRC;
  if (am) testify("am_asc", `${amSrc}، ص ${am.page}`, am.text, am.traits);
  // برجُ الاسم بالحساب (كما في بقيّةِ الموقع) ⇒ فصلُ «الرجل» من كشف المكتوم — مصدرٌ ثانويٌّ معاصر
  let nameSign = null;
  if (c.mother) { try { nameSign = ak.reading(c.name, c.mother).sign.name; } catch {} }
  const kf = nameSign && (female ? WM.NAME_SIGN_WOMAN : KF.NAME_SIGN_MAN)[nameSign];
  if (kf) testify("name_sign", `${KF.KASHF_SRC}، ص ${kf.page}`, kf.text, kf.traits);
  // درجةُ الطالع ⇒ «طبعُ الدرجة» في كتاب الدرج
  const degrees = darj.natal(sky);
  const ascDeg = degrees.points[0];
  if (ascDeg.entry && ascDeg.entry.traits) testify("asc_degree", `${darj.SRC}، ${ascDeg.sign} ${ascDeg.n}`, ascDeg.entry.text, ascDeg.entry.traits);
  // رقمُ يوم الميلاد (Cheiro) — يومُ الشهر بالتوقيت المحلّيّ إن أُعطي، وإلّا من التاريخ العالميّ
  const bn = birthNumber(c.birthDay || new Date(c.birth).getUTCDate());
  const cb = bn && CH.BIRTH_NUMBER[bn];
  if (cb) testify("birth_number", `${CH.CHEIRO_SRC}، الرقم ${bn}`, cb.text, cb.traits);
  // الثمرة، الكلمة ٤٧: الطالعُ وموضعُ صاحبِه في البروج الإنسيّة أو لا
  {
    const human = (p) => TH.HUMAN_SIGNS.includes(p.sign) || (p.sign === "القوس" && p.degreeInSign < 15);
    const lord = sky.ascendant.signInfo?.ruler, lp = lord && sky.planets[lord];
    if (lp) {
      const a = human(sky.ascendant), b = human(lp);
      if (a && b) testify("th_social", `${TH.THAMARA_SRC}، الكلمة ٤٧`, TH.K47.human.text, TH.K47.human.traits);
      else if (!a && !b) testify("th_social", `${TH.THAMARA_SRC}، الكلمة ٤٧`, TH.K47.nonhuman.text, TH.K47.nonhuman.traits);
    }
    // الكلمة ٤٠: عطاردُ قويٌّ في ذاته في بُرجَي زحل، أو في بُرجَي المريخ
    const me = sky.planets["عطارد"];
    if (TH.K40.saturn.signs.includes(me.sign) && strength("عطارد", sky).level !== "weak") testify("th_merc", `${TH.THAMARA_SRC}، الكلمة ٤٠`, TH.K40.saturn.text, TH.K40.saturn.traits);
    else if (TH.K40.mars.signs.includes(me.sign)) testify("th_merc", `${TH.THAMARA_SRC}، الكلمة ٤٠`, TH.K40.mars.text, TH.K40.mars.traits);
  }
  // دليل الحيران: مرتبةُ الطالع من الاسم واسم الأمّ (بالأعداد الهجائيّة)
  const dr = c.mother ? dalil.rank(c.name, c.mother, female ? "f" : "m") : null;
  if (dr && dr.traits) testify("dalil", `${dr.src}، المرتبة ${dr.rank} ص${dr.page}`, dr.text, dr.traits);
  const soul = ptolemySoul(sky);
  for (const t of soul.testimonies) testify(t.line, PT.PTOLEMY_SRC, t.text, t.traits);

  // المؤيِّدون (يصفون معنى الكوكبِ نفسِه): يُضافون إلى صفاتٍ شهد لها ذلك الدليلُ أصلًا، ولا يُنشئون صفة
  const corroborate = (line, planet) => {
    const d = planet && BR.PLANET_DISPOSITION[planet]; if (!d) return;
    for (const t of d.traits) if ((ev[t] || []).some((e) => e.line === line)) ev[t].push({ line, src: BR.BIRUNI_SRC, text: d.text, corroborates: true });
  };
  if (sig.planet) corroborate("manners", sig.planet);
  if (soul.ruler) corroborate("ptol_ruler", soul.ruler);

  // الحكمُ على كلِّ صفة
  const lines = (t) => new Set((ev[t] || []).map((e) => e.line));
  // عددُ العائلات الشاهدة، موزونًا بما تعلّمه المحرّكُ عن دقّة كلّ خطّ (c.lineWeights؛ الافتراضُ ١)
  const LW = c.lineWeights || {};
  const fams = (t) => {
    const best = {};
    for (const l of lines(t)) { const f = FAMILY[l] || l; best[f] = Math.max(best[f] ?? 0, LW[l] ?? 1); }
    return { size: Object.values(best).reduce((a, b) => a + b, 0) };
  };
  const primary = (t) => new Set([...lines(t)].filter((l) => !SECONDARY.has(l)).map((l) => FAMILY[l] || l)).size;
  const booksOf = (evs) => [...new Set(evs.map((e) => e.src.split("،")[0]))];
  const AR_ = (id) => (female && WM.TRAITS_F[id]) || TRAITS[id].ar;
  const groups = Object.fromEntries(Object.keys(TRAIT_GROUPS).map((g) => [g, { title: female ? WM.GROUPS_F[g] : TRAIT_GROUPS[g], firm: [], sometimes: [], single: [] }]));
  const done = new Set();
  for (const id of Object.keys(TRAITS)) {
    if (done.has(id) || !ev[id]) continue;
    const t = TRAITS[id], n = fams(id).size;
    const opp = t.opp && ev[t.opp] ? t.opp : null, no = opp ? fams(opp).size : 0;
    const g = groups[t.group];
    // اعتراضٌ ثانويٌّ محض على صفةٍ أكّدها دليلان أصليّان ⇒ تبقى مؤكّدة، ويُسجَّلُ الخلافُ للكشف
    const overrule = (x, y) => primary(x) >= 2 && primary(y) === 0;
    if (opp && (overrule(id, opp) || overrule(opp, id))) {
      const [w, l] = overrule(id, opp) ? [id, opp] : [opp, id];
      done.add(w); done.add(l);
      groups[TRAITS[w].group].firm.push({ id: w, ar: AR_(w), lines: [...lines(w)], books: booksOf(ev[w]), evidence: ev[w], dissent: ev[l] });
    } else if (opp && n >= 1 && no >= 1) {
      done.add(id); done.add(opp);
      const [a, b] = n >= no ? [id, opp] : [opp, id];
      g.sometimes.push({ ids: [a, b], names: { [a]: AR_(a), [b]: AR_(b) }, ar: `أحيانًا ${AR_(a)}، وأحيانًا ${AR_(b)}`, support: { [a]: [...lines(a)], [b]: [...lines(b)] }, evidence: [...ev[a], ...ev[b]] });
    } else if (n >= 2) {
      done.add(id);
      g.firm.push({ id, ar: AR_(id), lines: [...lines(id)], books: booksOf(ev[id]), evidence: ev[id] });
    } else {
      done.add(id);
      g.single.push({ id, ar: AR_(id), lines: [...lines(id)], evidence: ev[id] });
    }
  }
  for (const g of Object.values(groups)) g.firm.sort((a, b) => b.lines.length - a.lines.length);

  // المزاجُ النهائيّ: اتّفاقُ الخريطةِ والاسمِ على كلِّ محور، أو اختلافُهما (مزاجٌ متقلّبٌ على ذلك المحور)
  const axis = (k1, k2) => (k1 && k2 ? (k1 === k2 ? { k: k1, agree: true } : { k: null, mixed: [k1, k2] }) : { k: k1 || k2, agree: false });
  const heatAx = axis(chart.heatK, nm.heatK), moistAx = axis(chart.moistK, nm.moistK);
  const finalComplexion = heatAx.k && moistAx.k ? L.COMPLEXION[`${heatAx.k}_${moistAx.k}`] : null;
  // ما قد يُتعِبُ البدن: من الكيفيّاتِ التي اتّفق عليها الدليلان فقط (ابن سينا: الأمزجةُ العرضيّة)
  const body = [];
  if (heatAx.agree) body.push({ q: heatAx.k, text: IS.EXCESS_SIGNS[heatAx.k] });
  if (moistAx.agree) body.push({ q: moistAx.k, text: IS.EXCESS_SIGNS[moistAx.k] });
  if (am && am.body) body.push({ q: "asc", text: am.body, src: `${AM.ABUMASHAR_SRC}، ص ${am.page}` });

  return {
    temperament: {
      chart: { tally: chart.tally, heat: chart.heat, moist: chart.moist, complexion: chart.complexion, testimonies: chart.testimonies, geniture },
      name: { counts: nm.counts, dominant: nm.dominant, complexion: nm.complexion, mizaj: nm.mizajText, tally: nm.tally },
      final: { heat: heatAx, moist: moistAx, complexion: finalComplexion },
    },
    significator: sig.planet ? { planet: sig.planet, why: sig.why, strength: sigStr } : null,
    nameSign, degrees, bodyForm: bodyM.form(sky), dalil: dr, ailments: bodyM.ailments(sky), birthNumber: cb ? { n: bn, ...cb, src: CH.CHEIRO_SRC } : null,
    soulRuler: soul.ruler ? { planet: soul.ruler, strength: soul.rulerStrength } : null,
    groups, body,
    lineNames: LINE_AR,
    sources: [L.LILLY_SRC, IS.IBNSINA_SRC, PT.PTOLEMY_SRC, AM.ABUMASHAR_SRC, BR.BIRUNI_SRC, SHAMS_SRC, KF.KASHF_SRC, darj.SRC, CH.CHEIRO_SRC, TH.THAMARA_SRC],
    summary: summarize(chart, nm, heatAx, moistAx, finalComplexion, female),
    sex: female ? "f" : "m",
  };
}

function summarize(chart, nm, heatAx, moistAx, fc, female) {
  const parts = [];
  if (chart.complexion) parts.push(`بحسب خريطةِ ميلادِك يغلبُ على مزاجِك ${chart.complexion.qual}، أي المزاجُ ال${chart.complexion.ar}.`);
  else parts.push("خريطةُ ميلادِك متعادلةُ الكيفيّاتِ على أحدِ المحورين، فلا يغلبُ عليها مزاجٌ واحد.");
  const agree = [], mixed = [], tie = [];
  for (const [A, word, k] of [[heatAx, "الحرارةُ والبرودة", nm.heatK], [moistAx, "الرطوبةُ واليبوسة", nm.moistK]]) {
    if (A.agree) agree.push(`ال${QA[A.k]}`);
    else if (A.mixed) mixed.push(`تميلُ إلى ال${QA[A.mixed[1]]} حيث تميلُ الخريطةُ إلى ال${QA[A.mixed[0]]}`);
    else if (!k) tie.push(`تتعادلُ فيها ${word}`);
  }
  const ns = [];
  if (tie.length) ns.push(tie.join("، و"));
  if (agree.length) ns.push(`توافقُ الخريطةَ في ${agree.join(" وفي ")}`);
  if (mixed.length) ns.push(mixed.join("، و") + " — فيكونُ فيك تقلّبٌ في ذلك");
  if (ns.length) parts.push(`أمّا حروفُ اسمِك ف${ns.join("، و")}.`);
  if (heatAx.agree && moistAx.agree && fc) parts.push(`فاتّفق الدليلان على أنّ مزاجَك ${fc.ar}.`);
  const s = parts.join(" ");
  return female ? s.replace(/ميلادِك/g, "ميلادِكِ").replace(/مزاجِك/g, "مزاجِكِ").replace(/اسمِك/g, "اسمِكِ").replace(/فيك /g, "فيكِ ").replace(/مزاجَك/g, "مزاجَكِ") : s;
}

export default { reading, lillyTemperament, nameTemperament, mannersSignificator };
