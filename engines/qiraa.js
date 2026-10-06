// engines/qiraa.js
// «قراءتُك الكاملة»: ما يُقالُ عن الشخصِ نفسِه من بطاقتِه — طبعُه وحالُه، وهويّتُه بالاسم (للمعرفة)، ودرجاتُ مولده،
// وعمرُه ومرحلتُه وسنتُه. بلا خطواتِ عمل. حتميّ: نفسُ البطاقة واليوم ⇒ نفسُ القراءة.

import falak from "./falak.js";
import ak from "./asma-khuddam.js";
import hal from "./hal.js";
import life from "./life.js";
import { AGES, AGES_SRC } from "../data/ages-ptolemy.data.js";
import { DAY_ANGELS, BUNI_ANGELS_SRC } from "../data/angels-buni.data.js";

/** مرحلةُ العمر عند بطليموس */
export function ageStage(years) {
  let i = AGES.findIndex((a) => years >= a.from && (a.to == null || years < a.to));
  if (i < 0) i = AGES.length - 1;
  const a = AGES[i];
  return { ...a, index: i, yearsLeft: a.to == null ? null : Math.ceil(a.to - years), next: AGES[i + 1] || null, src: AGES_SRC };
}

/** @param c {name, mother, birth: Date, lat, lon, now?: Date} */
export function full(c) {
  if (!c || !c.name || !c.birth) throw new Error("القراءةُ الكاملةُ تحتاجُ الاسمَ وتاريخَ الميلادِ ووقتَه ومكانَه");
  const now = c.now ? new Date(c.now) : new Date();
  const sky = falak.snapshot(c.birth, c.lat, c.lon);
  const h = hal.reading(c);
  const id = c.mother ? ak.reading(c.name, c.mother) : null;
  const identity = id ? {
    planet: id.planet.name, element: id.element, nameSign: id.sign.name, mansion: id.mansion.name,
    angel: id.servant.angelOfPlanet, servant: id.servant.derivedServantName,
    angelDesc: DAY_ANGELS[id.planet.name] ? { ...DAY_ANGELS[id.planet.name], src: BUNI_ANGELS_SRC } : null,
  } : null;
  const natal = { sunSign: sky.planets["الشمس"].sign, ascendant: sky.ascendant.sign, moonSign: sky.planets["القمر"].sign, dayRuler: sky.day.planet };
  const years = (now - new Date(c.birth)) / (365.2422 * 86400000);
  const byNight = sky.lots && sky.lots.sect === "ليليّ";
  const age = {
    years: Math.floor(years),
    stage: ageStage(years),
    profection: falak.annualProfection(c.birth, now, sky.ascendant.longitude),
    firdaria: falak.firdaria(c.birth, now, { byNight }),
  };
  age.fortune = fortune(age, now);
  return { hal: h, identity, natal, age, life: life.all(sky, c.sex === "f" ? "f" : "m") };
}

export const AGES_LIST = AGES;

// السعدُ والنحسُ بطبعِ الكوكب: السعدان المشتري والزهرة، والنحسان زحل والمريخ، والباقي ممتزجٌ بحسب ما يقارنه
export const NATURE = { المشتري: "saad", الزهرة: "saad", زحل: "nahs", المريخ: "nahs", الشمس: "mixed", القمر: "mixed", عطارد: "mixed", الرأس: "saad", الذنب: "nahs" };
const NAT_AR = { saad: "سعد", nahs: "نحس", mixed: "وسط" };
const addYears = (d, y) => new Date(d.getTime() + y * 365.2422 * 86400000);
const fmtMY = (d) => `${["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"][d.getUTCMonth()]} ${d.getUTCFullYear()}`;

/** حكمٌ واحدٌ واضح: الفترةُ الكبرى والصغرى وسنةُ العمر — سعدٌ أم نحس، ومتى تنتهي. */
export function fortune(age, now) {
  const F = age.firdaria, maj = NATURE[F.majorLord], min = NATURE[F.minorLord], yr = NATURE[age.profection.yearLord];
  const endMaj = addYears(now, F.yearsLeftMajor), endMin = addYears(now, F.yearsLeftMinor);
  const overall = maj === min ? maj : (maj === "nahs" && min === "saad") || (maj === "saad" && min === "nahs") ? "mixed" : (maj === "mixed" ? min : maj);
  let line = `أنت الآن في مرحلةِ ${NAT_AR[maj]} (${F.majorLord}) حتّى ${fmtMY(endMaj)}`;
  if (min !== maj) line += min === "saad" ? `، وفي داخلها فترةٌ ألطف (${F.minorLord}) حتّى ${fmtMY(endMin)}` : min === "nahs" ? `، وفي داخلها فترةٌ أشدّ (${F.minorLord}) حتّى ${fmtMY(endMin)}` : `، وفي داخلها فترةٌ وسط (${F.minorLord}) حتّى ${fmtMY(endMin)}`;
  if (F.nextMinor && F.yearsLeftMinor < 1.5) line += `، ثمّ فترةُ ${F.nextMinor} (${NAT_AR[NATURE[F.nextMinor]]})`;
  line += `؛ وسنتُك هذه ${NAT_AR[yr]} (${age.profection.yearLord}).`;
  // المرحلةُ تمتدُّ سنوات، فلا تناقضُ «شهرًا طيّبًا» في «العارف»: يُقال ذلك صراحةً
  line += ` هذه مراحلُ عمرٍ تمتدُّ سنوات، والأشهرُ داخلها تختلف؛ تفصيلُها شهرًا بشهر في «العارف بالأمر».`;
  const next = F.nextLord ? `بعدها تبدأ مرحلةُ ${F.nextLord} (${NAT_AR[NATURE[F.nextLord]]}) في ${fmtMY(endMaj)}.` : "";
  return { overall, overallAr: NAT_AR[overall], line, next, major: { lord: F.majorLord, nature: maj, ends: endMaj }, minor: { lord: F.minorLord, nature: min, ends: endMin }, year: { lord: age.profection.yearLord, nature: yr } };
}
export default { full, ageStage, AGES_LIST };
