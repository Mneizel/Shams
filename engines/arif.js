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
import qura from "./qura.js";
import jafr from "./jafr.js";
import * as AE from "../vendor/astronomy-engine.js";
import { birthNumber } from "./hal.js";
import { PLANET_GOVERNS } from "../data/falak-ahkam.data.js";
import { AGES } from "../data/ages-ptolemy.data.js";

export const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
export const FAMILIES = { periods: "أزمنةُ العمر", sky: "مرورُ الكواكب", numbers: "علمُ الأرقام", name: "الاسم", divination: "الرملُ والجفر", question: "لحظةُ السؤال" };
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

/** الكسوفاتُ والخسوفاتُ (غيرُ شبه الظلّيّة) بين تاريخين، بموضعِها من فلك البروج */
export function eclipses(from, to) {
  const out = [];
  try {
    let l = AE.SearchLunarEclipse(from);
    while (l && l.peak.date < to) { if (l.kind !== "penumbral") out.push({ kind: "lunar", date: l.peak.date, lon: falak.planetPositions(l.peak.date)["القمر"].longitude }); l = AE.NextLunarEclipse(l.peak); }
    let g = AE.SearchGlobalSolarEclipse(from);
    while (g && g.peak.date < to) { out.push({ kind: "solar", date: g.peak.date, lon: falak.planetPositions(g.peak.date)["الشمس"].longitude }); g = AE.NextGlobalSolarEclipse(g.peak); }
  } catch {}
  return out;
}

// ── تحويلُ سنة المولد (Lilly، Christian Astrology م٣ «To Judge a Revolution»؛ وهو بابُ أبي معشر في تحاويل السنين) ──
const HOUSE_GOOD = { 1: ["all", "health"], 2: ["money"], 4: ["love"], 5: ["love"], 7: ["love"], 9: ["study"], 10: ["work"], 11: ["money"] };
const HOUSE_GOOD_PLAIN = { 1: "سنةُ عافيةٍ وحضور", 2: "زيادةٌ في المال", 4: "خيرٌ في البيت والعائلة", 5: "فرحٌ بالأولاد أو العاطفة", 7: "خيرٌ في الزواج والشراكة", 9: "سفرٌ أو علمٌ نافع", 10: "تقدّمٌ في الشغل والمنزلة", 11: "عونٌ من الأصدقاء ونيلُ أمنية" };
const HOUSE_BAD_PLAIN = { 1: "تعبٌ في البدن", 2: "نقصٌ في المال", 4: "همٌّ في البيت", 6: "مرضٌ أو تعب", 7: "خصامٌ في الزواج أو الشراكة", 8: "خسارةٌ أو خوف", 10: "عثرةٌ في الشغل", 12: "همومٌ خفيّةٌ وأعداء" };
const HOUSE_BAD_TOPIC = { 1: ["all", "health"], 2: ["money"], 4: ["love"], 6: ["health"], 7: ["love"], 8: ["money", "health"], 10: ["work"], 12: ["all", "health"] };
/** خرائطُ التحويل: لحظةُ عودةِ الشمس إلى موضعِها في الميلاد كلَّ سنة، وأحكامُ Lilly عليها */
export function revolutions(c, natal, fromYear, toYear) {
  const sunL = natal.planets["الشمس"].longitude, ascIdx = signIdx(natal.ascendant.longitude);
  const out = [];
  for (let y = fromYear; y <= toYear; y++) {
    let t;
    try { t = AE.SearchSunLongitude(sunL, new Date(Date.UTC(y, new Date(c.birth).getUTCMonth(), new Date(c.birth).getUTCDate() - 8)), 20); } catch { t = null; }
    if (!t) continue;
    // التحويلُ على مكانِ السكن إن أُعطي (Lilly يحسبُه على البلدِ الذي يكونُ فيه صاحبُ المولد)، وإلّا مكانُ الميلاد
    const when = t.date, rev = falak.snapshot(when, c.resLat ?? c.lat, c.resLon ?? c.lon);
    const rA = signIdx(rev.ascendant.longitude);
    const natalHouseOfRevAsc = ((rA - ascIdx + 12) % 12) + 1;
    const V = [];
    const add = (s, plain, why, topics = ["all"]) => V.push({ s, plain, why, topics });
    // ١) طالعُ التحويل بالنسبة إلى طالع الميلاد
    if (natalHouseOfRevAsc === 1) add(1, "سنةُ عافيةٍ ونجاحٍ في المساعي", "طالعُ التحويل هو طالعُ الميلاد نفسُه", ["all", "health"]);
    else if ([6, 8, 12].includes(natalHouseOfRevAsc)) add(-1, natalHouseOfRevAsc === 8 ? "يُخافُ فيها خسارةٌ أو خوف" : "يُخافُ فيها مرضٌ أو ضعفٌ أو عوارض", `طالعُ التحويل يقعُ في البيت ${natalHouseOfRevAsc} من الميلاد`, ["all", "health"]);
    else if (natalHouseOfRevAsc === 7) add(-0.5, "خصوماتٌ، ورغبةٌ في الزواج أو زواج", "طالعُ التحويل هو سابعُ الميلاد", ["love"]);
    else if ([4, 10].includes(natalHouseOfRevAsc)) add(-0.5, natalHouseOfRevAsc === 4 ? "همٌّ أو عناءٌ من جهة البيت والأهل" : "عناءٌ أو عثرةٌ في الشغل", `طالعُ التحويل مربّعٌ لطالع الميلاد (البيت ${natalHouseOfRevAsc})`, HOUSE_BAD_TOPIC[natalHouseOfRevAsc] || ["all"]);
    // ٢) طالعُ التحويل على مواضعِ النحسين في الميلاد
    for (const mal of ["زحل", "المريخ"]) if (signIdx(natal.planets[mal].longitude) === rA) add(-1, "سنةٌ فيها خطرٌ وحذر", `طالعُ التحويل في برجِ ${mal} من الميلاد`, ["all", "health"]);
    // ٣) صاحبُ طالع التحويل محترق
    const lord = SIGN_RULER[SIGNS[rA]], cs = rev.planets[lord] && lord !== "الشمس" ? sepDeg(rev.planets[lord].longitude, rev.planets["الشمس"].longitude) : 99;
    if (cs < 8.5) add(-1, "متاعبُ من جنسِ صاحبِ السنة", `صاحبُ طالعِ التحويل (${lord}) تحت شعاع الشمس`);
    // ٤) المشتري وسهمُ السعادة في بيوت التحويل ⇒ زيادةٌ من جهة ذلك البيت
    const hRev = (lon) => ((signIdx(lon) - rA + 12) % 12) + 1;
    const hJ = hRev(rev.planets["المشتري"].longitude);
    if (HOUSE_GOOD[hJ]) add(1, HOUSE_GOOD_PLAIN[hJ], `المشتري في البيت ${hJ} من التحويل`, HOUSE_GOOD[hJ]);
    const hV = hRev(rev.planets["الزهرة"].longitude);
    if (HOUSE_GOOD[hV] && hV !== hJ) add(0.5, HOUSE_GOOD_PLAIN[hV], `الزهرة في البيت ${hV} من التحويل`, HOUSE_GOOD[hV]);
    for (const mal of ["زحل", "المريخ"]) {
      const hm = hRev(rev.planets[mal].longitude);
      if ([1, 4, 7, 10, 6, 8, 12, 2].includes(hm)) add(mal === "زحل" ? -1 : -0.5, HOUSE_BAD_PLAIN[hm], `${mal} في البيت ${hm} من التحويل`, HOUSE_BAD_TOPIC[hm] || ["all"]);
    }
    out.push({ y, when, asc: SIGNS[rA], natalHouse: natalHouseOfRevAsc, lord, voices: V });
  }
  return out;
}

