// engines/spirit-art.js
// ─────────────────────────────────────────────────────────────────────────────
// فنّ الأرواح: لكل كائن (ملَك/مَلِك/جنّيّ/مارد) نولّد:
//   1) خَتمًا SVG حتميًّا من اسمه على وفق كوكبه (نفس طريقة أختام الكواكب:
//      حوّل حروف الاسم إلى أعداد، وصِلها خطًّا على خانات الكامية).
//   2) برومبت صورة جاهزًا للصق في مولّد صور (أسلوب تذهيب مخطوط — رسمٌ فنيٌّ
//      صريحٌ لا "صورة حقيقية").
//   3) مسار خانة الصورة: assets/spirits/<slug>.png — إن وُضِع الملفّ ظهر مكان الخَتم.
// ─────────────────────────────────────────────────────────────────────────────

import abjad from "./abjad.js";
import awfaq from "./awfaq.js";
import { PLANET_ORDERS } from "./awfaq.js";

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** معرّف ملفّ من الاسم: حروف عربية + شرطات. */
export function slug(name) {
  return abjad.normalize(name).trim().replace(/\s+/g, "-") || "unknown";
}

/** كوكب الكائن: من الحقل إن وُجد، وإلا من جُمّل اسمه mod 7. */
const PLANETS_BY_REM = { 1: "زحل", 2: "المشتري", 3: "المريخ", 4: "الشمس", 5: "الزهرة", 6: "عطارد", 0: "القمر" };
export function planetOf(entity) {
  if (entity.planet && PLANET_ORDERS[entity.planet]) return entity.planet;
  const v = abjad.jummal(entity.name || entity.king || "");
  return PLANETS_BY_REM[v % 7];
}

/**
 * خَتم الكائن: خطٌّ يصل مواضع حروف اسمه على كامية كوكبه، داخل حلقةٍ تحمل الحروف.
 * @param {{name?:string,king?:string,planet?:string,color?:string}} entity
 * @param {{size?:number}} [opt]
 */
export function sigil(entity, opt = {}) {
  const name = entity.name || entity.king || "";
  const planet = planetOf(entity);
  const n = PLANET_ORDERS[planet];
  const square = awfaq.planetSquare(planet).square;
  const S = opt.size || 240;
  const pad = 34;
  const cell = (S - pad * 2) / n;
  const maxV = n * n;

  // موضع قيمةٍ على الكامية
  const cellOf = (v) => {
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++)
      if (square[r][c] === v) return [pad + c * cell + cell / 2, pad + r * cell + cell / 2];
    return [S / 2, S / 2];
  };

  // حروف الاسم ⇒ أعداد ضمن 1..n² (إسقاط بـ n²)
  const letters = abjad.letters(name);
  const pts = letters.map((ch) => {
    let v = abjad.jummal(ch) % maxV;
    if (v === 0) v = maxV;
    return cellOf(v);
  });

  let body = `<circle cx="${S / 2}" cy="${S / 2}" r="${S / 2 - 10}" stroke-opacity="0.35"/>`;
  body += `<circle cx="${S / 2}" cy="${S / 2}" r="${S / 2 - pad + 6}" stroke-opacity="0.15"/>`;
  // حلقة الحروف
  letters.forEach((ch, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(letters.length, 1);
    const rr = S / 2 - 20;
    body += `<text x="${S / 2 + rr * Math.cos(a)}" y="${S / 2 + rr * Math.sin(a)}" ` +
      `stroke="none" fill="currentColor" font-size="15" text-anchor="middle" ` +
      `dominant-baseline="central" font-family="'Amiri','Aref Ruqaa',serif">${esc(ch)}</text>`;
  });
  // خطّ الختم
  if (pts.length) {
    body += `<polyline points="${pts.map((p) => p.join(",")).join(" ")}" ` +
      `stroke-linejoin="round" stroke-linecap="round" stroke-width="2"/>`;
    body += `<circle cx="${pts[0][0]}" cy="${pts[0][1]}" r="4.5" fill="currentColor"/>`;
    const last = pts[pts.length - 1];
    body += `<rect x="${last[0] - 4}" y="${last[1] - 4}" width="8" height="8" fill="currentColor"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" direction="rtl" fill="none" ` +
    `stroke="currentColor" stroke-width="1.4">${body}</svg>`;
}

const KIND_AR = {
  angel: "ملَك", king: "مَلِك من ملوك الجانّ", jinn: "جنّيّ", marid: "مارد", shaytan: "شيطان",
  planet: "تجسيدٌ رمزيٌّ لكوكب", sign: "تجسيدٌ رمزيٌّ لبرج", mansion: "منظرٌ رمزيٌّ لمنزلةِ قمر"
};
const KIND_EN = {
  angel: "an angelic being", king: "an enthroned jinn-king", jinn: "a jinn",
  marid: "a colossal marid", shaytan: "a devil (shaytan)",
  planet: "a symbolic personification of a planet", sign: "a symbolic personification of a zodiac sign",
  mansion: "a symbolic celestial scene of a lunar mansion"
};

