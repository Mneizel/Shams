// engines/bari.js
// ─────────────────────────────────────────────────────────────────────────────
// أحكامُ «المسائل» من كتاب البارع لابن أبي الرجال: قواعدُ خاصّةٌ بكلّ نوعٍ من
// الأسئلة، تُضاف فوق الحكم العامّ في falak.horary. دالّةٌ خالصة: تأخذ خريطةَ
// لحظة السؤال محسوبةً (لا تحسب فلكًا بنفسها) وتُرجع تفاصيلَ مقروءة + تعديلًا صغيرًا للنقاط.
// ─────────────────────────────────────────────────────────────────────────────

import { SIGNS } from "../data/falak.data.js";
import { DOMICILE, EXALT } from "../data/falak-ahkam.data.js";
import {
  BARI_SRC, MONEY_SOURCE, HARM_SOURCE, MARRIAGE_GOOD_BY_ASPECT, BEAUTY_SIGNS, PLAIN_SIGNS, HOUSE_BODY,
  ELEMENT_HUMOR, QUALITY_COURSE, MOON_SIGN_TIME, TRAVEL_BENEFIC_HOUSE, TRAVEL_BENEFIC_FROM, TRAVEL_MALEFIC,
  THIEF_LOOK, PLANET_SUBSTANCE, PLANET_PLACE_IN_HOUSE, ELEMENT_DIRECTION, ANGLE_DIRECTION, QUALITY_HEIGHT,
  PRISON_CAUSE, PRISON_BY_MOON_SIGN, PLANET_YEARS, PLANET_YEARS_SRC, PRISON_BY_HOUR, SIGN_CRAFT, DREAM_MATTER, JUDGE_BY_PLANET, DISPUTE_CAUSE, LOSS_CAUSE,
} from "../data/horary-bari.data.js";

const BEN = new Set(["المشتري", "الزهرة"]);
const MAL = new Set(["زحل", "المريخ"]);
const HARD = new Set(["تربيع", "مقابلة"]);
const SOFT = new Set(["تثليث", "تسديس"]);
const norm = (x) => ((x % 360) + 360) % 360;
const sep = (a, b) => { const d = Math.abs(norm(a) - norm(b)) % 360; return d > 180 ? 360 - d : d; };

/** أدواتُ قراءة الخريطة */
function tools(ch) {
  const lon = (p) => ch.pos[p]?.longitude ?? 0;
  const sign = (l) => SIGNS[Math.floor(norm(l) / 30)];
  const house = (l) => ((Math.floor(norm(l) / 30) - Math.floor(norm(ch.ascLon) / 30) + 12) % 12) + 1;
  const H = (p) => house(lon(p));
  const angular = (h) => [1, 4, 7, 10].includes(h);
  const cadent = (h) => [3, 6, 9, 12].includes(h);
  const lordOf = (h) => SIGNS[(Math.floor(norm(ch.ascLon) / 30) + h - 1) % 12].ruler;
  const asp = (a, b) => ch.asps.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a)) || null;
  const applying = (a, b) => { const x = asp(a, b); return x && x.applying ? x : null; };
  const separating = (a, b) => { const x = asp(a, b); return x && !x.applying ? x : null; };
  // القبول: أن يكون الكوكبُ في بيتِ الآخر أو شرفِه
  const receives = (host, guest) => { const s = sign(lon(guest)).name; return (DOMICILE[host] || []).includes(s) || (EXALT[host] && EXALT[host][0] === s); };
  const ownPlace = (p) => receives(p, p);
  const combust = (p) => ch.comb[p] === "احتراق";
  const afflicted = (p) => combust(p) || [...MAL].some((m) => m !== p && (() => { const x = asp(p, m); return x && (x.name === "مقارنة" || HARD.has(x.name)); })());
  const helped = (p) => [...BEN].some((b) => b !== p && asp(p, b) && !HARD.has(asp(p, b).name));
  const moonFrom = () => ch.asps.filter((x) => (x.a === "القمر" || x.b === "القمر") && !x.applying).sort((a, b) => a.orb - b.orb)[0];
  const moonTo = () => ch.asps.filter((x) => (x.a === "القمر" || x.b === "القمر") && x.applying).sort((a, b) => a.orb - b.orb)[0];
  const other = (x, p) => (x ? (x.a === p ? x.b : x.a) : null);
  const masc = (l) => ["نار", "هواء"].includes(sign(l).element);
  const strength = (p) => (ch.dig?.(p) ?? 0) + (angular(H(p)) ? 2 : cadent(H(p)) ? -1 : 0) - (combust(p) ? 3 : 0) - (ch.pos[p]?.retrograde ? 1 : 0);
  const peregrine = (p) => (ch.dig?.(p) ?? 0) === 0;
  return { lon, sign, house, H, angular, cadent, lordOf, asp, applying, separating, receives, ownPlace, combust, afflicted, helped, moonFrom, moonTo, other, masc, strength, peregrine };
}

/**
 * @param {string} topic مفتاحُ الموضوع (من classifyAstroTopic)
 * @param {object} ch خريطةُ السؤال: { ascLon, pos, asps, comb, ms, hourRuler, lotLon, dig(p), ascLord, qLord, qHouse }
 * @returns {{details: {text:string, s:number, src:string}[], adj:number, phases:object[], timeUnit:string}}
 */