// ── التسيير (الثمرة، الكلمة ٧٩): «سيّر درجةَ الطالع لأعراض الجسد، ودرجةَ سهم السعادة لذات اليد، ودرجةَ القمر لتصرّف الجسد
// مع النفس، ودرجةَ الشمس لحظوظه من السلطان، ودرجةَ وسط السماء لما يعانيه من الأعمال — لكلّ درجةٍ سنة». يُسيَّرُ الدليلُ درجةً
// لكلّ سنةٍ من العمر، فإذا بلغ موضعَ سعدٍ أو نحسٍ في الميلاد (أو نظرَه) ظهر أثرُه في تلك السنة.
/** وسطُ السماء من الزمن النجميّ المحلّيّ (بالدرجات) وميلِ فلك البروج */
export function midheaven(lstDeg, eps = 23.4393) {
  const r = Math.PI / 180, x = Math.atan2(Math.sin(lstDeg * r), Math.cos(lstDeg * r) * Math.cos(eps * r)) / r;
  return ((x % 360) + 360) % 360;
}
const TASYIR_POINTS = [
  { key: "asc", ar: "الطالع", topics: ["all", "health"], good: "عافيةٌ وقوّةٌ في البدن", bad: "عارضٌ في البدن" },
  { key: "lot", ar: "سهم السعادة", topics: ["money"], good: "زيادةٌ في المال", bad: "نقصٌ أو خسارةٌ في المال" },
  { key: "moon", ar: "القمر", topics: ["all", "love"], good: "راحةٌ في النفس والبيت", bad: "همٌّ في النفس أو البيت" },
  { key: "sun", ar: "الشمس", topics: ["work"], good: "حظوةٌ ورفعةٌ عند أصحاب الأمر", bad: "خصومةٌ مع ذوي السلطان" },
  { key: "mc", ar: "وسط السماء", topics: ["work"], good: "نجاحٌ في الأعمال", bad: "عثرةٌ في الأعمال" },
];
export function tasyir(natal, ageYears) {
  const base = {
    asc: natal.ascendant.longitude, sun: natal.planets["الشمس"].longitude, moon: natal.planets["القمر"].longitude,
    lot: natal.lots?.lots?.["سهم السعادة"]?.longitude, mc: midheaven(natal.ascendant.localSiderealTime ?? 0),
  };
  const out = [];
  for (const pt of TASYIR_POINTS) {
    if (base[pt.key] == null) continue;
    const dir = base[pt.key] + ageYears; // درجةٌ لكلّ سنة
    for (const pr of ["المشتري", "الزهرة", "زحل", "المريخ"]) {
      const asp = aspectOf(dir, natal.planets[pr].longitude, 0.6);
      if (!asp) continue;
      const ben = pr === "المشتري" || pr === "الزهرة";
      const s = ben ? (["conj", "trine", "sextile"].includes(asp) ? 1 : 0.5) : (["conj", "square", "opp"].includes(asp) ? -1 : 0);
      if (!s) continue;
      out.push({ s, plain: s > 0 ? pt.good : pt.bad, why: `تسييرُ ${pt.ar} بلغ ${({ conj: "موضعَ", sextile: "تسديسَ", square: "تربيعَ", trine: "تثليثَ", opp: "مقابلةَ" })[asp]} ${pr} في الميلاد`, topics: pt.topics });
    }
  }
  return out;
}

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
  // عودةُ المشتري وزحل إلى موضعَيهما في الميلاد
  pts.push({ key: "jup", ar: "مشتريك", lon: sky.planets["المشتري"].longitude, topics: ["all"], only: "jup" });
  pts.push({ key: "sat", ar: "زحلِك", lon: sky.planets["زحل"].longitude, topics: ["all"], only: "sat" });
  return pts;
}
const HOUSE_TOPIC = { 1: ["all", "health"], 2: ["money"], 4: ["love"], 5: ["love"], 6: ["health"], 7: ["love"], 9: ["study"], 10: ["work"], 11: ["money", "all"], 12: ["health"] };
const HOUSE_PLAIN = {
  jup: { 1: "حضورٌ وثقةٌ وتحسّنٌ في الحال", 2: "مالٌ يدخل", 4: "خيرٌ في البيت والعائلة", 5: "فرحٌ من جهة الأولاد أو العاطفة", 7: "قربٌ ومودّةٌ في العلاقة أو شراكةٌ نافعة", 9: "سفرٌ أو علمٌ نافع", 10: "تقدّمٌ في الشغل", 11: "عونٌ من الأصدقاء", 6: "تحسّنٌ في الصحّة", 12: "فرجٌ بعد ضيق" },
  sat: { 1: "ثقلٌ على النفس والبدن", 2: "ضيقٌ في المال", 4: "همٌّ من جهة البيت أو الأهل", 7: "برودٌ أو تعبٌ في العلاقة", 10: "ضغطٌ وتأخيرٌ في الشغل", 6: "تعبٌ في البدن", 12: "عزلةٌ وهمٌّ خفيّ" },
};

