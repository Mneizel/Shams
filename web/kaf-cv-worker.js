// web/kaf-cv-worker.js — OpenCV.js في خيطٍ منفصل (Web Worker).
// opencv.js ثقيلٌ (١٠ م.ب، الـ WASM مضمَّنٌ base64)؛ تشغيلُه هنا يُبقي الصفحةَ والكاميرا
// سلستين مهما كان الجهازُ بطيئًا.
// الرسائل: الصفحةُ ⇐ {id, imageData, quad:[[x,y]×4]} ؛ العاملُ ⇒ {ready} أو {id, out} أو {id, error}.

let cvReady = null, CV = null;

// تنبيهٌ مهمّ: كائنُ cv في opencv.js «thenable» (فيه دالّةُ then). تمريرُه إلى resolve() يجعلُ
// آليّةَ الوعودِ تستدعي then مرارًا بلا نهاية (حلقةٌ لا تنتهي ولا تُطلِقُ أيَّ خطإ) — فلا يُمرَّرُ
// أبدًا؛ يُحفَظُ في CV وتُحذَفُ then منه، ويُحَلُّ الوعدُ بقيمةٍ بسيطة.
function loadCV() {
  if (cvReady) return cvReady;
  cvReady = new Promise((resolve, reject) => {
    try { importScripts("../vendor/opencv.js"); }
    catch (e) { reject(e); return; }
    let finished = false;
    const done = (m) => {
      if (finished || !m || !m.Mat) return;
      finished = true; CV = m;
      try { if (typeof CV.then === "function") delete CV.then; } catch {}
      resolve(true);
    };
    const c = self.cv;
    if (!c) { reject(new Error("لم يُعرَّفْ cv بعد تحميل opencv.js")); return; }
    if (c.Mat) { done(c); return; }
    c.onRuntimeInitialized = () => done(self.cv);
    if (typeof c.then === "function") { try { c.then((m) => { done(m); }); } catch {} }
    const t0 = Date.now();
    const poll = () => {
      if (finished) return;
      if (self.cv && self.cv.Mat) return done(self.cv);
      if (Date.now() - t0 > 90000) { finished = true; reject(new Error("انتهت مهلةُ تهيئةِ OpenCV.js")); return; }
      setTimeout(poll, 200);
    };
    poll();
  });
  return cvReady;
}

loadCV().then(() => self.postMessage({ ready: true }), (e) => self.postMessage({ ready: false, error: String(e && e.message || e) }));

const none = () => ({ present: false, confidence: 0, states: [] });
const uniq = (a) => [...new Set(a)];

function isLoop(cnt) {
  const n = cnt.data32S.length / 2;
  if (n < 8) return false;
  const x0 = cnt.data32S[0], y0 = cnt.data32S[1];
  const xe = cnt.data32S[(n - 1) * 2], ye = cnt.data32S[(n - 1) * 2 + 1];
  return Math.hypot(x0 - xe, y0 - ye) < 12;
}

function buildLine(bandSegs, which) {
  if (!bandSegs.length) return none();
  const total = bandSegs.reduce((a, s) => a + s.len, 0);
  const longest = Math.max(...bandSegs.map((s) => s.len));
  const pieces = bandSegs.length;
  const hasLoop = bandSegs.some((s) => s.closed);
  const states = [];
  if (which === "life") states.push(longest > 0.7 ? "طويلٌ عميقٌ واضحٌ متّصل" : "قصيرٌ");
  else if (which === "head") states.push(longest > 0.7 ? "مستقيمٌ واضحٌ طويل" : "قصيرٌ");
  else if (which === "heart") states.push(longest > 0.6 ? "طويلٌ عميقٌ واضح" : "قصيرٌ");
  else if (which === "fate") states.push(longest > 0.55 ? "واضحٌ مستقيمٌ يصلُ إلى تلِّ زحل" : "متقطّعٌ");
  if (pieces >= 3) {
    if (which === "life") states.push("متقطّعٌ");
    else if (which === "head") states.push("منكسرٌ / متقطّع");
    else if (which === "heart") states.push("متقطّعٌ / به كسور");
  }
  if (hasLoop) {
    if (which === "life") states.push("به جزيرةٌ");
    else if (which === "head") states.push("به جزيرة");
    else if (which === "heart") states.push("متقطّعٌ / به كسور");
  }
  const conf = Math.max(0.3, Math.min(0.82, 0.3 + total * 0.35 + longest * 0.3));
  return { present: true, confidence: +conf.toFixed(2), states: uniq(states) };
}

