// engines/life.js — شغلُك ورزقُك وزواجُك من الخريطة، على قواعد بطليموس م٤ (ف٢، ف٤، ف٥). حتميّ.

import * as LP from "../data/life-ptolemy.data.js";

const BENEFIC = ["المشتري", "الزهرة"];
const QUAD = ["الحمل", "الثور", "الأسد", "القوس", "الجدي"]; // ذواتُ الأربع (تقريبًا كما عند بطليموس)
const HUMAN = ["الجوزاء", "السنبلة", "الميزان", "الدلو"];
const TROP = ["الحمل", "السرطان", "الميزان", "الجدي"];
const WET = ["السرطان", "العقرب", "الحوت", "الثور", "السنبلة"];

const aspected = (sky, a, b) => (sky.aspects || []).some((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
const houseOf = (sky, p) => (sky.houses || []).find((h) => h.planets.includes(p))?.n;

export function work(sky) {
  const THREE = ["عطارد", "الزهرة", "المريخ"];
  // صاحبُ العمل: ما في وسط السماء (العاشر) أوّلًا، ثمّ أقربُ المشرِّقين إلى الشمس
  let lords = THREE.filter((p) => houseOf(sky, p) === 10);
  let why = "في وسط السماء";
  if (!lords.length) {
    const sun = sky.planets["الشمس"].longitude;
    const orient = THREE.filter((p) => /مشرِّق/.test(sky.orientalOccidental?.[p]?.side || ""))
      .map((p) => ({ p, d: ((sun - sky.planets[p].longitude) + 360) % 360 })).filter((x) => x.d >= 15 && x.d <= 180).sort((a, b) => a.d - b.d); // تحت الشعاع (<١٥°) لم «يظهر»
    if (orient.length) { lords = [orient[0].p]; why = "أقربُ الكواكب ظهورًا صباحيًّا قبل الشمس"; }
  }
  if (!lords.length) {
    const mc = sky.houses?.[9]?.ruler;
    lords = [THREE.includes(mc) ? mc : "عطارد"];
    why = THREE.includes(mc) ? "صاحبُ وسط السماء" : "لا ظاهرَ ولا عاشرَ: بطليموس يقول إنّ أصحابَ هذه المواليد أكثرُهم قليلُ العمل، ويُنظَرُ في عطارد";
  }
  const key = lords.length > 1 ? [...lords].sort().join("+") : lords[0];
  const A = LP.ACTION[key] || LP.ACTION[lords[0]];
  const parts = [A.base];
  const lead = lords[0];
  if (lead === "المريخ" && aspected(sky, "المريخ", "الشمس") && A.sun) parts.splice(0, 1, A.sun);
  const sat = lords.some((p) => aspected(sky, p, "زحل")), jup = lords.some((p) => aspected(sky, p, "المشتري"));
  if (sat && A.saturn) parts.push(`وبشهادة زحل: ${A.saturn}`);
  if (jup && A.jupiter) parts.push(`وبشهادة المشتري: ${A.jupiter}`);
  const sg = sky.planets[lead].sign;
  const signNote = HUMAN.includes(sg) ? LP.ACTION_SIGNS.human : TROP.includes(sg) ? LP.ACTION_SIGNS.tropical : WET.includes(sg) ? LP.ACTION_SIGNS.watery : QUAD.includes(sg) ? LP.ACTION_SIGNS.quadruped : null;
  const h = houseOf(sky, lead);
  const amp = [1, 4, 7, 10].includes(h) ? LP.ACTION_AMPLITUDE.strong : [3, 6, 9, 12].includes(h) ? LP.ACTION_AMPLITUDE.weak : null;
  return { lords, why, text: parts.join("؛ "), signNote, amplitude: amp, sign: sg };
}

export function wealth(sky) {
  const lot = sky.lots?.lots?.["سهم السعادة"];
  if (!lot) return null;
  const SIGN_RULER = { الحمل: "المريخ", الثور: "الزهرة", الجوزاء: "عطارد", السرطان: "القمر", الأسد: "الشمس", السنبلة: "عطارد", الميزان: "الزهرة", العقرب: "المريخ", القوس: "المشتري", الجدي: "زحل", الدلو: "زحل", الحوت: "المشتري" };
  const lord = SIGN_RULER[lot.sign];
  const lh = houseOf(sky, lord);
  const strong = [1, 4, 7, 10, 2, 5, 8, 11].includes(lh);
  return { lotSign: lot.sign, lotHouse: lot.house, lord, lordHouse: lh, strong, text: LP.WEALTH_BY[lord],
    inherit: lord === "زحل" && aspected(sky, "زحل", "المشتري") ? "زحلُ صاحبُ السهم ينظرُه المشتري: سببٌ للميراث" : null };
}

export function marriage(sky, sex = "m") {
  const M = LP.MARRIAGE, f = sex === "f";
  const lum = f ? "الشمس" : "القمر";
  const p = sky.planets[lum];
  let east;
  if (!f) { const el = sky.moon?.elongation ?? 0; east = (el < 90) || (el >= 180 && el < 270); }
  else { const h = houseOf(sky, "الشمس"); east = [12, 11, 10, 6, 5, 4].includes(h); }
  const out = [];
  if (!f && sky.moon && sky.moon.elongation < 12 && aspected(sky, "القمر", "زحل")) out.push(M.none);
  out.push(east ? (f ? M.east_f : M.east_m) : (f ? M.west_f : M.west_m));
  const bi = p.signInfo?.quality === "ذو جسدين";
  out.push(bi ? (f ? "تتزوّجُ أكثرَ من مرّة" : M.multi) : M.single);
  const partners = ["زحل", "المشتري", "المريخ", "الزهرة", "عطارد"].filter((q) => aspected(sky, lum, q));
  const next = !f ? sky.moon?.nextAspectWith : null;
  const who = next && M.wife[next] ? [next] : partners;
  const spouse = who.map((q) => (f ? M.husband : M.wife)[q]).filter(Boolean);
  const good = who.some((q) => BENEFIC.includes(q)), bad = who.some((q) => ["زحل", "المريخ"].includes(q));
  return { luminary: lum, east, multi: bi, items: out, spouse, partners: who, quality: good && !bad ? "زواجٌ حسن" : bad && !good ? "فيه مشقّة" : null };
}

export function all(sky, sex = "m") {
  return { work: work(sky), wealth: wealth(sky), marriage: marriage(sky, sex), src: LP.LIFE_SRC };
}

export default { work, wealth, marriage, all };