// التأريخُ بالجُمّل: العددُ حروفًا (٢٠٢٦ ⇒ بغكو)
const ABJ = { 1: "ا", 2: "ب", 3: "ج", 4: "د", 5: "ه", 6: "و", 7: "ز", 8: "ح", 9: "ط", 10: "ي", 20: "ك", 30: "ل", 40: "م", 50: "ن", 60: "س", 70: "ع", 80: "ف", 90: "ص", 100: "ق", 200: "ر", 300: "ش", 400: "ت", 500: "ث", 600: "خ", 700: "ذ", 800: "ض", 900: "ظ" };
export function abjadDate(n) {
  const th = Math.floor(n / 1000), h = Math.floor((n % 1000) / 100) * 100, t = Math.floor((n % 100) / 10) * 10, u = n % 10;
  return (th ? (th > 1 ? ABJ[th] : "") + "غ" : "") + (h ? ABJ[h] : "") + (t ? ABJ[t] : "") + (u ? ABJ[u] : "");
}

// حالُ الكوكب في خريطة الميلاد (Lilly: «if the Lord … be well dignified»): قويٌّ بالحظوظ ⇒ يُحسِن، ضعيفٌ بالوبال والهبوط ⇒ يُسيء
const natalDig = (ctx, planet) => { const p = ctx.sky.planets[planet]; if (!p) return 0; const d = falak.dignities(planet, p.longitude); return d.score >= 3 ? 0.4 : d.score < 0 ? -0.4 : 0; };

