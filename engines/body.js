// engines/body.js
// شكلُ البدن من الخريطة: بطليموس (الكوكبُ الحاكم على الأفق مشرِّقًا/مغرِّبًا، وربعُ الطالع، وصورةُ البرج) وLilly (القامة،
// السِّمَن/النحافة، الوجه). حيث يتّفقُ الكتابان في القامة يُقال ذلك، وحيث يختلفان يُذكَرُ كلٌّ بنسبته. حتميّ.

import * as BF from "../data/body-form.data.js";

const QUAD = (sign) => Object.entries(BF.QUADRANT_FORM).find(([, q]) => q.signs.includes(sign));

/** @param sky falak.snapshot */
export function form(sky) {
  const asc = sky.ascendant, sign = asc.sign, half = asc.degreeInSign < 15 ? 0 : 1;
  const out = { ptolemy: [], lilly: [] };

  // بطليموس: الكواكبُ في الطالع (البيت الأوّل)، وإلّا صاحبُ الطالع
  const inAsc = (sky.houses?.[0]?.planets || []).filter((p) => BF.PLANET_FORM[p]);
  const lord = asc.signInfo?.ruler;
  const rulers = inAsc.length ? inAsc : (BF.PLANET_FORM[lord] ? [lord] : []);
  for (const p of rulers) {
    const oo = sky.orientalOccidental?.[p];
    const side = oo && /مشرِّق/.test(oo.side) ? "orient" : "occident";
    out.ptolemy.push({ who: `${p} ${inAsc.length ? "في الطالع" : "صاحبُ الطالع"} (${side === "orient" ? "مشرِّق" : "مغرِّب"})`, text: BF.PLANET_FORM[p][side] });
  }
  if (!rulers.length && lord) out.ptolemy.push({ who: `صاحبُ الطالع ${lord}`, text: "النيّرُ يعينُ الكوكبَ ولا يصفُ وحدَه: الشمسُ تُعطي هيبةً وقوّة، والقمرُ تناسبًا ونحافةً ورطوبة." });
  const q = QUAD(sign);
  if (q) out.ptolemy.push({ who: `الطالعُ في ربع ${({ spring: "الربيع", summer: "الصيف", autumn: "الخريف", winter: "الشتاء" })[q[0]]}`, text: q[1].text });
  const sh = [];
  if (BF.SIGN_SHAPE.larger.includes(sign)) sh.push("أكبرُ جسمًا");
  if (BF.SIGN_SHAPE.smaller.includes(sign)) sh.push("أصغرُ جسمًا");
  if (BF.SIGN_SHAPE.graceful.includes(sign)) sh.push("حسنُ التناسب رشيق");
  if (BF.SIGN_SHAPE.awkward.includes(sign)) sh.push("أقلُّ تناسبًا");
  if (sh.length) out.ptolemy.push({ who: `صورةُ برج ${sign}`, text: sh.join("، ") + "." });

  // Lilly
  out.lilly.push({ who: `القامة (${sign})`, text: BF.LILLY_STATURE[sign] + "." });
  const b = BF.LILLY_BUILD[sign];
  if (b) out.lilly.push({ who: `البدنُ بعد الثلاثين (${half ? "النصفُ الثاني" : "النصفُ الأوّل"} من ${sign})`, text: b[half] + "." });
  const F = BF.LILLY_FACE;
  if (F.fair.signs.includes(sign) || (half === 0 && F.fair.half1.includes(sign))) out.lilly.push({ who: "الوجه", text: F.fair.text });
  else if (F.plain.signs.includes(sign) || (half === 1 && F.plain.half2.includes(sign))) out.lilly.push({ who: "الوجه", text: F.plain.text });

  // اتّفاقُ الكتابين في القامة
  const tallP = BF.SIGN_SHAPE.larger.includes(sign), shortP = BF.SIGN_SHAPE.smaller.includes(sign);
  const st = BF.LILLY_STATURE[sign];
  const tallL = /طويل/.test(st) && !/معتدل/.test(st), shortL = /قصير/.test(st);
  const agree = (tallP && tallL) ? "يتّفقُ الكتابان على طولِ القامة" : (shortP && shortL) ? "يتّفقُ الكتابان على قِصَرِ القامة" : null;

  return { sign, ...out, agree, src: [BF.PTOLEMY_FORM_SRC, BF.LILLY_FORM_SRC] };
}

export default { form };
