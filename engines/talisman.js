// engines/talisman.js
// ─────────────────────────────────────────────────────────────────────────────
// محرّك رسم الطلاسم والأختام (SVG نصّي — يعمل في المتصفّح وفي Node)
//
// يرسم: شبكة الوفق بالأرقام، شبكة الحروف، خاتم بُدُوح، طلسم الخطّ (سيجيل)
// المرسوم بوصل خانات الوفق على ترتيب أعدادها، الأختام السبعة، وحلقة الحروف
// المقطّعة. كل الألوان بـ currentColor فتتبع سمة الصفحة (فاتح/داكن).
// ─────────────────────────────────────────────────────────────────────────────

const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
export const toArabicDigits = (n) => String(n).replace(/[0-9]/g, (d) => AR_DIGITS[+d]);

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function wrap(w, h, body, extra = "") {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" direction="rtl" ` +
    `fill="none" stroke="currentColor" stroke-width="1.5" ${extra}>` +
    body +
    `</svg>`
  );
}

// ── شبكة الوفق ───────────────────────────────────────────────────────────
/**
 * @param {number[][]} square
 * @param {object} [opt]
 * @param {number} [opt.cell=64]
 * @param {boolean} [opt.arabicDigits=true]
 * @param {string}  [opt.title]
 */
export function svgWafq(square, opt = {}) {
  const cell = opt.cell || 64;
  const n = square.length;
  const pad = 8;
  const size = n * cell + pad * 2;
  const fmt = opt.arabicDigits === false ? String : toArabicDigits;
  let body = `<rect x="${pad}" y="${pad}" width="${n * cell}" height="${n * cell}"/>`;
  for (let i = 1; i < n; i++) {
    const p = pad + i * cell;
    body += `<line x1="${p}" y1="${pad}" x2="${p}" y2="${pad + n * cell}"/>`;
    body += `<line x1="${pad}" y1="${p}" x2="${pad + n * cell}" y2="${p}"/>`;
  }
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const cx = pad + c * cell + cell / 2;
      const cy = pad + r * cell + cell / 2;
      body +=
        `<text x="${cx}" y="${cy}" stroke="none" fill="currentColor" ` +
        `font-size="${Math.round(cell * 0.34)}" text-anchor="middle" ` +
        `dominant-baseline="central" font-family="'Amiri','Aref Ruqaa',serif">${esc(fmt(square[r][c]))}</text>`;
    }
  }
  return wrap(size, size, body);
}

// ── شبكة الحروف ──────────────────────────────────────────────────────────
/** @param {string[][]} grid  مصفوفة حروف */
export function svgLetterGrid(grid, opt = {}) {
  const cell = opt.cell || 64;
  const rows = grid.length;
  const cols = Math.max(...grid.map((r) => r.length));
  const pad = 8;
  const w = cols * cell + pad * 2;
  const h = rows * cell + pad * 2;
  let body = `<rect x="${pad}" y="${pad}" width="${cols * cell}" height="${rows * cell}"/>`;
  for (let i = 1; i < cols; i++)
    body += `<line x1="${pad + i * cell}" y1="${pad}" x2="${pad + i * cell}" y2="${h - pad}"/>`;
  for (let i = 1; i < rows; i++)
    body += `<line x1="${pad}" y1="${pad + i * cell}" x2="${w - pad}" y2="${pad + i * cell}"/>`;
  // الأوفاق العربيّة تُكتَب وتُقرَأ من اليمين لليسار: الخانةُ الأولى (فهرس ٠) تقعُ
  // أقصى اليمين، لا أقصى اليسار كما يفترض SVG افتراضيًّا (x يكبر يمينًا).
  grid.forEach((row, r) =>
    row.forEach((ch, c) => {
      const rtlCol = cols - 1 - c;
      body +=
        `<text x="${pad + rtlCol * cell + cell / 2}" y="${pad + r * cell + cell / 2}" ` +
        `stroke="none" fill="currentColor" font-size="${Math.round(cell * 0.44)}" ` +
        `text-anchor="middle" dominant-baseline="central" font-family="'Amiri','Aref Ruqaa',serif">${esc(ch)}</text>`;
    })
  );
  return wrap(w, h, body);
}

// ── توقيع خاتمٍ بالزوايا والأضلاع ──────────────────────────────────────────
/**
 * مربّعٌ مزخرَفٌ فارغُ الوسط، بأربع كلماتٍ في زواياه الأربع وأربع كلماتٍ في
 * منتصف أضلاعه — لرسم "توقيع الخاتم" فعليًّا بدل وصفه نصًّا فقط.
 * @param {string[]} corners  أربع كلمات (بالترتيب: أعلى-يمين، أعلى-يسار، أسفل-يسار، أسفل-يمين)
 * @param {string[]} sides    أربع كلمات (أعلى، يسار، أسفل، يمين)
 */