/** أصواتُ شهرٍ واحد */
function monthVoices(ctx, y, m) {
  const date = new Date(Date.UTC(y, m, 15, 12));
  const V = [];
  const push = (fam, s, plain, why, topics = ["all"], meth = fam) => { if (s !== 0 || plain) V.push({ fam, meth, s, plain, why, topics }); };
  // ١) أزمنةُ العمر
  if (date > ctx.birth) {
    const F = falak.firdaria(ctx.birth, date, { byNight: ctx.byNight });
    const maj = (NATURE[F.majorLord] ?? 0) + natalDig(ctx, F.majorLord), min = (NATURE[F.minorLord] ?? 0) + natalDig(ctx, F.minorLord);
    const sF = Math.max(-1, Math.min(1, 0.45 * maj + 0.55 * min));
    push("periods", sF, sF <= -0.5 ? "تعبٌ وتأخيرٌ في الأمور" : sF >= 0.5 ? "خفّةٌ وتيسيرٌ في الحال" : sF < 0 ? "شيءٌ من الثقل" : sF > 0 ? "شيءٌ من التيسير" : "",
      `الفترةُ الكبرى لـ${F.majorLord} والصغرى لـ${F.minorLord} (${PLANET_GOVERNS[F.minorLord] || ""})`, ["all"], "firdaria");
    const P = falak.annualProfection(ctx.birth, date, ctx.sky.ascendant.longitude);
    const dP = natalDig(ctx, P.yearLord);
    const sP = Math.max(-1, Math.min(1, (NATURE[P.yearLord] ?? 0) + dP));
    push("periods", sP, sP > 0 ? "السنةُ في صالحك" : sP < 0 ? "السنةُ فيها شدّة" : "", `سنةُ العمر ${P.age} يحكمُها ${P.yearLord} (بيتُ ${P.houseName})${dP > 0 ? "، وهو قويٌّ في ميلادِك" : dP < 0 ? "، وهو ضعيفٌ في ميلادِك" : ""}`, HOUSE_TOPIC[P.profectedHouse] || ["all"], "profection");
  }
  // ١أ) التسيير: درجةٌ لكلِّ سنةٍ من العمر
  if (date > ctx.birth) for (const v of tasyir(ctx.sky, (date - ctx.birth) / (365.2422 * 86400000))) push("periods", v.s, v.plain, v.why, v.topics, "tasyir");
  // ١ب) تحويلُ السنة التي يقعُ فيها هذا الشهر
  const rv = [...ctx.revs].reverse().find((r) => r.when <= date);
  if (rv) for (const v of rv.voices) push("periods", v.s, v.plain, `تحويلُ سنة ${rv.y}: ${v.why}`, v.topics, "revolution");
  // ٢) مرورُ الكواكب على الخريطة
  const pos = falak.planetPositions(date);
  const J = pos["المشتري"].longitude, S = pos["زحل"].longitude, M = pos["المريخ"].longitude;
  for (const pt of ctx.points) {
    if (pt.only === "jup") { if (aspectOf(J, pt.lon) === "conj") push("sky", 1, "بدايةُ دورةِ خيرٍ جديدة", "المشتري يعودُ إلى موضعِه في ميلادِك", pt.topics); continue; }
    if (pt.only === "sat") { if (aspectOf(S, pt.lon) === "conj") push("sky", -1, "مرحلةُ مراجعةٍ وثقلٍ ومسؤوليّة", "زحل يعودُ إلى موضعِه في ميلادِك", pt.topics); continue; }
    const aj = aspectOf(J, pt.lon), as = aspectOf(S, pt.lon), am = aspectOf(M, pt.lon, 3);
    if (aj && ["conj", "trine", "sextile"].includes(aj)) push("sky", 1, pt.key === "lot" ? "بابُ رزقٍ ينفتح" : pt.key === "venus" ? "مودّةٌ وقرب" : pt.key === "sun" ? "فرصةٌ أو ظهورٌ في الشغل" : pt.key === "moon" ? "راحةٌ في البيت والنفس" : "بابُ فرصةٍ ينفتح", `المشتري ${({ conj: "يقارن", trine: "يثلّث", sextile: "يسدّس" })[aj]} ${pt.ar}`, pt.topics);
    if (as && ["conj", "square", "opp"].includes(as)) push("sky", -1, pt.key === "lot" ? "ضيقٌ في المال" : pt.key === "venus" ? "برودٌ في العلاقة" : pt.key === "sun" ? "ضغطٌ في الشغل" : pt.key === "moon" ? "همٌّ في النفس أو البيت" : "ثقلٌ وضغط", `زحل ${({ conj: "يقارن", square: "يربّع", opp: "يقابل" })[as]} ${pt.ar}`, pt.topics);
    if (am && ["conj", "square", "opp"].includes(am) && ["asc", "sun", "moon"].includes(pt.key)) push("sky", -0.5, "توتّرٌ وعصبيّة", `المريخ ${({ conj: "يقارن", square: "يربّع", opp: "يقابل" })[am]} ${pt.ar}`, pt.topics);
  }
  // الكسوف: الشهرُ الذي يقعُ فيه وشهران بعده
  for (const e of ctx.eclipses) {
    const dm = (y * 12 + m) - (e.date.getUTCFullYear() * 12 + e.date.getUTCMonth());
    if (dm < 0 || dm > 2) continue;
    for (const pt of ctx.points.filter((q) => ["asc", "sun", "moon"].includes(q.key))) {
      const asp = aspectOf(e.lon, pt.lon, 5);
      if (asp === "conj" || asp === "opp") push("sky", -1, "تغيّرٌ مفاجئٌ أو انقلابٌ في أمر", `${e.kind === "solar" ? "كسوفٌ للشمس" : "خسوفٌ للقمر"} ${asp === "conj" ? "على" : "مقابلَ"} ${pt.ar} (${e.date.toISOString().slice(0, 10)})`, pt.topics, "eclipse");
    }
  }
  const hJ = ((signIdx(J) - ctx.ascIdx + 12) % 12) + 1, hS = ((signIdx(S) - ctx.ascIdx + 12) % 12) + 1;
  if (HOUSE_PLAIN.jup[hJ]) push("sky", 0.5, HOUSE_PLAIN.jup[hJ], `المشتري في بيتِك ${hJ}`, HOUSE_TOPIC[hJ] || ["all"], "house");
  if (HOUSE_PLAIN.sat[hS]) push("sky", -0.5, HOUSE_PLAIN.sat[hS], `زحل في بيتِك ${hS}`, HOUSE_TOPIC[hS] || ["all"], "house");
  // ٢ب) الرملُ والجفر: «طالعُ الشهر» — ضربُ الرمل لأوّلِ الشهر، والجفرُ لاسمِ الشهرِ وسنتِه بالجُمّل (عائلةٌ واحدة)
  if (ctx.name && ctx.mother) {
    const first = new Date(Date.UTC(y, m, 1, 12));
    const ask0 = `كيف يكون حالي في ${MONTHS[m]} ${abjadDate(y)}`;
    try {
      const rr = raml.reading({ name: ctx.name, mother: ctx.mother, question: ask0, when: first });
      const s = (rr.score ?? 0) > 0.5 ? 1 : (rr.score ?? 0) < -0.5 ? -1 : 0;
      if (s) push("divination", s, s > 0 ? "تيسيرٌ وقبول" : "تعسّرٌ وتعطيل", `الرمل لأوّلِ الشهر: ${rr.house?.figure?.ar || ""} — ${rr.verdict}`, ["all"], "raml");
    } catch {}
    try {
      const jj = jafr.extractAnswer(ask0, { name: ctx.name, mother: ctx.mother });
      const s = jj?.verdict?.direction === "نعم" ? 0.8 : jj?.verdict?.direction === "لا" ? -0.8 : 0;
      if (s) push("divination", s, s > 0 ? "الأمورُ تنفتح" : "الأمورُ تنغلقُ قليلًا", `الجفر («${ask0}»): ${jj.verdict.text}`, ["all"], "jafr");
    } catch {}
  }
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
    const f = (fam[v.fam] = fam[v.fam] || {}); (f[v.meth || v.fam] = f[v.meth || v.fam] || []).push(v.s * w);
  }
  const avg = (a) => a.reduce((p, c) => p + c, 0) / a.length;
  let total = 0;
  for (const [f, meths] of Object.entries(fam)) total += avg(Object.values(meths).map(avg)) * (weights[f] ?? 1);
  return Math.round(total * 100) / 100;
}
const level = (s) => s >= 1.2 ? "ممتاز" : s >= 0.45 ? "جيّد" : s <= -1.2 ? "صعب" : s <= -0.45 ? "ثقيل" : "عاديّ";
function monthText(V, topic, s) {
  // ما يخصُّ الشهرَ نفسَه أوّلًا (المرور، الكسوف، الأرقام، الاسم)، ومن أحكامِ السنة جملةٌ واحدةٌ فقط (تُذكَرُ كاملةً في «هذه السنة»)
  const rel0 = V.filter((v) => v.plain && (topic === "all" || v.topics.includes(topic) || v.topics.includes("all")));
  const spec = rel0.filter((v) => v.fam !== "periods"), per = rel0.filter((v) => v.fam === "periods").sort((a, b) => Math.abs(b.s) - Math.abs(a.s)).slice(0, 1);
  const rel = spec.length >= 2 ? spec : [...spec, ...per];
  const uniq = (a) => [...new Set(a)];
  const pos = uniq(rel.filter((v) => v.s > 0).map((v) => v.plain)), neg = uniq(rel.filter((v) => v.s < 0).map((v) => v.plain));
  const join = (a) => a.length > 1 ? a.slice(0, -1).join("، ") + " و" + a[a.length - 1] : a[0] || "";
  if (pos.length && neg.length) return s >= 0 ? `${join(pos.slice(0, 3))}، وفيه أيضًا ${join(neg.slice(0, 2))}.` : `${join(neg.slice(0, 3))}، لكن ${join(pos.slice(0, 2))}.`;
  if (pos.length) return `${join(pos.slice(0, 3))}.`;
  if (neg.length) return `${join(neg.slice(0, 3))}.`;
  return "شهرٌ هادئٌ بلا أحداثٍ كبيرة.";
}
// جرُّ المثنّى بعد «إلى»
const gen = (t) => (t || "").replace(/الكليتان/g, "الكليتين").replace(/المنكبان/g, "المنكبين").replace(/اليدان/g, "اليدين").replace(/الفخذان/g, "الفخذين").replace(/الوركان/g, "الوركين").replace(/الركبتان/g, "الركبتين").replace(/الساقان/g, "الساقين").replace(/القدمان/g, "القدمين").replace(/أسفلُ/g, "أسفلِ").replace(/الرأسُ/g, "الرأسِ").replace(/الرقبةُ/g, "الرقبةِ").replace(/الصدرُ/g, "الصدرِ").replace(/الظهرُ/g, "الظهرِ").replace(/البطنُ/g, "البطنِ").replace(/الأعضاءُ/g, "الأعضاءِ");
const advice = (s, f) => s >= 0.45 ? (f ? "وقتٌ مناسبٌ لتبدئي ما أجّلتِه." : "وقتٌ مناسبٌ لتبدأ ما أجّلتَه.") : s <= -0.45 ? (f ? "لا تبدئي أمرًا كبيرًا هذا الشهر، وأنجزي ما بين يديكِ." : "لا تبدأ أمرًا كبيرًا هذا الشهر، وأنجزْ ما بين يديك.") : (f ? "تابعي ما بدأتِه دون استعجال." : "تابعْ ما بدأتَه دون استعجال.");

