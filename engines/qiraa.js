// engines/qiraa.js
// «قراءتُك الكاملة»: ما يُقالُ عن الشخصِ نفسِه من بطاقتِه — طبعُه وحالُه، وهويّتُه بالاسم (للمعرفة)، ودرجاتُ مولده،
// وعمرُه ومرحلتُه وسنتُه. بلا خطواتِ عمل. حتميّ: نفسُ البطاقة واليوم ⇒ نفسُ القراءة.

import falak from "./falak.js";
import ak from "./asma-khuddam.js";
import hal from "./hal.js";
import { AGES, AGES_SRC } from "../data/ages-ptolemy.data.js";

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
  return { hal: h, identity, natal, age };
}

export const AGES_LIST = AGES;
export default { full, ageStage, AGES_LIST };