export function svgCornerSeal(corners, sides, opt = {}) {
  const size = opt.size || 260;
  const pad = 30;
  const inner = size - pad * 2;
  const baseFs = size * 0.062;
  // خطٌّ أساسيّ للزوايا (٤ أحرف تقريبًا)، يصغر تلقائيًّا للكلمات الأطول (اسم خادمٍ/ملَكٍ قد يتجاوز ٨ أحرف)
  // كي لا تلامس حافّة الرسمة أو الإطار الداخليّ ولا تُقتَطع حروفُها.
  const fsFor = (text, base = 4) => {
    const n = Math.max(1, String(text).replace(/[ً-ْٰ]/g, "").length); // بلا تشكيل
    return Math.round(baseFs * Math.min(1, base / n));
  };
  const c = corners.map((s) => esc(s || "—"));
  const s = sides.map((s) => esc(s || "—"));
  const cFs = corners.map((s) => fsFor(s || "—", 4));
  const sFs = sides.map((s) => fsFor(s || "—", 3));
  const body = `
    <rect x="${pad}" y="${pad}" width="${inner}" height="${inner}"/>
    <rect x="${pad + 14}" y="${pad + 14}" width="${inner - 28}" height="${inner - 28}"/>
    <text x="${pad + 6}" y="${pad + 6}" font-size="${cFs[0]}" stroke="none" fill="currentColor" text-anchor="start" dominant-baseline="hanging" font-family="'Amiri','Aref Ruqaa',serif">${c[0]}</text>
    <text x="${size - pad - 6}" y="${pad + 6}" font-size="${cFs[1]}" stroke="none" fill="currentColor" text-anchor="end" dominant-baseline="hanging" font-family="'Amiri','Aref Ruqaa',serif">${c[1]}</text>
    <text x="${size - pad - 6}" y="${size - pad - 6}" font-size="${cFs[2]}" stroke="none" fill="currentColor" text-anchor="end" dominant-baseline="auto" font-family="'Amiri','Aref Ruqaa',serif">${c[2]}</text>
    <text x="${pad + 6}" y="${size - pad - 6}" font-size="${cFs[3]}" stroke="none" fill="currentColor" text-anchor="start" dominant-baseline="auto" font-family="'Amiri','Aref Ruqaa',serif">${c[3]}</text>
    <text x="${size / 2}" y="${pad + 4}" font-size="${sFs[0]}" stroke="none" fill="currentColor" text-anchor="middle" dominant-baseline="hanging" font-family="'Amiri','Aref Ruqaa',serif">${s[0]}</text>
    <text x="${pad + 4}" y="${size / 2}" font-size="${sFs[1]}" stroke="none" fill="currentColor" text-anchor="start" dominant-baseline="middle" font-family="'Amiri','Aref Ruqaa',serif">${s[1]}</text>
    <text x="${size / 2}" y="${size - pad - 4}" font-size="${sFs[2]}" stroke="none" fill="currentColor" text-anchor="middle" dominant-baseline="auto" font-family="'Amiri','Aref Ruqaa',serif">${s[2]}</text>
    <text x="${size - pad - 4}" y="${size / 2}" font-size="${sFs[3]}" stroke="none" fill="currentColor" text-anchor="end" dominant-baseline="middle" font-family="'Amiri','Aref Ruqaa',serif">${s[3]}</text>`;
  return wrap(size, size, body);
}

// ── خاتم بُدُوح ──────────────────────────────────────────────────────────
// بُدُوح = وفق ٣×٣ حروفه ب(2) د(4) و(6) ح(8) في مواضع أعدادها.
export const BUDUH_SQUARE = [
  [2, 7, 6],
  [9, 5, 1],
  [4, 3, 8]
];
const BUDUH_LETTERS = { 2: "ب", 4: "د", 6: "و", 8: "ح", 1: "ا", 3: "ج", 5: "ه", 7: "ز", 9: "ط" };
export function svgBuduh(opt = {}) {
  const letters = opt.letters !== false;
  const grid = BUDUH_SQUARE.map((row) => row.map((v) => (letters ? BUDUH_LETTERS[v] : v)));
  return letters ? svgLetterGrid(grid, opt) : svgWafq(BUDUH_SQUARE, opt);
}

// ── طلسم الخطّ (سيجيل الوفق) ─────────────────────────────────────────────
/**
 * يرسم خطًّا يصل مراكز الخانات على ترتيب أعدادها 1..n² (كما تُرسم أختام
 * الكواكب: قلمٌ لا يُرفع). دائرة صغيرة عند البداية ومربّع عند النهاية.
 */
