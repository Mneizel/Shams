// web/kaf-shape.js — قياسُ شكلِ اليدِ من «قناعِها» (حدودِها بالبكسل) ونقاطِها الـ٢١.
// القناعُ من نموذج MediaPipe Interactive Segmenter (Magic Touch): يُعطى نقطةً في وسطِ الراحة فيُرجِعُ
// حدودَ اليدِ كاملةً بأصابعِها. هنا لا تعلُّمَ ولا تخمين: هندسةٌ صرفةٌ على ذلك القناع.
//
// ما يُقاس (بنصِّ تعريفاتِ الكتاب لأنواعِ اليد):
//   • شكلُ طرفِ كلِّ إصبع: يُقاسُ عرضُ الإصبعِ عموديًّا على محورِه على طولِ السُّلامى الطرفيّة (من مفصلِها
//     حتى نهايةِ القناع): يبقى عريضًا ثمّ ينتهي فجأةً ⇒ مربّع؛ يدِقُّ تدريجيًّا ⇒ مخروطيّ؛ يدِقُّ بشدّة ⇒
//     مدبّب؛ يتّسعُ قربَ الطرف ⇒ مفلطح.
//   • عُقَدُ المفاصل: عرضُ الإصبعِ عند المفصلِ مقارنةً بوسطِ السُّلامَيَين حوله.
//   • عرضُ الراحةِ الحقيقيّ من حافّتِها إلى حافّتِها (بدلَ تقديرِه من المسافةِ بين مفصلَيْن).

const P = { WRIST: 0, THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4, IDX_MCP: 5, IDX_PIP: 6, IDX_DIP: 7, IDX_TIP: 8,
  MID_MCP: 9, MID_PIP: 10, MID_DIP: 11, MID_TIP: 12, RING_MCP: 13, RING_PIP: 14, RING_DIP: 15, RING_TIP: 16,
  PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20 };
export const FINGER_IDS = { index: [5, 6, 7, 8], middle: [9, 10, 11, 12], ring: [13, 14, 15, 16], little: [17, 18, 19, 20] };

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const len = (v) => Math.hypot(v.x, v.y);
const norm = (v) => { const l = len(v) || 1; return { x: v.x / l, y: v.y / l }; };

/** يُبقي من القناعِ ما فوق الرسغِ فقط (الذراعُ وما يلتصقُ به من خلفيّةٍ خارجَ الحساب). */
export function cropToHand(mask, w, h, px) {
  const axis = norm(sub(px[P.MID_MCP], px[P.WRIST]));
  const palm = len(sub(px[P.MID_MCP], px[P.WRIST]));
  // حدُّ القطع: قليلًا تحت نقطةِ الرسغ (النقطةُ في مركزِ الرسغ، وأسفلُ الراحةِ ينتهي عندها تقريبًا)
  const cut = { x: px[P.WRIST].x - axis.x * palm * 0.05, y: px[P.WRIST].y - axis.y * palm * 0.05 };
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (mask[i] && (x - cut.x) * axis.x + (y - cut.y) * axis.y >= 0) out[i] = 1;
  }
  return out;
}

/** عرضُ القناعِ عند نقطةٍ عموديًّا على اتّجاه (يمشي من النقطةِ للجهتين حتى يخرجَ من القناع). */
function widthAt(mask, w, h, c, dir, maxR) {
  const nx = -dir.y, ny = dir.x;
  const inside = (t) => { const x = Math.round(c.x + nx * t), y = Math.round(c.y + ny * t); return x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x]; };
  if (!inside(0)) return 0;
  let a = 0, b = 0;
  while (a < maxR && inside(-(a + 1))) a++;
  while (b < maxR && inside(b + 1)) b++;
  // لمس حدِّ البحث = الإصبعُ ملتصقٌ بجارِه أو بالخلفيّة ⇒ القياسُ غيرُ صالح
  if (a >= maxR || b >= maxR) return NaN;
  return a + b + 1;
}

/** امتدادُ القناعِ على خطٍّ يمرُّ بنقطةٍ في اتّجاهٍ معيّن: كم يمتدُّ نحوه وعكسَه. */
function spanAt(mask, w, h, c, dir, maxR) {
  const inside = (t) => { const x = Math.round(c.x + dir.x * t), y = Math.round(c.y + dir.y * t); return x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x]; };
  if (!inside(0)) return null;
  let a = 0, b = 0;
  while (a < maxR && inside(a + 1)) a++;
  while (b < maxR && inside(-(b + 1))) b++;
  if (a >= maxR || b >= maxR) return null;
  return { toThumb: a, away: b, total: a + b + 1 };
}

