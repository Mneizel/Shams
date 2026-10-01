// engines/talisman-named.js
// ─────────────────────────────────────────────────────────────────────────────
// طلاسمُ مسمّاةٌ مشهورةٌ من شمس المعارف والتقليد المتّصل، مرسومةٌ SVG.
// بعضُها مربّعاتٌ/شبكاتٌ يولّدها المحرّك بالقاعدة، وبعضُها أشكالٌ اصطلاحيّةٌ
// (خاتم سليمان، العقرب…) مرسومةٌ تمثيلًا. لا فاعلية لأيٍّ منها.
// ─────────────────────────────────────────────────────────────────────────────

import abjad from "./abjad.js";
import awfaq from "./awfaq.js";
import tal from "./talisman.js";

const wrap = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" direction="rtl" fill="none" ` +
  `stroke="currentColor" stroke-width="1.6">${body}</svg>`;
const txt = (x, y, s, size = 16) =>
  `<text x="${x}" y="${y}" stroke="none" fill="currentColor" font-size="${size}" ` +
  `text-anchor="middle" dominant-baseline="central" font-family="'Amiri','Aref Ruqaa',serif">${s}</text>`;

function star(cx, cy, R, points, step) {
  const p = [];
  for (let i = 0; i < points; i++) {
    const a = -Math.PI / 2 + (i * step * 2 * Math.PI) / points;
    p.push(`${(cx + R * Math.cos(a)).toFixed(1)},${(cy + R * Math.sin(a)).toFixed(1)}`);
  }
  return `<polygon points="${p.join(" ")}"/>`;
}