/** @param c {name, mother, sex, birth, birthDay, lat, lon, now} · opt {weights, past=12, future=36} */
export function timeline(c, opt = {}) {
  const now = c.now ? new Date(c.now) : new Date();
  const sky = falak.snapshot(c.birth, c.lat, c.lon);
  const ctx = {
    birth: new Date(c.birth), sky, byNight: sky.lots?.sect === "ليليّ", points: natalPoints(sky), ascIdx: signIdx(sky.ascendant.longitude),
    name: c.name, mother: c.mother, bn: birthNumber(c.birthDay || new Date(c.birth).getUTCDate()), namePlanet: c.mother ? ak.reading(c.name, c.mother).planet.name : null,
  };
  const past = opt.past ?? 12, future = opt.future ?? 36;
  ctx.revs = revolutions(c, sky, now.getUTCFullYear() - Math.ceil(past / 12) - 1, now.getUTCFullYear() + Math.ceil(future / 12) + 1);
  ctx.eclipses = eclipses(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - past - 3, 1)), new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + future, 1)));
  const months = [];
  for (let k = -past; k < future; k++) {
    const { y, m } = addMonths(now.getUTCFullYear(), now.getUTCMonth(), k);
    const V = monthVoices(ctx, y, m);
    const scores = Object.fromEntries(Object.keys(TOPICS).map((t) => [t, scoreFor(V, t, opt.weights)]));
    const yearV = V.filter((v) => v.fam === "periods" && v.plain);
    const yp = [...new Set(yearV.filter((v) => v.s > 0).map((v) => v.plain))], yn = [...new Set(yearV.filter((v) => v.s < 0).map((v) => v.plain))];
    const yearNote = [yp.length ? yp.join("، ") : "", yn.length ? (yp.length ? "وفيها أيضًا " : "") + yn.join("، ") : ""].filter(Boolean).join("، ");
    months.push({ k, y, m, label: `${MONTHS[m]} ${y}`, past: k < 0, now: k === 0, voices: V, scores, yearNote,
      text: Object.fromEntries(Object.keys(TOPICS).map((t) => [t, monthText(V, t, scores[t])])),
      level: Object.fromEntries(Object.keys(TOPICS).map((t) => [t, level(scores[t])])),
      advice: Object.fromEntries(Object.keys(TOPICS).map((t) => [t, advice(scores[t], c.sex === "f")])) });
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
  // بدايةُ سنةِ التحويل إن كان حكمُها واضحًا
  const fut = months.filter((x) => x.k >= 0);
  for (const rv of ctx.revs || []) {
    const mo = fut.find((x) => x.y === rv.when.getUTCFullYear() && x.m === rv.when.getUTCMonth());
    if (!mo) continue;
    const net = rv.voices.reduce((a, v) => a + v.s, 0);
    if (Math.abs(net) >= 1) out.push({ k: mo.k, label: mo.label, text: net > 0 ? `تبدأ سنةٌ طيّبة: ${rv.voices.filter((v) => v.s > 0).map((v) => v.plain).slice(0, 2).join("، ")}.` : `تبدأ سنةٌ تحتاجُ حذرًا: ${rv.voices.filter((v) => v.s < 0).map((v) => v.plain).slice(0, 2).join("، ")}.`, why: `تحويلُ سنة ${rv.y} (طالعُه ${rv.asc})` });
  }
  // تبدّلُ مرحلةِ العمر عند بطليموس
  for (const a of AGES) {
    if (!a.from) continue;
    const d = new Date(ctx.birth.getTime() + a.from * 365.2422 * 86400000);
    const mo = fut.find((x) => x.y === d.getUTCFullYear() && x.m === d.getUTCMonth());
    if (mo) out.push({ k: mo.k, label: mo.label, text: `تدخلُ مرحلةَ «${a.name}» من العمر: ${a.text.split("،").slice(0, 2).join("،")}.`, why: `أعمارُ بطليموس: يحكمُها ${a.planet}` });
  }
  const seen = new Set();
  return out.sort((a, b) => a.k - b.k).filter((o) => { const key = o.k + o.why.slice(0, 8); if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, 6);
}

// أقربُ شهرٍ قادمٍ يتبدّلُ فيه حكمُ موضوعٍ تبدّلًا واضحًا
function R_turn(months, topic) {
  const fut = months.filter((x) => x.k >= 0);
  for (let i = 1; i < fut.length; i++) if (Math.abs(fut[i].scores[topic] - fut[i - 1].scores[topic]) >= 0.9) return fut[i].label;
  return fut[0]?.label || "";
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
  if (g.relief && nowLvl !== "good") pills.push({ cls: "gold", text: `أوّلُ تحسّن: ${g.relief.label}` });
  pills.push({ cls: "saad", text: `أفضلُ فترة: ${g.best.label}` });
  let summary = nowLvl === "heavy"
    ? `${k_("أنت", "أنتِ")} الآن في فترةٍ ثقيلة${g.heavyUntil ? ` تمتدُّ حتّى ${g.heavyUntil.label}` : ""}: الأمورُ تتأخّرُ ويكثرُ التعب.${g.relief ? ` من ${g.relief.label} تبدأ بالانفراج تدريجيًّا،` : ""} وأحسنُ ما يمرُّ ${k_("عليك", "عليكِ")} في السنوات الثلاث بين ${g.best.label}.`
    : nowLvl === "good"
    ? `${k_("أنت", "أنتِ")} الآن في فترةٍ طيّبة، ${k_("فاستفدْ", "فاستفيدي")} منها. وأحسنُ ما يمرُّ ${k_("عليك", "عليكِ")} في السنوات الثلاث بين ${g.best.label}، وأثقلُ فترةٍ بين ${g.worst.label}.`
    : `${k_("حالُك", "حالُكِ")} الآن وسط${g.relief ? `، ويبدأ التحسّنُ من ${g.relief.label}` : ""}. أحسنُ فترةٍ في السنوات الثلاث بين ${g.best.label}، وأثقلُها بين ${g.worst.label}.`;

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
  const hot = (h.temperament.chart.heat > 0) || h.temperament.final?.heat?.k === "H";
  const hotPeriod = ["المريخ", "الشمس"].includes(curF.majorLord), coldPeriod = ["زحل", "القمر"].includes(curF.majorLord);
  const angry = Object.values(h.groups).some((gr) => gr.firm.some((x) => x.id === "anger_quick" || x.id === "rash"));
  if (hot && hotPeriod) insights.push({ text: `طبعُ${k_("ك", "كِ")} حارّ${angry ? " سريعُ الغضب" : ""}، والفترةُ التي ${k_("أنت", "أنتِ")} فيها من نفسِ الطبع، فيشتدُّ ${k_("عليك", "عليكِ")} ذلك: أكثرُ ما قد ${k_("يخسّرُك", "يخسّرُكِ")} الآن قرارٌ ${k_("تأخذُه وأنت متضايق", "تأخذينه وأنتِ متضايقة")}.${g.relief ? ` أجّلِ القراراتِ الكبيرةَ إلى ما بعد ${g.relief.label}.` : ""}`, src: `مزاجُ الخريطة (Lilly) + الفترةُ الكبرى لـ${curF.majorLord} — «الطبعُ يشتدُّ إذا وافقه زمانُه» (بطليموس م٤ ف١٠)` });
  else if (hot && coldPeriod) insights.push({ text: `طبعُ${k_("ك", "كِ")} حارّ، والفترةُ التي ${k_("أنت", "أنتِ")} فيها باردةٌ تُهدّئه: وقتٌ مناسبٌ للتأنّي والتخطيط أكثر من الاندفاع.`, src: `مزاجُ الخريطة + الفترةُ الكبرى لـ${curF.majorLord}` });
  else if (!hot && hotPeriod) insights.push({ text: `طبعُ${k_("ك", "كِ")} يميلُ إلى الهدوء، والفترةُ حارّةٌ تدفعُ${k_("ك", "كِ")} إلى الحركة: استغلَّها في ما كان يحتاجُ جرأة.`, src: `مزاجُ الخريطة + الفترةُ الكبرى لـ${curF.majorLord}` });
  if (L.wealth) insights.push({ text: `رزقُ${k_("ك", "كِ")} ${L.wealth.text.replace(/^يأتي المالُ /, "يأتي ")}، وأحسنُ وقتٍ له بين ${W.money.best.label}${/الأصدقاء|الشراكة|بيتُ الأصدقاء/.test((months.find((x) => x.now)?.voices.map((v) => v.why).join(" ") || "")) ? "، والأنفعُ مع شريكٍ أو صديق" : ""}.`, src: "المال (بطليموس م٤ ف٢) + الخطُّ الزمنيّ للمال" });
  if (A.hits[0]) insights.push({ text: `${k_("بدنُك", "بدنُكِ")} أضعفُ في ${gen(A.hits[0].part)}، وأثقلُ فترةٍ عليه بين ${W.health.worst.label}: ${k_("خفّفْ", "خفّفي")} الحِملَ فيها ولا ${k_("تؤجّلْ", "تؤجّلي")} الكشف إن ${k_("أحسستَ", "أحسستِ")} بشيء.`, src: "آفاتُ البدن (بطليموس م٣ ف١٢) + الخطُّ الزمنيّ للصحّة" });

  // الكفّ (من آخر قراءةٍ محفوظة): خطوطُ اليد مع الخطِّ الزمنيّ — [ب] برنارد الأسطة، فصول الخطوط
  if (opt.palm && opt.palm.lines) {
    const st = (k) => (opt.palm.lines[k]?.present ? opt.palm.lines[k].states || [] : []);
    const has = (k, re) => st(k).some((x) => re.test(x));
    const SRC = (k, ch) => `خطُّ ${k} في كفّك ([ب] الفصل ${ch}) + الخطُّ الزمنيّ`;
    if (has("life", /قصير|باهت|سلسل|جزيرة|متقطّع/)) insights.push({ text: `خطُّ الحياة في ${k_("كفّك", "كفّكِ")} يدلُّ على طاقةٍ تحتاجُ إدارة، وأثقلُ فترةٍ على البدن بين ${W.health.worst.label}: ${k_("لا تحمّلْ نفسَك", "لا تحمّلي نفسَكِ")} فيها أكثرَ من طاقتها.`, src: SRC("الحياة", "١١") });
    else if (has("life", /طويل|عميق|مزدوج/)) insights.push({ text: `خطُّ الحياة في ${k_("كفّك", "كفّكِ")} قويّ، فـ${k_("تتجاوزُ", "تتجاوزين")} الفتراتِ الثقيلة (أثقلُها بين ${W.health.worst.label}) أسرعَ من غيرِ${k_("ك", "كِ")}.`, src: SRC("الحياة", "١١") });
    if (has("head", /منكسر|متقطّع|باهت|ملتصقٌ بخطِّ الحياةِ مسافةً طويلة/)) insights.push({ text: `خطُّ الرأس يدلُّ على تردّدٍ أو تشتّتٍ عند القرار؛ فلا ${k_("تحسمْ", "تحسمي")} أمرًا كبيرًا في الأشهر الثقيلة، واجعلْ قراراتِ${k_("ك", "كِ")} المهمّةَ بين ${g.best.label}.`, src: SRC("الرأس", "١٠") });
    else if (has("head", /مستقيم|منفصل/)) insights.push({ text: `خطُّ الرأس يدلُّ على عقلٍ حاسمٍ مستقلّ؛ وهذا أنفعُ ما ${k_("تملكُه", "تملكينه")} في الفترة الثقيلة: ${k_("خطّطْ", "خطّطي")} فيها لما ${k_("ستبدؤه", "ستبدئينه")} بين ${g.best.label}.`, src: SRC("الرأس", "١٠") });
    if (has("heart", /طويل|صاعدة|يبدأُ عاليًا/)) insights.push({ text: `خطُّ القلب يدلُّ على عاطفةٍ ثابتةٍ وفيّة، وأحسنُ وقتٍ للحبّ والارتباط بين ${W.love.best.label}.`, src: SRC("القلب", "٩") });
    else if (has("heart", /هابطة|متقطّع|سلسل|قصير/)) insights.push({ text: `خطُّ القلب يدلُّ على خيباتٍ أو تحفّظٍ في العاطفة؛ ${k_("تمهّلْ", "تمهّلي")} في العلاقات بين ${W.love.worst.label}، والأيسرُ بين ${W.love.best.label}.`, src: SRC("القلب", "٩") });
    if (has("fate", /متقطّع|يتوقّف/)) insights.push({ text: `خطُّ المصير متقطّع: تغيّراتٌ في الشغل متوقَّعة، وأقربُها يوافقُ ${R_turn(months, "work")}.`, src: SRC("المصير", "١٢") });
    else if (has("fate", /واضحٌ مستقيم|يبدأُ من خطِّ الحياة/)) insights.push({ text: `خطُّ المصير واضح: مسارٌ مهنيٌّ ثابتٌ بجهدِ${k_("ك", "كِ")}، يقوى بين ${W.work.best.label}.`, src: SRC("المصير", "١٢") });
  }

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
  let qv = null, jv = null;
  try { qv = qura.cast(c.name, c.mother, question, now); } catch {}
  try { jv = jafr.extractAnswer(question, { name: c.name, mother: c.mother }); } catch {}
  const qs = [rs > 0.5 ? 1 : rs < -0.5 ? -1 : 0];
  if (qv) qs.push(qv.tone === "سعد" ? 1 : qv.tone === "نحس" ? -1 : 0);
  if (jv?.verdict) qs.push(jv.verdict.direction === "نعم" ? 1 : jv.verdict.direction === "لا" ? -1 : 0);
  const qAvg = qs.reduce((a, b) => a + b, 0) / qs.length;
  const tl = T.months.filter((x) => x.k >= 0 && x.k < 12).reduce((a, x) => a + x.scores[topic], 0) / 12;
  const votes = [
    { fam: "question", s: qAvg >= 0.34 ? 1 : qAvg <= -0.34 ? -1 : 0, why: `لحظةُ السؤال — الرمل: ${r.verdict}${qv ? ` · القرعة: الباب ${qv.bab} (${qv.tone})` : ""}${jv?.verdict ? ` · الجفر: ${jv.verdict.text}` : ""}` },
    { fam: "periods+sky", s: tl > 0.3 ? 1 : tl < -0.3 ? -1 : 0, why: `الخطُّ الزمنيّ للموضوع في السنة القادمة: ${level(tl)}` },
  ];
  const sum = votes.reduce((a, v) => a + v.s, 0);
  const F_ = c.sex === "f";
  const big = sum >= 2 ? (F_ ? "يتمّ، والوقتُ في صالحِكِ." : "يتمّ، والوقتُ في صالحك.") : sum === 1 ? (F_ ? "يتمّ، لكن لا تستعجلي." : "يتمّ، لكن لا تستعجل.") : sum === 0 ? "ممكن، لكنّه يحتاجُ وقتًا وصبرًا." : sum === -1 ? "فيه تعثّر، والأولى تأجيلُه." : "الأولى تركُه الآن.";
  const locked = /محبوس/.test(r.timing?.text || "");
  const tStr = !locked && r.timing?.magnitude && r.timing?.unit ? `، وأوّلُ ما يظهرُ منه بعد نحو ${r.timing.magnitude} ${r.timing.unit}` : locked ? "، لكنّه لا يظهرُ قريبًا" : "";
  const text = `${sum >= 0 ? "الأمرُ يمشي" : "الأمرُ متعثّرٌ الآن"}${tStr}. أنسبُ وقتٍ له بين ${W.best.label}${W.worst.v < -0.45 ? `، ${sum >= 0 ? (F_ ? "وتجنّبي" : "وتجنّبْ") : "وأسوأُه"} ما بين ${W.worst.label}` : ""}.`;
  return { topic, topicAr: TOPICS[topic], big, text, best: W.best, worst: W.worst, votes, raml: { verdict: r.verdict, figure: r.house?.figure?.ar, house: r.house?.name }, qura: qv ? { bab: qv.bab, tone: qv.tone } : null, jafr: jv?.verdict || null };
}

export default { timeline, read, ask, eclipses, revolutions, abjadDate, tasyir, midheaven, MONTHS, TOPICS, FAMILIES };