function detectLines(cv, imageData, quad) {
  const out = { life: none(), head: none(), heart: none(), fate: none(), sun: none(), health: none() };
  const N = 320;
  let full, roi, gray, clahe, bh, th, morphed, contours, hierarchy, se;
  try {
    full = cv.matFromImageData(imageData);
    const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [].concat(...quad));
    const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, N, 0, N, N, 0, N]);
    const M = cv.getPerspectiveTransform(srcTri, dstTri);
    roi = new cv.Mat();
    cv.warpPerspective(full, roi, M, new cv.Size(N, N), cv.INTER_LINEAR, cv.BORDER_REPLICATE, new cv.Scalar());
    srcTri.delete(); dstTri.delete(); M.delete();

    gray = new cv.Mat();
    cv.cvtColor(roi, gray, cv.COLOR_RGBA2GRAY);
    clahe = new cv.Mat();
    const cl = new cv.CLAHE(2.5, new cv.Size(8, 8));
    cl.apply(gray, clahe); cl.delete();
    bh = new cv.Mat();
    se = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(9, 9));
    cv.morphologyEx(clahe, bh, cv.MORPH_BLACKHAT, se);
    th = new cv.Mat();
    cv.threshold(bh, th, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
    morphed = new cv.Mat();
    const se2 = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(5, 5));
    cv.morphologyEx(th, morphed, cv.MORPH_CLOSE, se2); se2.delete();

    contours = new cv.MatVector(); hierarchy = new cv.Mat();
    cv.findContours(morphed, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    const segs = [];
    for (let i = 0; i < contours.size(); i++) {
      const c = contours.get(i);
      const len = cv.arcLength(c, false);
      if (len < N * 0.28) { c.delete(); continue; }
      const r = cv.boundingRect(c);
      const m = cv.moments(c, false);
      const cx = m.m00 ? m.m10 / m.m00 : r.x + r.width / 2;
      const cy = m.m00 ? m.m01 / m.m00 : r.y + r.height / 2;
      segs.push({ len: len / N, cx: cx / N, cy: cy / N, w: r.width / N, h: r.height / N, horiz: r.width >= r.height, closed: isLoop(c) });
      c.delete();
    }

    // نطاقاتٌ تشريحيّة (الإحداثيّات: ٠ أعلى، ١ أسفل؛ ٠ يسار=الإبهام)
    const inBand = (s, y0, y1) => s.cy >= y0 && s.cy <= y1;
    out.heart = buildLine(segs.filter((s) => s.horiz && inBand(s, 0.12, 0.36) && s.w > 0.35), "heart");
    out.head = buildLine(segs.filter((s) => s.horiz && inBand(s, 0.36, 0.6) && s.w > 0.35), "head");
    out.life = buildLine(segs.filter((s) => !s.horiz || s.h > 0.35).filter((s) => s.cx < 0.5 && s.cy > 0.25 && s.h > 0.3), "life");
    out.fate = buildLine(segs.filter((s) => !s.horiz && s.h > 0.4 && s.cx > 0.35 && s.cx < 0.72), "fate");
  } finally {
    [full, roi, gray, clahe, bh, th, morphed, hierarchy, se].forEach((m) => { try { m && m.delete && m.delete(); } catch {} });
    try { contours && contours.delete(); } catch {}
  }
  return out;
}

self.onmessage = async (e) => {
  const { id, imageData, quad } = e.data || {};
  try {
    await loadCV();
    self.postMessage({ id, out: detectLines(CV, imageData, quad) });
  } catch (err) {
    self.postMessage({ id, error: String(err && err.message || err) });
  }
};