export function judge(topic, ch) {
  const T = tools(ch);
  const out = [];
  const add = (text, s = 0, page = "") => out.push({ text, s, src: `${BARI_SRC}${page ? `، ورقة ${page}` : ""}` });
  const { ascLord, qLord } = ch;
  const moonSign = T.sign(T.lon("القمر"));

  // ── قواعدُ عامّةٌ لكلّ مسألة ─────────────────────────────────────────
  // اتّصالُ القمر بسعدٍ أو نحس [ورقة ٢١]
  const mt = T.moonTo(), mtP = T.other(mt, "القمر");
  if (mtP && BEN.has(mtP)) add(`القمرُ مقبلٌ على ${mtP}: الأمرُ يتّجهُ إلى خير.`, 0.3, 21);
  else if (mtP && MAL.has(mtP) && !T.ownPlace(mtP)) add(`القمرُ مقبلٌ على ${mtP}: يدخلُ على الأمر مكروهٌ أو تعطيل.`, -0.3, 21);
  // الرجاءُ والخوف بموضع ربّ الطالع [ورقة ٢١]
  const hA = T.H(ascLord);
  if (T.angular(hA) && T.helped(ascLord)) add("صاحبُ الطالع في وتدٍ ويقبلُه سعد: ما ترجوه يتحقّق.", 0.3, 21);
  else if ([6, 8, 12].includes(hA)) add("صاحبُ الطالع ساقطٌ في بيتٍ رديء: يصيبُك قلقٌ أو تعبٌ في هذا الأمر.", -0.3, 21);
  // مراحلُ الأمر بأرباب مثلّثة الطالع: الأوّل للبداية والثاني للوسط والثالث للآخر [ورقة ١٩]
  const trip = { "نار": ["الشمس", "المشتري", "زحل"], "تراب": ["الزهرة", "القمر", "المريخ"], "هواء": ["زحل", "عطارد", "المشتري"], "ماء": ["الزهرة", "المريخ", "القمر"] }[T.sign(ch.ascLon).element];
  const phases = trip.map((p, i) => {
    const good = !T.afflicted(p) && !T.cadent(T.H(p)) ? true : T.afflicted(p) && T.cadent(T.H(p)) ? false : null;
    return { stage: ["البداية", "الوسط", "الآخر"][i], planet: p, good };
  });
  const ph = phases.map((x) => `${x.stage} ${x.good === true ? "حسنة" : x.good === false ? "متعبة" : "وسط"}`);
  add(`مراحلُ الأمر: ${ph.join("، ")}.`, 0, 19);
  const timeUnit = MOON_SIGN_TIME[moonSign.quality];

  // ── قواعدُ كلّ موضوع ────────────────────────────────────────────────
  const R = RULES[topic];
  if (R) R(T, ch, add);

  const adj = Math.max(-1, Math.min(1, out.reduce((a, x) => a + x.s, 0)));
  return { details: out, adj: Math.round(adj * 100) / 100, phases, timeUnit };
}

// المال والرزق [ورقة ٢١–٢٢، ٩٥]
function money(T, ch, add) {
  const l2 = T.lordOf(2);
  if (T.applying(ch.ascLord, l2) || T.applying("القمر", l2) || T.H(l2) === 1) add("دليلُك يتّصلُ بدليل المال: يصيبُك مال.", 0.4, 21);
  else if (T.separating(ch.ascLord, l2)) add("دليلُك منصرفٌ عن دليل المال: فرصةٌ تفوتُك إن لم تسرع.", -0.3, 21);
  const hJ = T.H("المشتري"), hL = ch.lotLon != null ? T.house(ch.lotLon) : null;
  if ([1, 2].includes(hJ) || [1, 2].includes(hL)) add("المشتري أو سهمُ السعادة في بيتِك أو بيتِ مالِك: رزقٌ حاضر.", 0.3, 21);
  add(`مصدرُ المال الأرجح: ${MONEY_SOURCE[T.H(l2)]}.`, 0, 22);
  if (hL === 2 && T.afflicted(T.sign(ch.lotLon).ruler)) add("سهمُ السعادة منحوسٌ في بيت المال: يدخلُ المالُ ويخرج.", -0.3, 95);
  if (BEN.has(l2) && !ch.pos[l2]?.retrograde && !T.afflicted(l2)) add("دليلُ المال سعدٌ سالم: المالُ يدوم.", 0.2, 22);
}

