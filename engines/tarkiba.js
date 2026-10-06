// engines/tarkiba.js
// ─────────────────────────────────────────────────────────────────────────────
// «التركيبة الغريبة» — أداةٌ تجريبيّة (ليست من الكتب): تخلطُ أدواتٍ موجودةً في المحرّك لم تُستعمَل قبلُ،
// وتُقاسُ إصابتُها بإجابات «صح / غلط» من الناس. جُرِّبت أوّلَ مرّةٍ على خمسة أشخاصٍ (٢٠٢٦-١٠-٠٦):
// الطبعُ أصاب عندهم، والتوقيتُ بلا ساعة ميلادٍ لم يُصِب.
//   ١ الظاهر  = جُمّلُ الاسم + جُمّلُ الأمّ ⇒ الجذرُ الرقميّ ⇒ كوكبُه ووصفُه (جدولُ Cheiro)
//   ٢ الباطن  = التكسيرُ المركّب للاسم والأمّ ⇒ الجذر ⇒ كوكبُه ووصفُه
//   ٣ التوافق = عنصرا كوكبَي الظاهر والباطن (+ عنصرُ قمر الميلاد)
//   ٤ الاسمُ الباطن من الأسماء الحسنى = الباطن mod 99
//   ٥ شكلُ الرمل = الباطن mod 16
//   ٧ اليوم   = يومُ كوكب الباطن، وما يصلحُ فيه وما لا يصلح (أعمالُ الأيّام من كتب الاختيارات)
//   ٨ السنواتُ المفصليّة = الانتهاءُ السنويّ إلى الأوتاد (بطليموس) من الطالع، أو من برج الشمس إن جُهلت الساعة
// ─────────────────────────────────────────────────────────────────────────────

import abjad from "./abjad.js";
import khawass from "./khawass.js";
import raml from "./raml.js";
import falak from "./falak.js";
import { BIRTH_NUMBER } from "../data/hal-cheiro.data.js";
import { DAY_RULER_WORKS } from "../data/falak-ahkam.data.js";

const ELEMENT = { الشمس: "نار", المريخ: "نار", المشتري: "هواء", عطارد: "هواء", أورانوس: "هواء", الزهرة: "تراب", زحل: "تراب", القمر: "ماء", نبتون: "ماء" };
const FRIEND = (a, b) => a === b || (["نار", "هواء"].includes(a) && ["نار", "هواء"].includes(b)) || (["ماء", "تراب"].includes(a) && ["ماء", "تراب"].includes(b));
// أورانوس ونبتون (Cheiro) لا يومَ لهما في التقليد: يُؤخَذُ نظيرُهما (الشمس للرقم ٤، القمر للرقم ٧)
const CLASSIC = { أورانوس: "الشمس", نبتون: "القمر" };
const WEEKDAY = { الشمس: "الأحد", القمر: "الاثنين", المريخ: "الثلاثاء", عطارد: "الأربعاء", المشتري: "الخميس", الزهرة: "الجمعة", زحل: "السبت" };
const FLAVOR = { نار: "باندفاعٍ وجرأة", هواء: "بعقلٍ وحساب", ماء: "بعاطفةٍ وحساسيّة", تراب: "بصبرٍ وتأنٍّ" };
export const THEME = { 1: "سنةُ نفسِك: بدايةٌ جديدةٌ أو تغيّرٌ في طريقك وصحّتك", 4: "سنةُ البيت والأهل: سكنٌ أو انتقالٌ أو أمرٌ يخصّ العائلة", 7: "سنةُ الزواج والشراكة: ارتباطٌ أو شريكٌ أو خصومة", 10: "سنةُ العمل والمكانة: وظيفةٌ أو ترقيةٌ أو تغيّرٌ في المهنة" };
export const THEME_SHORT = { 1: "نفسك", 4: "البيت والأهل", 7: "الزواج والشراكة", 10: "العمل" };
const root = (n) => abjad.digitalRoot(n) || 9;

/**
 * @param c {name, mother, sex?, birth: Date, lat, lon, timeUnknown?: boolean, now?: Date}
 */