/** ملفُّ عرضِ إصبعٍ على طولِ السُّلامى الطرفيّة + عُقَدُه. */
export function fingerProfile(mask, w, h, px, ids) {
  const [mcp, pip, dip, tip] = ids.map((i) => px[i]);
  const dir = norm(sub(tip, dip));
  const fingerLen = len(sub(pip, mcp)) + len(sub(dip, pip)) + len(sub(tip, dip));
  const maxR = fingerLen * 0.25;
  // نهايةُ الإصبعِ الفعليّة: أبعدُ نقطةٍ داخلَ القناعِ على امتدادِ المحور بعد نقطةِ الطرف
  let end = 0;
  const step = 0.5;
  for (let t = 0; t < fingerLen * 0.25; t += step) {
    const x = Math.round(tip.x + dir.x * t), y = Math.round(tip.y + dir.y * t);
    if (x < 0 || y < 0 || x >= w || y >= h || !mask[y * w + x]) break;
    end = t;
  }
  const L = len(sub(tip, dip)) + end; // طولُ السُّلامى الطرفيّة حتى حدِّ القناع
  const at = (f) => ({ x: dip.x + dir.x * L * f, y: dip.y + dir.y * L * f });
  const prof = [];
  for (let f = 0.15; f <= 0.951; f += 0.05) prof.push({ f: +f.toFixed(2), w: widthAt(mask, w, h, at(f), dir, maxR) });
  const W = (f) => { const p = prof.find((q) => Math.abs(q.f - f) < 0.026); return p ? p.w : NaN; };
  // العُقَد: عرضُ المفصلِ مقارنةً بوسطِ السُّلامَيَين المجاورتَين
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const dProx = norm(sub(pip, mcp)), dMid = norm(sub(dip, pip));
  const wProxMid = widthAt(mask, w, h, mid(mcp, pip), dProx, maxR);
  const wMidMid = widthAt(mask, w, h, mid(pip, dip), dMid, maxR);
  const wDistMid = W(0.45);
  const wPip = widthAt(mask, w, h, pip, norm(sub(dip, mcp)), maxR);
  const wDip = widthAt(mask, w, h, dip, norm(sub(tip, pip)), maxR);
  return { L, fingerLen, prof, w45: wDistMid, w75: W(0.75), w85: W(0.85), w30: W(0.3), wProxMid, wMidMid, wPip, wDip };
}

/** يصنّفُ طرفَ الإصبع، أو null إن لم يصحَّ القياس. */
export function tipShape(fp) {
  const { w30, w45, w75, w85 } = fp;
  if (![w30, w45, w75, w85].every((v) => Number.isFinite(v) && v > 2)) return { shape: null, why: "قياسٌ غيرُ صالح (الإصبعُ ملتصقٌ بجارِه أو خارجَ الصورة)" };
  const r75 = w75 / w45, r85 = w85 / w45;
  // قريبٌ من الحدِّ بين شكلين (خطأُ القياسِ نحوُ ±٠٫٠٢) ⇒ لا يُحكَم
  const near = (v, t) => Math.abs(v - t) < 0.02;
  if (near(r75, 1.04) || near(r75, 0.93) || near(r75, 0.8) || near(r85, 0.84) || near(r85, 0.62)) {
    return { shape: null, r75: +r75.toFixed(3), r85: +r85.toFixed(3), why: "على الحدِّ بين شكلين — لا يُحكَمُ عليه" };
  }
  let shape;
  if (r75 >= 1.04 && r85 >= 0.98) shape = "spatulate";
  else if (r75 >= 0.93 && r85 >= 0.84) shape = "square";
  else if (r75 < 0.8 || r85 < 0.62) shape = "pointed";
  else shape = "conic";
  return { shape, r75: +r75.toFixed(3), r85: +r85.toFixed(3) };
}

export function knots(fp) {
  const base = [fp.wProxMid, fp.wMidMid, fp.w45].filter((v) => Number.isFinite(v) && v > 2);
  const j = [fp.wPip, fp.wDip].filter((v) => Number.isFinite(v) && v > 2);
  if (base.length < 2 || j.length < 2) return null;
  const k = Math.max(...j) / (base.reduce((a, b) => a + b, 0) / base.length);
  return +k.toFixed(3);
}