export function svgSigil(square, opt = {}) {
  const cell = opt.cell || 48;
  const n = square.length;
  const pad = 14;
  const size = n * cell + pad * 2;
  const center = (v) => {
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        if (square[r][c] === v) return [pad + c * cell + cell / 2, pad + r * cell + cell / 2];
    return null;
  };
  const min = Math.min(...square.flat());
  const max = Math.max(...square.flat());
  const pts = [];
  for (let v = min; v <= max; v++) {
    const p = center(v);
    if (p) pts.push(p);
  }
  let body = `<rect x="${pad}" y="${pad}" width="${n * cell}" height="${n * cell}" stroke-opacity="0.25"/>`;
  body += `<polyline points="${pts.map((p) => p.join(",")).join(" ")}" stroke-linejoin="round" stroke-linecap="round" stroke-width="2"/>`;
  if (pts[0]) body += `<circle cx="${pts[0][0]}" cy="${pts[0][1]}" r="5" fill="currentColor"/>`;
  const last = pts.at(-1);
  if (last) body += `<rect x="${last[0] - 5}" y="${last[1] - 5}" width="10" height="10" fill="currentColor"/>`;
  return wrap(size, size, body);
}

// ── الأختام السبعة ──────────────────────────────────────────────────────
// تمثيلٌ هندسيّ مبسّط للأختام السبعة كما تُتداول في تقليد البوني/ابن عربي.
export function svgSevenSeals(opt = {}) {
  const u = opt.unit || 60;
  const gap = 24;
  const w = 7 * u + 8 * gap;
  const h = u + gap * 2;
  const x0 = (i) => gap + i * (u + gap);
  const y = gap;
  const parts = [
    // 1: ثلاث عصيّات
    `<path d="M0 0 V${u} M${u / 2} 0 V${u} M${u} 0 V${u}"/>`,
    // 2: خاتم بحلقة وذيل
    `<circle cx="${u / 2}" cy="${u * 0.38}" r="${u * 0.32}"/><path d="M${u / 2} ${u * 0.7} V${u}"/>`,
    // 3: سُلَّم بأربع درجات
    `<path d="M${u * 0.2} 0 V${u} M${u * 0.8} 0 V${u} M${u * 0.2} ${u * 0.2} H${u * 0.8} M${u * 0.2} ${u * 0.45} H${u * 0.8} M${u * 0.2} ${u * 0.7} H${u * 0.8} M${u * 0.2} ${u * 0.95} H${u * 0.8}"/>`,
    // 4: نجمة خماسية (خاتم سليمان)
    (() => {
      const cx = u / 2, cy = u / 2, R = u * 0.46;
      const p = Array.from({ length: 5 }, (_, k) => {
        const a = -Math.PI / 2 + (k * 4 * Math.PI) / 5;
        return `${cx + R * Math.cos(a)},${cy + R * Math.sin(a)}`;
      });
      return `<polygon points="${p.join(" ")}"/>`;
    })(),
    // 5: حلقة عليها خطّ (شبه ميم)
    `<circle cx="${u * 0.4}" cy="${u * 0.6}" r="${u * 0.28}"/><path d="M${u * 0.62} ${u * 0.42} L${u} 0"/>`,
    // 6: سلسلة حلقتين (شبه لام ألف)
    `<path d="M${u * 0.1} ${u} L${u * 0.5} 0 L${u * 0.9} ${u} M${u * 0.5} 0 V${u}"/>`,
    // 7: واو بذيل معقوف مع نقطة
    `<path d="M${u * 0.7} ${u * 0.15} a ${u * 0.25} ${u * 0.25} 0 1 1 -${u * 0.1} ${u * 0.4} L${u * 0.2} ${u}"/><circle cx="${u * 0.8}" cy="${u * 0.1}" r="2.5" fill="currentColor"/>`
  ];
  let body = "";
  parts.forEach((p, i) => {
    body += `<g transform="translate(${x0(i)},${y})">${p}</g>`;
    body += `<text x="${x0(i) + u / 2}" y="${y + u + 14}" stroke="none" fill="currentColor" font-size="12" text-anchor="middle">${toArabicDigits(i + 1)}</text>`;
  });
  return wrap(w, h + 16, body);
}

// ── حلقة الحروف المقطّعة ────────────────────────────────────────────────
/** يوزّع حروف النصّ على محيط دائرة، منفصلةً. */
export function svgLetterRing(text, opt = {}) {
  const letters = [...String(text).normalize("NFC").replace(/[^ء-ي]/g, "")];
  const R = opt.radius || 90;
  const size = R * 2 + 60;
  const cx = size / 2, cy = size / 2;
  let body = `<circle cx="${cx}" cy="${cy}" r="${R}" stroke-opacity="0.3"/>`;
  letters.forEach((ch, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / letters.length;
    const x = cx + R * Math.cos(a);
    const yy = cy + R * Math.sin(a);
    body +=
      `<text x="${x}" y="${yy}" stroke="none" fill="currentColor" font-size="22" ` +
      `text-anchor="middle" dominant-baseline="central" font-family="'Amiri','Aref Ruqaa',serif">${esc(ch)}</text>`;
  });
  return wrap(size, size, body);
}

export default {
  toArabicDigits,
  svgWafq,
  svgLetterGrid,
  svgBuduh,
  svgCornerSeal,
  svgSigil,
  svgSevenSeals,
  svgLetterRing,
  BUDUH_SQUARE
};