// مرساةُ أسلوبٍ واحدةٌ لكلّ الصور ليتّسق المعرض
const STYLE_EN =
  "14th-century Ilkhanid/Mamluk manuscript illumination; egg-tempera and gold leaf on aged " +
  "cream paper; flat non-perspectival space; symmetrical centered folio composition; ornamental " +
  "geometric border (decorative only); muted mineral palette (lapis, ochre, verdigris) with one " +
  "gold accent; visible paper grain and age foxing";
const NEG_EN =
  "no photorealism, no 3D render, no modern cinematic lighting, no lens blur, no readable text or " +
  "calligraphy anywhere, no real human likeness, no signature or watermark, no frame outside the border";
const STYLE_AR =
  "تذهيب مخطوطٍ إسلاميّ من القرن الثامن الهجري (إيلخانيّ/مملوكيّ)، تمبرا وذهبٌ مورَّق على ورقٍ " +
  "كريميٍّ عتيق، فضاءٌ مسطّحٌ بلا منظور، تكوينٌ متناظرٌ متمركزٌ كصفحةِ مخطوط، إطارٌ هندسيٌّ زخرفيٌّ " +
  "فقط، ألوانٌ معدنيّةٌ خافتة (لازورد، مغرة، زنجار) مع لمسةِ ذهبٍ واحدة، حبيباتُ ورقٍ وبقعُ قِدَم";
const NEG_AR =
  "بلا واقعيّةٍ فوتوغرافية، بلا تجسيمٍ ثلاثيّ، بلا إضاءةٍ سينمائيّة، بلا أيّ كتابةٍ أو خطٍّ مقروء، " +
  "بلا ملامحِ إنسانٍ حقيقيّ، بلا توقيعٍ أو علامةٍ مائيّة";

/**
 * برومبت صورة جاهز، بأسلوبٍ موحَّدٍ لكلّ الكائنات، بلا أيّ كتابة.
 * @param {object} entity  {name, kind?, color?, domain?/role?/story?/work?, planet?}
 * @param {{lang?:"ar"|"en"}} [opt]
 */
export function imagePrompt(entity, opt = {}) {
  const domain = entity.domain || entity.role || entity.story || entity.work || "";
  if (opt.lang === "en") {
    return [
      `A symbolic portrait of ${entity.name}, ${KIND_EN[entity.kind] || "a spirit"} from the ` +
      `Shams al-Maʿārif / classical Arabic occult tradition.`,
      domain && `Nature/office: ${domain}.`,
      entity.color && `Dominant colour of robes and aura: ${entity.color}.`,
      entity.planet && `Planetary attribution: ${entity.planet} (echo its classical symbolism).`,
      `Single centered figure, hieratic and frontal, with a plain gold halo/mandorla.`,
      `Style: ${STYLE_EN}.`,
      `Negative: ${NEG_EN}.`
    ].filter(Boolean).join(" ");
  }
  return [
    `صورةٌ رمزيّةٌ لـ«${entity.name}» — ${KIND_AR[entity.kind] || "كائنٌ من عالمِ الأرواح"} ` +
    `في تقليدِ شمس المعارف والتراثِ الروحانيّ العربيّ.`,
    domain && `طبعُه/وظيفتُه: ${domain}.`,
    entity.color && `لونُ ثوبِه وهالتِه الغالب: ${entity.color}.`,
    entity.planet && `يُقرَن بكوكبِ ${entity.planet} (استحضِرْ رمزيّتَه الكلاسيكيّة).`,
    `شخصٌ واحدٌ متمركزٌ، مواجِهٌ ومهيب، بهالةٍ ذهبيّةٍ بسيطة.`,
    `الأسلوب: ${STYLE_AR}.`,
    `ممنوع: ${NEG_AR}.`
  ].filter(Boolean).join(" ");
}

/** بطاقة كاملة يستهلكها صفحة الأرواح. */
export function card(entity) {
  const s = slug(entity.name || entity.king || "");
  return {
    name: entity.name || entity.king,
    kind: entity.kind || null,
    planet: planetOf(entity),
    slug: s,
    imageSlot: `assets/spirits/${s}.png`,
    sigilSvg: sigil(entity),
    imagePrompt: imagePrompt(entity),
    imagePromptEn: imagePrompt(entity, { lang: "en" }),
    description: entity.description || entity.role || entity.story || entity.domain || null
  };
}

export default { slug, planetOf, sigil, imagePrompt, card };