/** عرضُ الراحةِ من حافّةٍ إلى حافّة، تحت مفاصلِ الأصابعِ بقليل (فوقَ منبتِ الإبهام). */
export function palmWidth(mask, w, h, px) {
  const across = norm(sub(px[P.PINKY_MCP], px[P.IDX_MCP]));
  const down = norm(sub(px[P.WRIST], px[P.MID_MCP]));
  const palm = len(sub(px[P.MID_MCP], px[P.WRIST]));
  const c0 = { x: (px[P.IDX_MCP].x + px[P.PINKY_MCP].x) / 2, y: (px[P.IDX_MCP].y + px[P.PINKY_MCP].y) / 2 };
  const res = [];
  // الإبهامُ الملاصقُ للراحة يدخلُ في القناعِ فيُوهِمُ بعرضٍ أكبر: يُتحقَّقُ أنّ حافّةَ الراحةِ من جهةِ
  // الإبهامِ لا تبلغُ مفصلَه (وإلّا فالقياسُ يشملُ الإبهامَ ولا يصحّ)
  const thumbSide = { x: -across.x, y: -across.y };
  for (const f of [0.15, 0.2, 0.25]) {
    const c = { x: c0.x + down.x * palm * f, y: c0.y + down.y * palm * f };
    const span = spanAt(mask, w, h, c, thumbSide, palm * 1.2);
    if (!span) continue;
    const thumbAt = (px[P.THUMB_MCP].x - c.x) * thumbSide.x + (px[P.THUMB_MCP].y - c.y) * thumbSide.y;
    if (span.toThumb >= thumbAt * 0.85) continue; // الإبهامُ ملتصقٌ هنا
    res.push(span.total);
  }
  if (!res.length) return null;
  res.sort((a, b) => a - b);
  return res[Math.floor(res.length / 2)];
}


/** الإبهام من القناع: السُّلامى الأولى (الظفريّة) من مفصلِه إلى حدِّ القناع، والثانية من مفصلِ القاعدة إلى مفصلِه،
 *  وعُقدةُ مفصلِه. يُعيدُ نسبةَ الأولى إلى الثانية (أو null إن لم يصحّ القياس). */
export function measureThumb(mask, w, h, px) {
  const fp = fingerProfile(mask, w, h, px, [P.THUMB_CMC, P.THUMB_MCP, P.THUMB_IP, P.THUMB_TIP]);
  const second = len(sub(px[P.THUMB_IP], px[P.THUMB_MCP]));
  const first = fp.L;
  const okW = (v) => Number.isFinite(v) && v > 2;
  const base = [fp.wMidMid, fp.w45].filter(okW);
  const knot = okW(fp.wDip) && base.length === 2 ? +(fp.wDip / ((base[0] + base[1]) / 2)).toFixed(3) : null;
  return { ratio: second > 2 ? +(first / second).toFixed(3) : null, knot, w45: fp.w45 };
}

/** بروزُ تلَّي الزهرة (كُرةِ الإبهام) والقمر (حافّةِ الكفّ تحت الخنصر) من حدودِ القناع:
 *  بُعدُ حافّةِ القناعِ عن محورِ اليد (الرسغ ⇐ مفصلِ الوسطى) في أسفلِ الراحة، منسوبًا إلى عرضِ الراحة. */
export function mountBulges(mask, w, h, px, palmW) {
  const axis = norm(sub(px[P.MID_MCP], px[P.WRIST]));
  const palm = len(sub(px[P.MID_MCP], px[P.WRIST]));
  const across = norm(sub(px[P.PINKY_MCP], px[P.IDX_MCP]));
  const toThumb = { x: -across.x, y: -across.y };
  const reach = (f, dir) => {
    const c = { x: px[P.WRIST].x + axis.x * palm * f, y: px[P.WRIST].y + axis.y * palm * f };
    const s = spanAt(mask, w, h, c, dir, palm * 1.2);
    return s ? s.toThumb : NaN;
  };
  const avg = (fs, dir) => { const v = fs.map((f) => reach(f, dir)).filter(Number.isFinite); return v.length >= 2 ? v.reduce((a, b) => a + b, 0) / v.length : NaN; };
  const W = palmW || palm * 0.9;
  const venus = avg([0.2, 0.3, 0.4], toThumb) / W, moon = avg([0.2, 0.3, 0.4], across) / W;
  return { venus: Number.isFinite(venus) ? +venus.toFixed(3) : null, moon: Number.isFinite(moon) ? +moon.toFixed(3) : null };
}