// العمل والسلطان [ورقة ٨٧، ٩٠–٩٥]
function work(T, ch, add) {
  const l10 = T.lordOf(10), a = T.asp(ch.ascLord, l10);
  if ((a && SOFT.has(a.name)) || (T.angular(T.H(ch.ascLord)) && T.angular(T.H(l10)))) add("دليلُك ودليلُ العمل متّفقان: تنالُ ما تطلبُه.", 0.4, 87);
  else if (T.cadent(T.H(ch.ascLord)) && !a) add("دليلُك ساقطٌ ولا ينظرُ إلى دليل العمل: لا يتمّ الآن.", -0.4, 87);
  else if (a && HARD.has(a.name)) add("بين دليلِك ودليلِ العمل نظرُ عداوة: يتمُّ بعد نزاعٍ وتعب.", 0, 87);
  if (T.H("المشتري") === 10) add("المشتري في وسط السماء: رفعةٌ وزيادة.", 0.3, 90);
  if (T.H("زحل") === 10 && T.H("المريخ") === 10) add("زحل والمريخ في وسط السماء: ظلمٌ وخلافٌ في العمل.", -0.3, 90);
  if ([6, 12].includes(T.H(ch.ascLord))) add("صاحبُ الطالع في السادس أو الثاني عشر: خصومٌ يعطّلون أمرَك.", -0.2, 90);
  // مدّةُ البقاء في العمل بسني الكوكب الصغرى [البارع ٩٤؛ والسنون من المدخل الكبير لأبي معشر]
  const in10 = ["الشمس", "القمر", "عطارد", "الزهرة", "المريخ", "المشتري", "زحل"].filter((p) => T.H(p) === 10).sort((x, y) => T.strength(y) - T.strength(x))[0] || l10;
  const yrs = PLANET_YEARS[in10]?.least;
  if (yrs) { const strong = (ch.dig?.(in10) ?? 0) >= 4 && T.angular(T.H(in10)); add(`مدّةُ البقاء في هذا العمل على أكثر تقدير: نحو ${yrs} ${strong ? "سنة" : "شهرًا"} (سنو ${in10} الصغرى${strong ? "، وهو قويٌّ في وتد" : ""}).`, 0, 94); }
  craft(T, ch, add);
}

// الصناعة [ورقة ٩٥–٩٦]
function craft(T, ch, add) {
  const cands = [ch.ascLord, T.lordOf(10), "عطارد"];
  const best = cands.sort((x, y) => T.strength(y) - T.strength(x))[0];
  const s = T.sign(T.lon(best)).name;
  add(`الصنعةُ التي تناسبُك (من ${best} في ${s}): ${SIGN_CRAFT[s]}${T.angular(T.H(best)) ? "، وتصلحُ لك الأعمالُ الكبيرة" : ""}.`, 0, 95);
}

// الزواج والحبّ [ورقة ٤٥–٤٩، ٥١]
function marriage(T, ch, add) {
  const l7 = T.lordOf(7);
  if (T.applying(ch.ascLord, l7) || T.applying("القمر", l7) || T.H(l7) === 1 || T.H("القمر") === 7) {
    const a = T.applying(ch.ascLord, l7) || T.applying("القمر", l7);
    add(a && HARD.has(a.name) ? "يتمُّ الارتباطُ لكن ببطءٍ وتعب." : "دليلُ الطرفين يجتمعان: يتمُّ الارتباط.", a && HARD.has(a.name) ? 0.1 : 0.4, 45);
    if (a && MARRIAGE_GOOD_BY_ASPECT[a.name]) add(`الخيرُ لهما يأتي ${MARRIAGE_GOOD_BY_ASPECT[a.name]}.`, 0, 46);
  }
  for (const m of MAL) { const h = T.H(m); if (HARM_SOURCE[h]) { add(`إن فسد الأمرُ فمن جهة ${HARM_SOURCE[h].replace(/^من /, "")}.`, 0, 45); break; } }
  const sA = T.strength(ch.ascLord), s7 = T.strength(l7);
  if (Math.abs(sA - s7) >= 2) add(sA > s7 ? "أنت الطرفُ الأقوى في هذه العلاقة." : "الطرفُ الآخرُ هو الأقوى في هذه العلاقة.", 0, 47);
  const s7n = T.sign(ch.ascLon + 180).name;
  if (BEAUTY_SIGNS.includes(s7n)) add("صفةُ الطرف الآخر: حسنُ الصورة.", 0, 45);
  else if (PLAIN_SIGNS.includes(s7n)) add("صفةُ الطرف الآخر: جمالُه في طبعه أكثرَ من صورته.", 0, 45);
  const x = T.asp(ch.ascLord, l7);
  if (x && x.name === "مقابلة") add("بين الدليلين مقابلة: خلافٌ متكرّرٌ يحتاجُ صبرًا.", -0.2, 46);
  if (T.H("زحل") === 10 || T.H("المريخ") === 10) add("نحسٌ في وسط السماء: مشكلاتٌ تظهرُ بينكما.", -0.2, 46);
  if (T.H("المشتري") === 10 || T.H("الزهرة") === 10) add("سعدٌ في وسط السماء: وفاقٌ بينكما.", 0.2, 46);
}

// الطلاق والرجوع [ورقة ٤٨–٤٩]
function divorce(T, ch, add) {
  const above = (p) => T.H(p) >= 7;
  if ((T.angular(T.H("الزهرة")) && above("الزهرة")) || (T.angular(T.H("الشمس")) && above("الشمس"))) add("الزهرة أو الشمس في وتدٍ فوق الأرض: يرجعُ الطرفان بعد ندم.", 0.4, 48);
  else if (T.cadent(T.H("الزهرة")) && T.cadent(T.H("الشمس"))) add("الزهرة والشمس ساقطتان: لا رجوعَ قريب.", -0.4, 48);
  if (T.angular(T.H("زحل"))) add("زحل في وتد: يطولُ الهجر.", -0.2, 49);
  if (T.angular(T.H("المشتري")) || T.angular(T.H("الزهرة"))) add(`سعدٌ في الأوتاد: صلح، ويبدأُه ${T.H("المشتري") === 1 || T.H("الزهرة") === 1 ? "السائل" : "الطرف الآخر"}.`, 0.3, 49);
}

