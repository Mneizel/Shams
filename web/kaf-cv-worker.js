// web/kaf-cv-worker.js — OpenCV.js في خيطٍ منفصل (Web Worker).
// opencv.js ثقيلٌ (١٠ م.ب، الـ WASM مضمَّنٌ base64)؛ تشغيلُه هنا يُبقي الصفحةَ والكاميرا
// سلستين مهما كان الجهازُ بطيئًا.
// الرسائل: الصفحةُ ⇐ {id, imageData, quad:[[x,y]×4]} ؛ العاملُ ⇒ {ready} أو {id, out:{width,height,data}} أو {id, error}.

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

// ── إبرازُ تجاعيدِ الراحة ────────────────────────────────────────────────
// تُقوَّمُ الراحةُ (من مفاصلِ الأصابعِ إلى الرسغ) إلى مربّعٍ N×N، وتُبرَزُ أعمقُ تجاعيدِها فوقَها.
// لا يُسمّى هنا أيُّ خطّ: جُرِّبت تسميةُ الخطوطِ آليًّا على صورةِ كفٍّ حقيقيّةٍ واضحة، فخلطت
// خطَّ الرأسِ بالقلب، وعدّت أسفلَ خطِّ الحياةِ «خطَّ قدر» — والحكمُ بتسميةٍ خاطئةٍ تلفيق. فالآلةُ
// تُريكَ التجاعيدَ بوضوح، وأنت تُحدِّدُ أيَّها أيٌّ في الوضعِ اليدويّ.
// الاتّجاه: ٠ أعلى (مفاصلُ الأصابع) ⇐ أسفل (الرسغ)؛ اليسارُ جهةُ السبّابة/الإبهام.
function enhanceCreases(cv, imageData, quad, dbg) {
  const N = 384;
  const mats = [];
  const keep = (m) => (mats.push(m), m);
  try {
    const full = keep(cv.matFromImageData(imageData));
    const srcTri = keep(cv.matFromArray(4, 1, cv.CV_32FC2, [].concat(...quad)));
    const dstTri = keep(cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, N, 0, N, N, 0, N]));
    const M = keep(cv.getPerspectiveTransform(srcTri, dstTri));
    const roi = keep(new cv.Mat());
    cv.warpPerspective(full, roi, M, new cv.Size(N, N), cv.INTER_LINEAR, cv.BORDER_REPLICATE, new cv.Scalar());
    const gray = keep(new cv.Mat());
    cv.cvtColor(roi, gray, cv.COLOR_RGBA2GRAY);
    // تنعيمٌ يمحو نقوشَ البصمةِ الدقيقة ويُبقي التجاعيدَ الأعرضَ والأعمق
    const blur = keep(new cv.Mat());
    cv.GaussianBlur(gray, blur, new cv.Size(7, 7), 1.8);
    const eq = keep(new cv.Mat());
    const cl = new cv.CLAHE(2.0, new cv.Size(8, 8)); cl.apply(blur, eq); cl.delete();
    const bh = keep(new cv.Mat());
    cv.morphologyEx(eq, bh, cv.MORPH_BLACKHAT, keep(cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(17, 17))));
    // الجلدُ فقط: لا حوافَّ الإطارِ ولا الخلفيّة، وتُقضَمُ حافّةُ الكفِّ (الانتقالُ إلى الخلفيّةِ يُوهِمُ بخطّ)
    const g = blur.data, b = bh.data;
    const median = Array.from(g).sort((a, c) => a - c)[g.length >> 1] || 1;
    const margin = Math.round(N * 0.04);
    const skin = keep(new cv.Mat(N, N, cv.CV_8UC1, new cv.Scalar(0)));
    const sm = skin.data;
    for (let y = margin; y < N - margin; y++) for (let x = margin; x < N - margin; x++) {
      const i = y * N + x;
      if (g[i] > median * 0.6 && g[i] < median * 1.35) sm[i] = 255;
    }
    cv.erode(skin, skin, keep(cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(11, 11))));
    const bv = [];
    for (let i = 0; i < sm.length; i++) if (sm[i]) bv.push(b[i]);
    bv.sort((a, c) => a - c);
    const t = Math.max(8, bv[Math.floor(bv.length * 0.9)] || 255); // أعمقُ ١٠٪ من تجاعيدِ الجلد
    const bin = keep(new cv.Mat(N, N, cv.CV_8UC1, new cv.Scalar(0)));
    const d = bin.data;
    for (let i = 0; i < d.length; i++) if (sm[i] && b[i] >= t) d[i] = 255;
    cv.morphologyEx(bin, bin, cv.MORPH_CLOSE, keep(cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(9, 9))));
    cv.morphologyEx(bin, bin, cv.MORPH_OPEN, keep(cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3))));
    // تُحذَفُ البقعُ الصغيرةُ والكتلُ العريضة: يبقى ما يشبهُ الخطوطَ فقط
    const contours = keep(new cv.MatVector()), hier = keep(new cv.Mat());
    cv.findContours(bin, contours, hier, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_NONE);
    const clean = keep(new cv.Mat(N, N, cv.CV_8UC1, new cv.Scalar(0)));
    for (let i = 0; i < contours.size(); i++) {
      const c = contours.get(i);
      const area = cv.contourArea(c), len = cv.arcLength(c, true) / 2;
      c.delete();
      if (area < N * N * 0.0003 || len < N * 0.08 || area / len > N * 0.03) continue;
      cv.drawContours(clean, contours, i, new cv.Scalar(255), -1);
    }
    if (dbg) { dbg("s1_roi", roi); dbg("s2_blackhat", bh); dbg("s3_binary", clean); }
    // الصورةُ النهائيّة: الراحةُ فاتحةً وتجاعيدُها العميقةُ بالأحمرِ الداكن
    const out = new Uint8ClampedArray(N * N * 4);
    const rgba = roi.data, cd = clean.data;
    let hits = 0;
    for (let i = 0; i < N * N; i++) {
      const o = i * 4;
      if (cd[i]) { out[o] = 190; out[o + 1] = 20; out[o + 2] = 30; out[o + 3] = 255; hits++; }
      else { out[o] = 140 + rgba[o] * 0.45; out[o + 1] = 140 + rgba[o + 1] * 0.45; out[o + 2] = 140 + rgba[o + 2] * 0.45; out[o + 3] = 255; }
    }
    return { width: N, height: N, data: out, coverage: +(hits / (N * N)).toFixed(3) };
  } finally {
    mats.forEach((m) => { try { m.delete(); } catch {} });
  }
}

self.onmessage = async (e) => {
  const { id, imageData, quad } = e.data || {};
  try {
    await loadCV();
    const out = enhanceCreases(CV, imageData, quad);
    self.postMessage({ id, out }, [out.data.buffer]);
  } catch (err) {
    self.postMessage({ id, error: String(err && err.message || err) });
  }
};