/** كلُّ قياساتِ الشكل + الأحكام المشتقّة منها (أو null حيث لا يصحّ). */
export function measureShape(mask, w, h, px) {
  const m = cropToHand(mask, w, h, px);
  const palmLen = len(sub(px[P.MID_MCP], px[P.WRIST]));
  const fingers = {};
  for (const [k, ids] of Object.entries(FINGER_IDS)) {
    const fp = fingerProfile(m, w, h, px, ids);
    fingers[k] = { ...tipShape(fp), knot: knots(fp), distalLen: +(fp.L / palmLen).toFixed(3), prof: fp.prof.map((p) => p.w) };
  }
  const pw = palmWidth(m, w, h, px);
  return { fingers, palmWidth: pw, palmRatio: pw ? +(pw / palmLen).toFixed(3) : null, palmLen, thumb: measureThumb(m, w, h, px), mounts: mountBulges(m, w, h, px, pw) };
}

/** نوعُ اليد من القياسات وفقَ تعريفاتِ الكتاب ([ب] الفصل ١). يُعيدُ {type, why} أو {type:null, why}. */
export function handTypeFrom(shape, fLen) {
  const tips = Object.values(shape.fingers).map((f) => f.shape).filter(Boolean);
  // الإبهامُ ليس من الأربعة؛ ويُكتفى بثلاثةِ أصابعَ واضحة
  if (tips.length < 3) return { type: null, why: "لم يُقَسْ شكلُ أطرافِ ثلاثةِ أصابعَ على الأقلّ" };
  const count = tips.reduce((m, t) => ((m[t] = (m[t] || 0) + 1), m), {});
  const [top, n] = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
  const knotVals = Object.values(shape.fingers).map((f) => f.knot).filter((v) => v != null);
  // المفصلُ الطبيعيُّ أعرضُ قليلًا من السُّلامى (١٫٠٣–١٫١٢ في كفوفٍ عاديّة)؛ «العُقديّة» بروزٌ واضحٌ فوق ذلك
  const knotty = knotVals.length >= 3 && knotVals.filter((k) => k >= 1.15).length >= 3;
  const ratio = shape.palmRatio;
  const longFingers = fLen && fLen.middle > 1.0, shortFingers = fLen && fLen.middle < 0.8;
  if (n < Math.ceil(tips.length * 0.75)) return { type: "mixed", why: `أطرافُ الأصابعِ مختلفة (${tips.join("، ")}) — لا نمطَ واحدٌ يغلب` };
  if (knotty) return { type: "philosophic", why: "مفاصلُ الأصابعِ بارزةٌ عقديّة" };
  if (top === "spatulate") return { type: "spatulate", why: "أطرافُ الأصابعِ مفلطحةٌ تتّسعُ عند الطرف" };
  if (top === "square") return { type: "square", why: "أطرافُ الأصابعِ مربّعة" + (ratio && ratio >= 0.95 ? " والراحةُ تقاربُ المربّع" : "") };
  if (top === "pointed") return longFingers && ratio && ratio < 0.9 ? { type: "psychic", why: "أطرافٌ مدبّبةٌ وأصابعُ طويلةٌ وراحةٌ نحيلة" } : { type: "conic", why: "أطرافُ الأصابعِ مدبّبةٌ مخروطيّة" };
  if (top === "conic") return shortFingers && ratio && ratio >= 1.0 ? { type: null, why: "أطرافٌ مخروطيّةٌ مع أصابعَ قصيرةٍ وراحةٍ عريضة — لا يطابقُ نوعًا واحدًا بوضوح" } : { type: "conic", why: "أطرافُ الأصابعِ مخروطيّةٌ تدِقُّ نحو النهاية" };
  return { type: null, why: "غيرُ متبيَّن" };
}

export const TIP_AR = { square: "مربّعة", conic: "مخروطيّة", pointed: "مدبّبة", spatulate: "مفلطحة" };
export const FINGER_AR = { index: "السبّابة", middle: "الوسطى", ring: "البنصر", little: "الخنصر" };