// الولد والحمل [ورقة ٢٧–٣١، ٥٠]
function child(T, ch, add) {
  const l5 = T.lordOf(5);
  if (T.H(ch.ascLord) === 5 || T.H("القمر") === 5 || T.H(l5) === 1) add("دليلُك في بيت الولد أو دليلُ الولد في طالعِك: حملٌ أو ولد.", 0.4, 28);
  if (["السرطان", "العقرب", "الحوت"].includes(T.sign(T.lon("القمر")).name)) add("القمرُ في برجٍ كثير الولد: علامةُ حمل.", 0.2, 28);
  if (T.afflicted(l5) || ch.pos[l5]?.retrograde) add("دليلُ الولد منحوسٌ أو محترق: يُخشى على الحمل، فالحذرَ والمتابعة.", -0.3, 29);
  if (T.sign(ch.ascLon).quality === "ذو جسدين" && T.sign(T.lon(l5)).quality === "ذو جسدين") add("الطالعُ ودليلُ الولد في بروجٍ ذات جسدين: احتمالُ توأم.", 0, 29);
  const votes = [l5, ch.hourRuler, "القمر"].filter(Boolean).map((p) => (T.masc(T.lon(p)) ? 1 : -1));
  const m = votes.reduce((a, b) => a + b, 0);
  if (m) add(`الأرجحُ أن يكون المولودُ ${m > 0 ? "ذكرًا" : "أنثى"} (من برج دليل الولد وصاحب الساعة والقمر).`, 0, 29);
  if (T.applying("القمر", "المشتري") || T.applying("القمر", "الزهرة")) add("القمرُ مقبلٌ على سعد: ولادةٌ سهلة.", 0.2, 31);
}

// المرض [ورقة ٣٧–٤٣]
function illness(T, ch, add) {
  const moonBad = T.afflicted("القمر") || [1].some((h) => [...MAL].some((m) => T.H(m) === h));
  const soulBad = T.afflicted("الشمس") || T.afflicted(ch.ascLord);
  add(moonBad && !soulBad ? "العلّةُ في البدن أكثرَ منها في النفس." : soulBad && !moonBad ? "العلّةُ في النفس والهمّ أكثرَ منها في البدن." : moonBad && soulBad ? "التعبُ في البدن والنفس معًا." : "لا علامةَ قويّةً على علّةٍ ثقيلة.", moonBad && soulBad ? -0.2 : 0, 39);
  const mal = [...MAL].map((m) => ({ m, h: T.H(m) })).sort((a, b) => T.strength(b.m) - T.strength(a.m))[0];
  add(`موضعُ التعب الأرجح في البدن: ${HOUSE_BODY[mal.h]}، ${mal.h >= 7 ? "في الجانب الأيمن" : "في الجانب الأيسر"}.`, 0, 39);
  const ms = T.sign(T.lon("القمر"));
  add(`طبعُ العلّة: ${ELEMENT_HUMOR[ms.element]}، ومسارُها ${QUALITY_COURSE[ms.quality]}.`, 0, 42);
  // البُحران: إذا بلغ القمرُ تربيعَ موضعِه ثمّ مقابلتَه ثمّ تربيعَه الثاني [ورقة ٤٠]
  const days = [[7, 90], [14, 180], [21, 270]].map(([d, a]) => {
    const tgt = norm(T.lon("القمر") + a);
    const hit = ["المشتري", "الزهرة", "زحل", "المريخ"].find((p) => sep(T.lon(p), tgt) <= 8);
    return hit ? `${d === 7 ? "في نحو اليوم السابع" : d === 14 ? "في نحو اليوم الرابع عشر" : "في نحو اليوم الحادي والعشرين"} ${BEN.has(hit) ? "خفّةٌ وراحة" : "شدّةٌ تحتاجُ انتباهًا"}` : null;
  }).filter(Boolean);
  if (days.length) add(`أيّامُ التحوّل: ${days.join("؛ ")}.`, 0, 40);
  if (T.angular(T.H(ch.ascLord)) && T.helped(ch.ascLord) && (mtBen(T))) add("صاحبُ الطالع قريبٌ من الأوتاد والقمرُ مقبلٌ على سعد: برءٌ سريع.", 0.4, 40);
  if (T.H("القمر") === 6 && T.afflicted("القمر")) add("القمرُ منحوسٌ في بيت المرض: تطولُ العلّة.", -0.3, 39);
}
const mtBen = (T) => { const x = T.moonTo(); return x && BEN.has(T.other(x, "القمر")); };