// ── الطلاسم ─────────────────────────────────────────────────────────────
export const NAMED = [
  {
    id: "khatam-sulayman-6",
    name: "خاتم سليمان (النجمة السداسية)",
    purpose: "التحصين العامّ وتسخير الرَّوحانيّات؛ أشهر الأختام على الإطلاق.",
    usage: "التقليدُ العامُّ لهذا الختم: يُكتَب على ورقةٍ أو يُنقَش على خاتمٍ من فضّة، ويُحمَل مع صاحبه أو يُعلَّق في البيت — لا عملَ زمنيٌّ خاصٌّ به، هو حرزٌ دائم.",
    svg: () => wrap(160, 160,
      `<circle cx="80" cy="80" r="70" stroke-opacity=".35"/>` +
      star(80, 80, 60, 3, 1) + star(80, 80, 60, 3, -1) +
      `<circle cx="80" cy="80" r="30" stroke-opacity=".5"/>`)
  },
  {
    id: "khatam-5",
    name: "الخاتم المخمَّس (النجمة الخماسية)",
    purpose: "الحفظ ودفع الأذى؛ يُكتَب في زواياه أسماءٌ أو حروفٌ نارية.",
    usage: "يُكتَب على ورقةٍ صغيرة، تُطوى وتُحمَل في الجيب أو تُعلَّق كتعويذة على الصدر — حرزٌ يومي، لا يحتاج توقيتًا خاصًّا.",
    svg: () => wrap(160, 160,
      `<circle cx="80" cy="80" r="70" stroke-opacity=".35"/>` + star(80, 80, 62, 5, 2) +
      ["ا", "ه", "ط", "م", "ف"].map((c, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        return txt(80 + 74 * Math.cos(a), 80 + 74 * Math.sin(a), c, 15);
      }).join(""))
  },
  {
    id: "buduh",
    name: "خاتم بُدُوح",
    purpose: "تيسير الولادة، وصول الرسائل والأمتعة، قضاء الحوائج العاجلة.",
    usage: "يُكتَب على الشيء المُرسَل نفسه أو على ورقةٍ تُرفَق معه (لتيسير وصوله)، أو تحمله المرأةُ عند المخاض (لتيسير الولادة) — يُقصَد به تعجيلُ أمرٍ محدَّد لا حفظٌ دائم.",
    svg: () => tal.svgBuduh({ cell: 46 })
  },
  {
    id: "muthallath",
    name: "الوفق المثلَّث (لوح زحل)",
    purpose: "أوّل الأوفاق؛ للحبس والتعطيل وثبات الأمر، ولتيسير الولادة أيضًا.",
    usage: "لطبعه الحابس (زحل): يُكتَب ويُدفَن أو يوضَع تحت الشيء المطلوب تثبيتُه أو تعطيلُه، ويُفضَّل يوم السبت. للولادة: يُحمَل مع المرأة وقت المخاض حسب الرواية.",
    svg: () => tal.svgWafq(awfaq.planetSquare("زحل").square, { cell: 52 })
  },
  {
    id: "huruf-nariyya",
    name: "الحروف النارية السبعة (أ ه ط م ف ش ذ)",
    purpose: "تُدار في حلقةٍ لأعمال القهر والهيبة وإحراق التوابع.",
    usage: "هذه ليست حرزًا يُحمَل لوحده — هي عنصرٌ يُكتَب داخل عزيمةٍ أكبر (شوف «التسخير والتصريف») حول اسم المقصود أو صورته الرمزية، ضمن عملٍ كاملٍ له يومٌ وساعةٌ وبخور.",
    svg: () => tal.svgLetterRing("اهطمفشذ", { radius: 66 })
  },
  {
    id: "sab-khawatim",
    name: "الخواتم السبعة (خواتيم سليمان)",
    purpose: "تُكتَب متتاليةً على الحرز؛ لكلّ خاتمٍ سرٌّ وبابٌ من الأبواب.",
    usage: "تُكتَب السبعةُ معًا على حرزٍ واحد (ورقةٌ أو رقٌّ)، ثمّ يُحمَل ذلك الحرزُ كاملًا — لا يُفصَل خاتمٌ عن آخر عادةً.",
    svg: () => tal.svgSevenSeals({ unit: 46 })
  },
  {
    id: "hummaa",
    name: "طلسم الحُمّى (المتناقص)",
    purpose: "يُكتَب «بسم الله الرحمن الرحيم» ناقصًا حرفًا كلَّ سطر حتى يفنى؛ لتنقص الحُمّى كما نقص.",
    usage: "يُكتَب على ورقةٍ ويُعلَّق على المريض نفسه (لا يُحمَل من شخصٍ آخر)، وفي بعض الروايات يُغسَل المكتوبُ بماءٍ ويُشرَب — هذا تنبيهٌ لك بحقيقته لا وصفةٌ نُشجِّع عليها.",
    svg: () => {
      const s = "بسم الله الرحمن الرحيم".replace(/ /g, "");
      let body = "";
      for (let i = 0; i < s.length; i += 2) body += txt(150, 16 + i * 9, s.slice(0, s.length - i), 15);
      return wrap(300, 16 + s.length * 9 + 8, body);
    }
  },
  {
    id: "aqrab",
    name: "طلسم العقرب (اللدغة)",
    purpose: "يُرسَم على شكل عقربٍ محاطٍ بحروف؛ يُزعَم لدفع لدغِها وردِّ أذى الحاسد.",
    usage: "يُرسَم على ورقةٍ أو يُنقَش على معدن، ويُعلَّق في المكان المطلوب حمايتُه من العقارب (زاوية بيت، مدخل)، أو يُحمَل على الجسد لردّ الحسد.",
    svg: () => wrap(200, 160,
      `<circle cx="100" cy="80" r="72" stroke-opacity=".3"/>` +
      // جسم العقرب
      `<path d="M70 80 q10 -12 22 0 q10 -12 22 0 q10 -12 22 0" />` +
      `<path d="M70 80 q-14 4 -18 18 q-2 10 6 16" />` +          // ذيل
      `<circle cx="140" cy="80" r="6"/>` +                       // رأس
      `<path d="M144 76 l14 -8 M144 84 l14 8" />` +              // كلابتان
      `<path d="M84 82 l-6 12 M96 82 l-4 14 M108 82 l0 14 M120 82 l4 14" />` + // أرجل
      ["ب", "ط", "ش", "ذ", "ه", "ف"].map((c, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 6;
        return txt(100 + 84 * Math.cos(a), 80 + 84 * Math.sin(a), c, 14);
      }).join(""))
  },
  {
    id: "wafq-mia",
    name: "الوفق المئيني (مجموعه ١٠٠)",
    purpose: "للقبول والوجاهة؛ ١٠٠ عدد اسم «كافي» وبعض ما يُطلَب به الكفاية.",
    usage: "يُكتَب على ورقةٍ ويُحمَل عند لقاء من تطلب قبولَه أو وجاهتك عنده، ويُفضَّل يوم الشمس (الأحد) لأنّ القبولَ والهيبة من طبعها.",
    svg: () => tal.svgWafq(awfaq.wafqForTarget(4, 100).square, { cell: 52 })
  },
  {
    id: "wafq-wadud",
    name: "خاتم المحبّة (وفق «ودود»)",
    purpose: "للمودّة والألفة والقبول؛ مجموعه جُمّل «ودود».",
    usage: "يُكتَب يومَ الجمعة (يوم الزهرة، كوكب المحبّة) ويُحمَل، أو يُوضَع في مكانٍ قريبٍ من الشخص المطلوب استمالتُه حسب الرواية.",
    svg: () => {
      const t = abjad.jummal("ودود");
      return tal.svgWafq(awfaq.wafqForTarget(3, t).square, { cell: 54 });
    }
  },
  {
    id: "harz-kursi",
    name: "حرز آية الكرسي (اللوح المؤطَّر)",
    purpose: "يُكتَب فيه نصُّ آية الكرسي كاملًا محاطًا بإطارٍ من الأسماء؛ للتحصين والحفظ.",
    usage: "يُكتَب كاملًا (نصُّ الآية والإطار) على ورقةٍ أو رقّ، ويُحمَل باستمرار أو يُعلَّق عند الباب/السرير — حرزٌ يوميٌّ دائم، لا يحتاج توقيتًا.",
    svg: () => {
      const AYAH_LINES = [
        "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ",
        "الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ",
        "سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي",
        "السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ",
        "مَن ذَا الَّذِي يَشْفَعُ عِنْدَهُ",
        "إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ",
        "أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا",
        "يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا",
        "بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ",
        "السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ",
        "حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ"
      ];
      const size = 320, pad = 12, lineH = 20, fs = 15;
      const textTop = 70;
      const textBlock = AYAH_LINES.map((line, i) =>
        `<text x="${size / 2}" y="${textTop + i * lineH}" stroke="none" fill="currentColor" ` +
        `font-size="${fs}" text-anchor="middle" dominant-baseline="central" font-family="'Amiri','Aref Ruqaa',serif">${line}</text>`
      ).join("");
      return wrap(size, size,
        `<rect x="${pad}" y="${pad}" width="${size - pad * 2}" height="${size - pad * 2}"/>` +
        `<rect x="${pad + 14}" y="${pad + 14}" width="${size - (pad + 14) * 2}" height="${size - (pad + 14) * 2}" stroke-opacity=".5"/>` +
        textBlock +
        ["يا حفيظ", "يا رقيب", "يا مانع", "يا سلام"].map((c, i) => {
          const pos = [[size / 2, pad + 5], [size - pad - 5, size / 2], [size / 2, size - pad - 5], [pad + 5, size / 2]][i];
          return txt(pos[0], pos[1], c, 12);
        }).join(""));
    }
  },
  {
    id: "wafq-name",
    name: "وفق الاسم (يُولَّد لكلِّ اسم)",
    purpose: "المربّع الشخصيّ الذي مجموعُه السحريّ جُمّل الاسم؛ أساسُ معظم الأعمال الفرديّة.",
    usage: "هذا الوفقُ الوحيدُ من الاثني عشر المرتبطُ باسمك أنت تحديدًا (الباقي عامّةٌ لأيّ أحد) — لأنّ مجموع كلِّ صفٍّ وعمودٍ فيه صُمِّم عمدًا ليساوي جُمّل اسمك بالضبط، فيتغيّر شكلُ الأرقام كلَّما تغيّر الاسم. يُكتَب ويُحمَل كحرزٍ عام، أو يُستعمَل كخاتمٍ داخل عملٍ مخصَّص لك (شوف «التسخير والتصريف»).",
    svg: (name = "محمد") => {
      const t = abjad.jummal(name);
      const order = [3, 4, 5, 6].find((n) => t % n === 0) || 4;
      return tal.svgWafq(awfaq.wafqForTarget(order, t).square, { cell: 48 });
    }
  }
];

export function list() {
  return NAMED.map(({ id, name, purpose, usage }) => ({ id, name, purpose, usage }));
}

export function render(id, arg) {
  const t = NAMED.find((x) => x.id === id);
  if (!t) throw new Error("طلسم غير معروف: " + id);
  return { id: t.id, name: t.name, purpose: t.purpose, usage: t.usage, svg: t.svg(arg) };
}

export function renderAll(name) {
  return NAMED.map((t) => ({ id: t.id, name: t.name, purpose: t.purpose, usage: t.usage, svg: t.id === "wafq-name" ? t.svg(name) : t.svg() }));
}

export default { NAMED, list, render, renderAll };
