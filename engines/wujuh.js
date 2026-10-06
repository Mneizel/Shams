// engines/wujuh.js
// ─────────────────────────────────────────────────────────────────────────────
// صورُ الوجوه الستّ والثلاثين: أيُّ صورةٍ «تطلعُ» في الأفق الآن، وصورةُ الطالع والشمس يومَ المولد،
// ومتى تطلعُ كلُّ صورةٍ في اليوم. المادّةُ في data/wujuh.data.js؛ هنا الحسابُ الفلكيُّ وحده (من engines/falak.js).
// ─────────────────────────────────────────────────────────────────────────────

import W from "../data/wujuh.data.js";
import falak from "./falak.js";

const norm = (x) => ((x % 360) + 360) % 360;

/** الوجهُ لطولٍ مسيريّ: البرج، ورقمُ الوجه (١..٣)، ودرجاتُه، وصورتُه، وما تدلّ عليه، وربُّ الوجه. */
export function faceOf(longitude) {
  const lon = norm(longitude), s = Math.floor(lon / 30), f = Math.min(2, Math.floor((lon - s * 30) / 10));
  const z = falak.zodiacOf(lon), d = W.FACES[s][f];
  return { index: s * 3 + f, signIndex: s, signName: z.sign, face: f + 1, from: f * 10, to: f * 10 + 10,
    degree: Math.round((lon - s * 30) * 10) / 10, ruler: z.face?.ruler || null, image: d.image, meaning: d.sign };
}

/** كلُّ الوجوه الستّة والثلاثين بالترتيب. */
export function all() {
  return W.FACES.flatMap((faces, s) => faces.map((_, f) => faceOf(s * 30 + f * 10 + 5)));
}

/** الوجهُ الطالعُ في الأفق الشرقيّ لحظةَ `when`. */
export function rising(when, lat, lon) { return faceOf(falak.ascendant(new Date(when), lat, lon).longitude); }

/** وجوهُ المولد: الطالع (إن عُرفت الساعة) والشمس والقمر. */
export function natal(birth, lat, lon, timeKnown = true) {
  const pos = falak.planetPositions(new Date(birth));
  return {
    ascendant: timeKnown ? rising(birth, lat, lon) : null,
    sun: faceOf(pos["الشمس"].longitude),
    moon: faceOf(pos["القمر"].longitude),
  };
}

/**
 * متى يطلعُ كلُّ وجهٍ في الساعات الـ٢٤ القادمة من `from`: لحظةُ دخول الطالع في الوجه وخروجه منه.
 * خطوةُ دقيقتين ثمّ تدقيقٌ بالثانية. الأفقُ يدورُ بالبروج كلّها في يومٍ واحد.
 */
export function risingTimes(from, lat, lon, hours = 24) {
  const t0 = new Date(from).getTime(), STEP = 120e3;
  const idx = (t) => faceOf(falak.ascendant(new Date(t), lat, lon).longitude).index;
  const out = new Map();
  let prev = idx(t0);
  out.set(prev, { ...all()[prev], enter: null, leave: null, now: true });
  for (let t = t0 + STEP; t <= t0 + hours * 3600e3; t += STEP) {
    const k = idx(t);
    if (k === prev) continue;
    let lo = t - STEP, hi = t;
    while (hi - lo > 1000) { const mid = (lo + hi) / 2; if (idx(mid) === prev) lo = mid; else hi = mid; }
    const cur = out.get(prev); if (cur && !cur.leave) cur.leave = new Date(hi);
    if (!out.has(k)) out.set(k, { ...all()[k], enter: new Date(hi), leave: null, now: false });
    prev = k;
  }
  return [...out.values()].sort((a, b) => (a.now ? -1 : b.now ? 1 : a.enter - b.enter));
}

export const INTRO = W.INTRO;
export const OUTSIDE = W.OUTSIDE;
export const OUTSIDE_NOTE = W.OUTSIDE_NOTE;

export default { faceOf, all, rising, natal, risingTimes, INTRO, OUTSIDE, OUTSIDE_NOTE };