// السفر [ورقة ٧٥–٧٨]
function travel(T, ch, add) {
  const l9 = T.lordOf(9);
  if (T.applying(ch.ascLord, l9) || T.applying(ch.ascLord, T.lordOf(3)) || [3, 9].includes(T.H(ch.ascLord))) add("دليلُك يتّصلُ ببيت السفر: يتمُّ السفر.", 0.3, 75);
  else if (T.angular(T.H(ch.ascLord)) && T.sign(T.lon(ch.ascLord)).quality === "ثابت") add("دليلُك ثابتٌ في وتد: السفرُ يتأخّرُ أو لا يقع.", -0.3, 75);
  for (const b of BEN) { const h = T.H(b); if (TRAVEL_BENEFIC_HOUSE[h]) add(`الخيرُ يكون ${TRAVEL_BENEFIC_HOUSE[h]}، ${TRAVEL_BENEFIC_FROM[b]}.`, 0.2, 76); }
  for (const m of MAL) if (T.angular(T.H(m)) || T.H(m) === 12) add(`ما يُحذَر في الطريق: ${TRAVEL_MALEFIC[m]}.`, -0.2, 76);
  const q = T.sign(T.lon(l9)).quality;
  add(q === "ثابت" ? "الإقامةُ في البلد المقصود تطول." : q === "منقلب" ? "الرجوعُ يكون سريعًا." : "سفرٌ يتبعُه سفرٌ آخر.", 0, 77);
  if (ch.pos[l9]?.retrograde) add("دليلُ السفر راجع: قد ترجعُ قبل أن تبلغَ مقصدَك.", -0.2, 77);
  if (T.combust(ch.ascLord) || T.combust("القمر")) add("صاحبُ الطالع أو القمرُ محترق: لا خيرَ في هذا السفر الآن.", -0.4, 78);
}

// الغائب والخبر [ورقة ٢٣، ٣٥–٣٦، ٧٥، ٧٩]
function absent(T, ch, add) {
  if ([1, 10].includes(T.H(ch.ascLord)) || [1, 10].includes(T.H("القمر"))) add("الدليلُ في الطالع أو وسط السماء: الغائبُ يقدمُ أو يصلُ خبرُه.", 0.4, 79);
  else if (T.H(ch.ascLord) === 4) add("الدليلُ تحت الأرض: لا قدومَ قريب.", -0.3, 79);
  if (ch.pos[ch.ascLord]?.retrograde) add("صاحبُ الطالع راجع: رجوعٌ سريع.", 0.2, 79);
  const mq = T.sign(T.lon("القمر")).quality, eq = T.sign(T.lon("عطارد")).quality;
  if (mq === "ثابت" && eq === "ثابت" && T.angular(T.H("القمر"))) add("القمرُ وعطارد في بروجٍ ثابتة: الخبرُ صحيح.", 0.2, 23);
  else if (mq === "منقلب" && T.afflicted("القمر")) add("القمرُ في برجٍ منقلبٍ مع نحس: الخبرُ لا يثبت.", -0.2, 23);
  else if (mq === "ذو جسدين") add("بعضُ الخبر صحيحٌ وبعضُه لا.", 0, 23);
  const mf = T.other(T.separating("عطارد", "المشتري") || T.separating("عطارد", "الزهرة") || T.separating("عطارد", "زحل") || T.separating("عطارد", "المريخ"), "عطارد");
  if (mf) add(BEN.has(mf) ? "الخبرُ القادمُ فيه بشرى." : "الخبرُ القادمُ فيه ما يُكره.", BEN.has(mf) ? 0.2 : -0.2, 79);
}

// الرسالة والكتاب [ورقة ٣٥–٣٦]
function letter(T, ch, add) {
  if (T.H("عطارد") === 1 || T.H("القمر") === 1 || T.applying("القمر", "عطارد")) add("عطارد أو القمر في الطالع أو القمرُ مقبلٌ على عطارد: الرسالةُ تأتي.", 0.4, 35);
  else if (!T.asp("عطارد", "القمر") && !T.angular(T.H("عطارد"))) add("عطارد لا ينظرُ إلى القمر ولا إلى الأوتاد: لا يأتي قريبًا.", -0.3, 35);
  if (T.H("عطارد") === 12) add("عطارد في الثاني عشر داخلٌ إلى الطالع: يأتي قريبًا.", 0.2, 35);
  absent(T, ch, () => {});
}

// الخصومة والقضيّة والعدوّ [ورقة ٥٩–٦٥]
function dispute(T, ch, add) {
  const l7 = T.lordOf(7), a = T.asp(ch.ascLord, l7);
  if (a && SOFT.has(a.name)) add("بينكما نظرُ مودّة: صلحٌ قبل أن تشتدّ الخصومة.", 0.3, 59);
  else if (a && HARD.has(a.name)) add("بينكما نظرُ عداوة: لا صلحَ إلّا بعد نزاع.", 0, 59);
  const sA = T.strength(ch.ascLord), s7 = T.strength(l7);
  if (sA - s7 >= 2) add("دليلُك أقوى من دليل خصمِك: الغلبةُ لك.", 0.4, 59);
  else if (s7 - sA >= 2) add("دليلُ خصمِك أقوى: الغلبةُ له إن لم تُصالح.", -0.4, 59);
  if (ch.pos[ch.ascLord]?.retrograde) add("دليلُك راجع: تتراجعُ أو تضعفُ حجّتُك.", -0.2, 64);
  if (ch.pos[l7]?.retrograde) add("دليلُ خصمِك راجع: يتراجعُ خصمُك.", 0.2, 64);
  const l10 = T.lordOf(10);
  add(`الحَكَمُ أو صاحبُ القرار: ${JUDGE_BY_PLANET[l10]}${ch.pos[l10]?.retrograde ? "، ويُخشى منه الميل" : ""}.`, 0, 59);
  const mf = T.other(T.moonFrom(), "القمر");
  if (mf) add(`أصلُ النزاع: ${DISPUTE_CAUSE[T.H(mf)]}.`, 0, 65);
  if (ch.lotLon != null) { const h = T.house(ch.lotLon); add([10, 11, 12, 1, 2, 3].includes(h) ? "سهمُ السعادة في جهتِك: الظفرُ أقربُ إليك." : "سهمُ السعادة في جهة خصمِك.", [10, 11, 12, 1, 2, 3].includes(h) ? 0.2 : -0.2, 65); }
}

