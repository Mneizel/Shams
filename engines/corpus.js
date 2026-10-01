// engines/corpus.js
// ─────────────────────────────────────────────────────────────────────────────
// بحثٌ نصّيّ داخل الكتاب — يعمل في المتصفّح وفي Node بلا سيرفر.
// المصدر: text/corpus.data.js (مُولَّد من OCR الكبرى عبر tools/build-corpus.js).
//
// تطبيعٌ عربيّ متسامح (تشكيل، همزات، ألف مقصورة، تاء مربوطة) ليجد الكلمة
// مهما كُتبت. ترتيبٌ بتكرار المصطلحات + مطابقة العبارة الكاملة.
// ─────────────────────────────────────────────────────────────────────────────

import { CORPUS } from "../text/corpus.data.js";

const DIAC = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
export function normAr(s) {
  return String(s)
    .normalize("NFC")
    .replace(DIAC, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[^ء-ي0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// فهرس مُطبَّع محضّر مرّة واحدة
const INDEX = CORPUS.map((c) => ({ ...c, norm: normAr(c.text) }));

export function stats() {
  const bySrc = {};
  for (const c of CORPUS) bySrc[c.src] = (bySrc[c.src] || 0) + 1;
  return { chunks: CORPUS.length, sources: bySrc, chars: INDEX.reduce((a, c) => a + c.text.length, 0) };
}

export function get(id) {
  return CORPUS.find((c) => c.id === id) || null;
}

/**
 * @param {string} query
 * @param {object} [opt]
 * @param {number} [opt.limit=20]
 * @param {number} [opt.context=90]  حروف السياق حول أول مطابقة
 * @param {string} [opt.src]         حصر البحث بمصدرٍ معيّن
 * @returns {{total:number, hits:Array<{id,src,score,snippet,text}>}}
 */
export function search(query, opt = {}) {
  const limit = opt.limit ?? 20;
  const ctx = opt.context ?? 90;
  const nq = normAr(query);
  if (!nq) return { total: 0, hits: [] };
  const terms = [...new Set(nq.split(" ").filter((t) => t.length >= 2))];
  const phrase = nq.length >= 4 ? nq : null;

  const scored = [];
  for (const c of INDEX) {
    if (opt.src && c.src !== opt.src) continue;
    let score = 0;
    for (const t of terms) {
      let idx = c.norm.indexOf(t), n = 0;
      while (idx !== -1) { n++; idx = c.norm.indexOf(t, idx + t.length); }
      if (n) score += n + 1; // مكافأة وجود المصطلح أصلًا
    }
    if (!score) continue;
    if (phrase && c.norm.includes(phrase)) score += 25; // مطابقة العبارة الكاملة
    // تفضيل المقاطع التي تجمع كل المصطلحات
    const covered = terms.filter((t) => c.norm.includes(t)).length;
    score += covered * 3;
    scored.push({ c, score, covered });
  }
  scored.sort((a, b) => b.score - a.score || b.covered - a.covered);
  const total = scored.length;

  const hits = scored.slice(0, limit).map(({ c, score }) => {
    // ابنِ المقتطف حول أول مصطلح يظهر
    let pos = -1;
    for (const t of terms) { const i = c.norm.indexOf(t); if (i !== -1 && (pos === -1 || i < pos)) pos = i; }
    if (pos === -1) pos = 0;
    const start = Math.max(0, pos - ctx);
    const end = Math.min(c.text.length, pos + ctx);
    let snippet = (start ? "… " : "") + c.text.slice(start, end).trim() + (end < c.text.length ? " …" : "");
    return { id: c.id, src: c.src, score, snippet, text: c.text };
  });
  return { total, hits };
}

export default { normAr, stats, get, search };