export function reading(c) {
  if (!c || !c.name || !c.mother || !c.birth) throw new Error("التركيبةُ تحتاجُ الاسمَ واسمَ الأمّ وتاريخَ الميلاد");
  const f = c.sex === "f";
  const Z = abjad.jummal(c.name) + abjad.jummal(c.mother);
  const B = abjad.taksirMurakkab(c.name).total + abjad.taksirMurakkab(c.mother).total;
  const rZ = root(Z), rB = root(B);
  const pZ = BIRTH_NUMBER[rZ]?.planet, pB = BIRTH_NUMBER[rB]?.planet, eZ = ELEMENT[pZ], eB = ELEMENT[pB];
  const agree = pZ === pB ? "same" : eZ === eB ? "element" : FRIEND(eZ, eB) ? "friends" : "opposed";
  const sky = falak.snapshot(c.birth, c.lat, c.lon);
  const moonEl = sky.planets["القمر"].signInfo?.element;
  const k_ = (m, fm) => (f ? fm : m);
  const agreeText = ({
    same: `${k_("ظاهرُك وباطنُك", "ظاهرُكِ وباطنُكِ")} من طبعٍ واحد`,
    element: `${k_("ظاهرُك وباطنُك", "ظاهرُكِ وباطنُكِ")} من عنصرٍ واحد مع اختلافٍ في الأسلوب`,
    friends: `بين ${k_("ظاهرك وباطنك", "ظاهركِ وباطنكِ")} انسجام، لكنّ الناسَ لا يرون كلَّ ما ${k_("فيك", "فيكِ")}`,
    opposed: `${k_("تُظهرُ", "تُظهرين")} للناس غيرَ ما في ${k_("داخلك", "داخلكِ")}، وقد ${k_("يُساءُ فهمُك", "يُساءُ فهمُكِ")}`,
  })[agree] + (moonEl && !FRIEND(moonEl, eB)
    ? `، لكنّ ${k_("مشاعرَك", "مشاعرَكِ")} متقلّبة، فأحيانًا ${k_("تُخفي", "تُخفين")} المشاكلَ اختصارًا لها، لا لأنّ${k_("ك", "كِ")} ${k_("غامض", "غامضة")}.`
    : `، و${k_("مشاعرُك", "مشاعرُكِ")} منسجمةٌ مع ${k_("طبعك", "طبعكِ")}.`);
  const hidden = khawass.nameByIndex((B % 99) || 99);
  const fig = raml.FIGURES[B % 16];
  const dayPlanet = CLASSIC[pB] || pB, works = DAY_RULER_WORKS[dayPlanet] || {};
  const day = { name: WEEKDAY[dayPlanet], planet: dayPlanet,
    text: `${k_("يومُك", "يومُكِ")} ${WEEKDAY[dayPlanet]}، يومُ ${dayPlanet} كوكبِ ${k_("اسمك", "اسمكِ")}: أنسبُ يومٍ ${k_("تبدأُ", "تبدئين")} فيه ${(works.good || []).join(" و")}${works.bad?.length ? `، ولا يُستحسَنُ فيه ${works.bad.join(" و")}` : ""}.` };
  // السنواتُ المفصليّة
  const startLon = c.timeUnknown ? sky.planets["الشمس"].longitude : sky.ascendant.longitude;
  const by = new Date(c.birth).getUTCFullYear(), bm = new Date(c.birth).getUTCMonth();
  const now = c.now ? new Date(c.now) : new Date();
  const pivots = [];
  for (let age = 16; age <= 70; age++) {
    const house = (age % 12) + 1;
    if (!THEME[house]) continue;
    const from = by + age;
    pivots.push({ age, from, to: from + 1, house, past: new Date(Date.UTC(from + 1, bm, 1)) < now, text: `${THEME[house]}، ${k_("وتعيشُها", "وتعيشينها")} ${FLAVOR[eB] || ""}`.trim() });
  }
  return {
    zahir: { n: Z, root: rZ, planet: pZ, element: eZ, text: BIRTH_NUMBER[rZ]?.text },
    batin: { n: B, root: rB, planet: pB, element: eB, text: BIRTH_NUMBER[rB]?.text },
    agree, agreeText,
    hiddenName: { name: hidden.name, khassa: hidden.khassa, index: (B % 99) || 99 },
    figure: { id: fig.id, ar: fig.ar, nature: fig.nature, meaning: fig.meaning },
    day, pivots,
    timingFrom: c.timeUnknown ? "sun" : "asc",
    descriptions: Object.fromEntries(Object.entries(BIRTH_NUMBER).map(([n, v]) => [n, { planet: v.planet, text: v.text }])),
    note: "أداةٌ تجريبيّة: تركيبةٌ من أدواتِ المحرّك، ليست من كتابٍ بعينه. التوقيتُ بلا ساعة ميلادٍ ضعيف.",
  };
}

export default { reading, THEME, THEME_SHORT };