// السحر [ورقة ٤٤]
function sihr(T, ch, add) {
  const lotLord = ch.lotLon != null ? T.sign(ch.lotLon).ruler : null;
  const signs = (lotLord && T.afflicted(lotLord)) || ([1, 12].includes(T.H("القمر")) && T.afflicted("القمر")) || ["الجدي", "الدلو"].includes(T.sign(T.lon("القمر")).name);
  add(signs ? "في الخريطة علامةُ أذًى مُدبَّر (على قول الكتاب)؛ والأغلبُ أنّه همٌّ وتعبٌ يحتاجُ علاجًا ظاهرًا." : "لا علامةَ في الخريطة على عملٍ مُدبَّر.", signs ? -0.2 : 0.2, 44);
}

// العلم والدراسة [ورقة ٨٢]
function study(T, ch, add) {
  const l9 = T.lordOf(9), a = T.asp(l9, ch.ascLord);
  if ([...BEN].some((b) => T.H(b) === 9) || (a && !HARD.has(a.name))) add("بيتُ العلم سعيدٌ وينظرُ إلى دليلِك: علمٌ صحيحٌ تنتفعُ به.", 0.4, 82);
  if ([...MAL].some((m) => T.H(m) === 9)) add("نحسٌ في بيت العلم: تعبٌ في الدراسة أو مادّةٌ لا تنفع.", -0.3, 82);
  if (a && HARD.has(a.name)) add("بين دليلِك ودليل العلم نظرٌ صعب: تتعبُ فيه كثيرًا.", -0.2, 82);
  if (BEN.has(l9) && !a) add("دليلُ العلم سعيدٌ لكنّه لا ينظرُ إليك: علمٌ نافعٌ لا تستفيدُ منه الآن.", 0, 82);
}

// السرقة [ورقة ٥٣–٥٩]
function theft(T, ch, add) {
  const strangers = ["زحل", "المشتري", "المريخ", "الشمس", "الزهرة", "عطارد", "القمر"].filter((p) => T.angular(T.H(p)) && T.peregrine(p));
  const thief = strangers[0] || T.lordOf(7);
  const tl = T.lon(thief), ts = T.sign(tl);
  add(`صفةُ الآخذ: ${THIEF_LOOK[thief]}؛ ${T.masc(tl) ? "رجل" : "امرأة"}، ${ts.quality === "ثابت" ? "واحد" : ts.quality === "ذو جسدين" ? "أكثرُ من واحد" : "واحدٌ غالبًا"}، ${(norm(tl) % 30) < 15 ? "أصغرُ سنًّا" : "أكبرُ سنًّا"}.`, 0, 54);
  const l2 = T.lordOf(2);
  if (T.applying(l2, ch.ascLord) || T.applying("القمر", ch.ascLord) || [...BEN].some((b) => T.H(b) === 1)) add("دليلُ المتاع يرجعُ إلى دليلِك: يرجعُ الشيء.", 0.4, 54);
  else if (T.cadent(T.H(l2)) && T.afflicted(l2)) add("دليلُ المتاع ساقطٌ منحوس: يصعبُ رجوعُه.", -0.4, 57);
  if (ch.pos[thief]?.retrograde) add("دليلُ الآخذ راجع: يردُّ ما أخذ.", 0.3, 54);
  if (T.angular(T.H(thief)) && T.asp(thief, "الشمس") && T.asp(thief, "القمر")) add("النيّران ينظران إلى دليل الآخذ: ينكشفُ أمرُه.", 0.2, 55);
  const l4 = T.lordOf(4), s4 = T.sign(T.lon(l4));
  add(`جهةُ الشيء: ${ANGLE_DIRECTION[T.H(l4)] || ELEMENT_DIRECTION[s4.element]}، ${QUALITY_HEIGHT[s4.quality]}، وأقربُ موضع: ${PLANET_PLACE_IN_HOUSE[l4]}.`, 0, 55);
}

// الضالّة والمفقود [ورقة ٥١–٥٢]
function lost(T, ch, add) {
  const l2 = T.lordOf(2), mL = T.sign(T.lon("القمر")).ruler;
  if (T.applying("القمر", ch.ascLord) || T.applying("القمر", l2) || T.applying("القمر", mL)) add("القمرُ مقبلٌ على دليلِك أو دليل الشيء: يُوجَد.", 0.4, 51);
  else if ([6, 8, 12].some((h) => T.asp("القمر", T.lordOf(h)) && HARD.has(T.asp("القمر", T.lordOf(h)).name))) add("القمرُ منحوسٌ بأرباب البيوت الرديئة: صار في يد غيرك.", -0.4, 51);
  const ms = T.sign(T.lon("القمر")), hM = T.H("القمر");
  add(`جهتُه: ${ANGLE_DIRECTION[hM] || ELEMENT_DIRECTION[ms.element]}، ${QUALITY_HEIGHT[ms.quality]}.`, 0, 51);
  const d = sep(T.lon(ch.ascLord), T.lon(l2));
  add(T.sign(T.lon(ch.ascLord)).name === T.sign(T.lon(l2)).name ? "قريبٌ جدًّا، غالبًا في البيت نفسه." : d < 30 ? "قريبٌ منك." : "بعيدٌ نسبيًّا.", 0, 52);
  const sf = T.other(T.separating(ch.ascLord, "زحل") || T.separating(ch.ascLord, "المريخ") || T.separating(ch.ascLord, "المشتري") || T.separating(ch.ascLord, "الزهرة") || T.separating(ch.ascLord, "عطارد"), ch.ascLord);
  if (sf && LOSS_CAUSE[sf]) add(`سببُ الضياع: ${LOSS_CAUSE[sf]}.`, 0, 52);
}

// الحبس [ورقة ٨٢–٨٥]
function prison(T, ch, add) {
  const l4 = T.lordOf(4);
  if (T.separating("القمر", l4)) add("القمرُ منصرفٌ عن دليل الحبس: خروج.", 0.4, 82);
  if (mtBen(T)) add("القمرُ مقبلٌ على سعد: خلاصٌ سريع.", 0.3, 82);
  if (T.sign(T.lon("القمر")).quality === "ثابت" && T.sign(T.lon(ch.ascLord)).quality === "ثابت") add("القمرُ وصاحبُ الطالع في بروجٍ ثابتة: يطولُ الحبس.", -0.3, 82);
  add(`على برج القمر: ${PRISON_BY_MOON_SIGN[T.sign(T.lon("القمر")).name]}.`, 0, 84);
  if (ch.hourRuler && PRISON_BY_HOUR[ch.hourRuler]) add(`على صاحب الساعة (${ch.hourRuler}): ${PRISON_BY_HOUR[ch.hourRuler]}.`, 0, 85);
  const mf = T.other(T.moonFrom(), "القمر");
  if (mf && PRISON_CAUSE[mf]) add(`السببُ الأرجح: ${PRISON_CAUSE[mf]}.`, 0, 83);
}

// البيع والشراء [ورقة ٢٤، ٦٠–٦١]
function sale(T, ch, add) {
  const l7 = T.lordOf(7), a = T.applying(ch.ascLord, l7);
  if (a) add(SOFT.has(a.name) ? "دليلُ البائع والمشتري يتّصلان: الصفقةُ تتمُّ بسهولة." : "الصفقةُ تتمُّ بعد شدٍّ وجذب.", SOFT.has(a.name) ? 0.4 : 0.1, 60);
  else add("لا اتّصالَ بين الطرفين: الصفقةُ لا تتمُّ الآن.", -0.3, 60);
  const l4 = T.lordOf(4);
  if (ch.pos[l4]?.retrograde || T.combust(l4)) add("دليلُ السلعة راجعٌ أو محترق: فيها عيب، فافحصْها.", -0.3, 61);
  const l10 = T.lordOf(10), d = ch.dig?.(l10) ?? 0;
  add(d >= 3 ? "السعرُ مرتفع." : d < 0 || T.cadent(T.H(l10)) ? "السعرُ منخفض." : "السعرُ معتدل.", 0, 24);
  if ([...BEN].some((b) => T.H(b) === 1)) add("سعدٌ في الطالع: البائعُ صادقٌ ويسهلُ التعامل.", 0.2, 60);
  if ([...MAL].some((m) => T.H(m) === 1)) add("نحسٌ في الطالع: احذرْ الغشّ.", -0.2, 60);
}

// الشراكة [ورقة ٦٠]
function partner(T, ch, add) {
  const l7 = T.lordOf(7), a = T.asp(ch.ascLord, l7);
  if (a && SOFT.has(a.name)) add("بين الشريكين نظرُ مودّة: شراكةٌ مستقيمة.", 0.4, 60);
  const q1 = T.sign(ch.ascLon).quality;
  add(q1 === "ثابت" ? "الشراكةُ تدوم." : q1 === "منقلب" ? "الشراكةُ لا تدومُ طويلًا." : "الشراكةُ تربحُ لكن مع تبدّل.", q1 === "ثابت" ? 0.2 : q1 === "منقلب" ? -0.2 : 0.1, 60);
  if ([...MAL].some((m) => T.H(m) === 1)) add("النحسُ في جهتِك: الخللُ يأتي منك، فانتبه.", -0.1, 60);
  if ([...MAL].some((m) => T.H(m) === 7)) add("النحسُ في جهة الشريك: الخللُ يأتي منه.", -0.2, 60);
}

// العقار والبيت [ورقة ٢٣–٢٥]
function estate(T, ch, add) {
  const l4 = T.lordOf(4), l7 = T.lordOf(7);
  if (T.applying(ch.ascLord, l7) || T.applying(ch.ascLord, l4) || T.applying("القمر", l4)) add("دليلُك يتّصلُ بدليل البيت: تملكُه.", 0.4, 24);
  if (ch.pos[l4]?.retrograde || T.afflicted(l4)) add("دليلُ العقار راجعٌ أو منحوس: فيه خللٌ أو خراب.", -0.3, 24);
  if ([...BEN].some((b) => T.H(b) === 4)) add("سعدٌ في بيت العقار: موضعٌ صالحٌ عامر.", 0.3, 24);
  const a = T.asp(ch.ascLord, l4);
  if (a) add(SOFT.has(a.name) ? "تنتفعُ بهذا العقار." : "تنتفعُ به لكن مع تعب.", SOFT.has(a.name) ? 0.2 : 0, 24);
}

// الكنز والدفين [ورقة ٢٥–٢٧]
function treasure(T, ch, add) {
  const l4 = T.lordOf(4);
  if ([...BEN].some((b) => T.H(b) === 4)) add("سعدٌ في الرابع: في الموضع شيءٌ له قيمة.", 0.2, 25);
  else add("لا سعدَ في الرابع: لا علامةَ على شيءٍ مدفون.", -0.2, 25);
  add(T.applying(ch.ascLord, l4) ? "دليلُك يتّصلُ بدليل الدفين: تصلُ إليه." : "لا اتّصالَ بينك وبين دليل الدفين: لا تصلُ إليه.", T.applying(ch.ascLord, l4) ? 0.3 : -0.3, 26);
  add(`نوعُه: ${PLANET_SUBSTANCE[l4]}؛ وموضعُه ${QUALITY_HEIGHT[T.sign(T.lon(l4)).quality]}.`, 0, 26);
}

// الرؤيا [ورقة ٧٥، ٧٩–٨٠]
function dream(T, ch, add) {
  const p = ["زحل", "المشتري", "المريخ", "الشمس", "الزهرة", "عطارد", "القمر"].find((x) => T.H(x) === 9) || ["زحل", "المشتري", "المريخ", "الشمس", "الزهرة", "عطارد", "القمر"].find((x) => T.H(x) === 1) || T.lordOf(9);
  add(`مادّةُ الرؤيا: ${DREAM_MATTER[p]} (من ${p}).`, 0, 80);
  const j = T.asp("المشتري", ch.ascLord);
  if (j && !HARD.has(j.name)) add("المشتري ينظرُ إلى دليلِك: الرؤيا صادقة.", 0.3, 75);
  const l9 = T.lordOf(9);
  if (T.afflicted(l9) && T.cadent(T.H(l9))) add("دليلُ الرؤيا منحوسٌ ساقط: أضغاثٌ لا تصدق.", -0.3, 80);
  else if (mtBen(T)) add("الدليلُ متّصلٌ بسعد: الرؤيا خيرٌ وتتحقّق.", 0.2, 80);
}

// الرجاء والأمنية [ورقة ٩٦]
function hope(T, ch, add) {
  const l11 = T.lordOf(11), a = T.applying(ch.ascLord, l11) || T.applying("القمر", l11);
  if (a) add(SOFT.has(a.name) ? "دليلُك يتّصلُ بدليل الرجاء: تنالُ ما تتمنّاه بسهولة." : "تنالُ ما تتمنّاه بعد إبطاء.", SOFT.has(a.name) ? 0.4 : 0.1, 96);
  const q = T.sign(T.lon("القمر")).quality;
  add(q === "ثابت" ? "إن تحقّق فيتحقّقُ كاملًا." : q === "ذو جسدين" ? "يتحقّقُ بعضُه." : "يتغيّرُ سريعًا، فاغتنمْه.", 0, 96);
}

// الصديق [ورقة ٩٦–٩٧]
function friend(T, ch, add) {
  const l11 = T.lordOf(11), a = T.asp(ch.ascLord, l11);
  if (a) add(SOFT.has(a.name) || a.name === "مقارنة" ? "تجتمعان، واجتماعُكما فيه سرورٌ ونفع." : "تجتمعان، لكن فيه شدٌّ ومضايقة.", SOFT.has(a.name) ? 0.3 : 0, 96);
  else add("لا اتّصالَ بين دليلِك ودليل الصديق الآن.", -0.2, 96);
}

const RULES = {
  "رزق": money, "مال": money, "عمل": work, "وظيفة": work, "سلطان": work, "صناعة": craft,
  "زواج": marriage, "حب": marriage, "طلاق": divorce, "ولد": child, "حمل": child,
  "مرض": illness, "صحة": illness, "سفر": travel, "غائب": absent, "خبر": absent, "كتاب": letter,
  "قضية": dispute, "دعوى": dispute, "عدو": dispute, "سحر": sihr, "دراسة": study, "علم": study,
  "سرقة": theft, "ضالة": lost, "حبس": prison, "بيع وشراء": sale, "شركة": partner, "عقار": estate,
  "كنز": treasure, "رؤيا": dream, "رجاء": hope, "صديق": friend,
};

export default { judge };
