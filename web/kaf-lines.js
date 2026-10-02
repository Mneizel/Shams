// web/kaf-lines.js — تتبّعُ خطوطِ الكفِّ الرئيسيّة على صورةِ الراحةِ المقوَّمة (رماديّة N×N).
// سكربتٌ عاديّ (لا وحدة ES) ليُحمَّلَ داخلَ عاملِ OpenCV بـ importScripts، ويُختبَرَ في node.
//
// الاتّجاه في الصورةِ المقوَّمة: الأعلى = مفاصلُ الأصابع، الأسفل = الرسغ، اليسار = جهةُ السبّابة
// والإبهام (لأيِّ يد)، اليمين = جهةُ الخنصر (حافّةُ الكفّ).
//
// الطريقة: ١) «قوّةُ التجعّد» لكلِّ بكسل من انحناءِ شدّةِ الإضاءة (مصفوفةُ هِسّه: التجعّدُ وادٍ داكنٌ
// بين جلدٍ أفتح) على مقياسين. ٢) لكلِّ خطٍّ منطقتُه التشريحيّة واتّجاهُه المعروفان في كلّ كتبِ
// الكفّ (القلبُ أعلى الراحةِ يبدأُ من حافّةِ الخنصر؛ الرأسُ تحته من بين الإبهامِ والسبّابة؛ الحياةُ
// يلتفُّ حولَ قاعدةِ الإبهام؛ المصيرُ صاعدٌ في الوسط)، فيُبحَثُ فيها عن «أقوى مسارٍ متّصلٍ أملس»
// بالبرمجة الديناميكيّة. ٣) لا يُعَدُّ الخطُّ موجودًا لمجرّدِ وجودِ مسار: تُقاسُ قوّتُه على طولِه مقارنةً
// بجلدِ الراحةِ نفسِها، فما دون العتبةِ «لم يتبيّنْ» — لا يُخترَع.
(function (root) {
  "use strict";

  function gaussKernel(sigma) {
    const r = Math.ceil(sigma * 3), k = new Float32Array(2 * r + 1);
    let s = 0;
    for (let i = -r; i <= r; i++) { k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma)); s += k[i + r]; }
    for (let i = 0; i < k.length; i++) k[i] /= s;
    return { k, r };
  }
  function blur(src, N, sigma) {
    const { k, r } = gaussKernel(sigma);
    const tmp = new Float32Array(N * N), out = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let s = 0;
      for (let j = -r; j <= r; j++) { const xx = Math.min(N - 1, Math.max(0, x + j)); s += src[y * N + xx] * k[j + r]; }
      tmp[y * N + x] = s;
    }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let s = 0;
      for (let j = -r; j <= r; j++) { const yy = Math.min(N - 1, Math.max(0, y + j)); s += tmp[yy * N + x] * k[j + r]; }
      out[y * N + x] = s;
    }
    return out;
  }
  // قوّةُ «الوادي الداكن» (أكبرُ قيمةٍ ذاتيّةٍ موجبةٍ لمصفوفةِ هِسّه) واتّجاهُه، مُطبَّعةً بالمقياس.
  function ridge(gray, N, sigma) {
    const I = blur(gray, N, sigma);
    const R = new Float32Array(N * N), A = new Float32Array(N * N);
    const s2 = sigma * sigma;
    for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
      const i = y * N + x;
      const xx = I[i - 1] - 2 * I[i] + I[i + 1];
      const yy = I[i - N] - 2 * I[i] + I[i + N];
      const xy = (I[i - N - 1] + I[i + N + 1] - I[i - N + 1] - I[i + N - 1]) / 4;
      const tr = xx + yy, det = Math.sqrt((xx - yy) * (xx - yy) + 4 * xy * xy);
      const l1 = (tr + det) / 2, l2 = (tr - det) / 2;
      // وادٍ: انحناءٌ قويٌّ موجبٌ عبرَ الخطّ وضعيفٌ على طولِه
      R[i] = l1 > 0 ? s2 * (l1 - Math.max(0, Math.abs(l2) * 0.5)) : 0;
      if (R[i] < 0) R[i] = 0;
      // اتّجاهُ الخطّ = عموديٌّ على متّجهِ l1
      A[i] = 0.5 * Math.atan2(2 * xy, xx - yy) + Math.PI / 2;
    }
    return { R, A };
  }

  const percentile = (arr, p) => { const a = Array.from(arr).sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(a.length * p))] || 0; };

  /** يُحضِّرُ خريطةَ القوّةِ المطبَّعة (٠..~١) مع قناعِ الجلد. */
  function strengthMap(gray, N) {
    const g = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) g[i] = gray[i];
    const a = ridge(g, N, 2.0), b = ridge(g, N, 3.4);
    const S = new Float32Array(N * N), A = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) { if (a.R[i] >= b.R[i]) { S[i] = a.R[i]; A[i] = a.A[i]; } else { S[i] = b.R[i]; A[i] = b.A[i]; } }
    // قناعُ الجلد: الحوافُّ الخارجيّةُ والخلفيّةُ الداكنة/الساطعةُ جدًّا خارجَ الحساب
    const sm = blur(g, N, 4);
    const med = percentile(sm.filter((_, i) => { const x = i % N, y = (i / N) | 0; return x > N * 0.2 && x < N * 0.8 && y > N * 0.2 && y < N * 0.8; }), 0.5) || 1;
    const mask = new Uint8Array(N * N);
    const m = Math.round(N * 0.025);
    for (let y = m; y < N - m; y++) for (let x = m; x < N - m; x++) {
      const i = y * N + x;
      if (sm[i] > med * 0.55 && sm[i] < med * 1.45) mask[i] = 1;
    }
    const inside = [];
    for (let i = 0; i < N * N; i++) if (mask[i]) inside.push(S[i]);
    const p50 = percentile(inside, 0.5), p97 = percentile(inside, 0.97) || 1;
    const scale = Math.max(1e-6, p97 - p50);
    for (let i = 0; i < N * N; i++) S[i] = mask[i] ? Math.max(0, (S[i] - p50) / scale) : NaN;
    return { S, A, mask, contrast: p97 / (p50 || 1e-6) };
  }

  /** أقوى مسارٍ أملس: البعدُ الأساسيُّ «u» (عمودٌ أو صفّ) والبعدُ الحرّ «v» بقيودٍ لكلِّ u. */
  function dpPath(S, N, { along, uFrom, uTo, vMin, vMax, step = 2, smooth = 0.04, startV = null }) {
    const dir = uTo >= uFrom ? 1 : -1;
    const us = []; for (let u = uFrom; dir > 0 ? u <= uTo : u >= uTo; u += dir) us.push(u);
    const at = (u, v) => { const val = along === "x" ? S[v * N + u] : S[u * N + v]; return val === val ? val : 0; };
    const nU = us.length;
    const lo = (k) => Math.max(0, Math.round(typeof vMin === "function" ? vMin(us[k]) : vMin));
    const hi = (k) => Math.min(N - 1, Math.round(typeof vMax === "function" ? vMax(us[k]) : vMax));
    let prev = new Float32Array(N).fill(-1e9);
    const back = [];
    for (let v = lo(0); v <= hi(0); v++) {
      const pen = startV ? (v < startV[0] || v > startV[1] ? 1e9 : 0) : 0;
      prev[v] = Math.min(1.5, at(us[0], v)) - pen;
    }
    for (let k = 1; k < nU; k++) {
      const cur = new Float32Array(N).fill(-1e9), bk = new Int16Array(N).fill(-1);
      const a = lo(k), b = hi(k);
      for (let v = a; v <= b; v++) {
        let best = -1e9, bi = -1;
        for (let d = -step; d <= step; d++) {
          const pv = v + d; if (pv < 0 || pv >= N || prev[pv] <= -1e8) continue;
          const sc = prev[pv] - smooth * Math.abs(d);
          if (sc > best) { best = sc; bi = pv; }
        }
        if (bi >= 0) { cur[v] = best + Math.min(1.5, at(us[k], v)); bk[v] = bi; }
      }
      back.push(bk); prev = cur;
    }
    let bv = -1, bs = -1e9;
    for (let v = 0; v < N; v++) if (prev[v] > bs) { bs = prev[v]; bv = v; }
    if (bv < 0) return null;
    const vs = new Array(nU); vs[nU - 1] = bv;
    for (let k = nU - 2; k >= 0; k--) vs[k] = back[k][vs[k + 1]];
    const pts = us.map((u, k) => (along === "x" ? { x: u, y: vs[k] } : { x: vs[k], y: u }));
    // قوّةُ المسارِ عند كلِّ نقطة (أعلى قيمةٍ في جوارٍ ضيّقٍ عموديٍّ على المسار)
    const str = pts.map((p) => {
      let m = 0, known = false;
      for (let d = -1; d <= 1; d++) {
        const x = along === "x" ? p.x : p.x + d, y = along === "x" ? p.y + d : p.y;
        if (x >= 0 && y >= 0 && x < N && y < N) { const v = S[y * N + x]; if (v === v) { known = true; m = Math.max(m, v); } }
      }
      return known ? m : NaN;
    });
    return { pts, str };
  }

  // يُنعِّمُ قوّةَ المسارِ ويستخرجُ أطولَ امتدادٍ «حقيقيّ» (تُسمَحُ فيه فجواتٌ قصيرة) يبدأُ قربَ بدايةِ
  // الخطّ، مع عدِّ الانقطاعاتِ الحقيقيّة (فجوةٌ طويلةٌ يكادُ يغيبُ فيها التجعّد).
  function runFromStart(str, { T, maxGap, startWithin, minGap = 10 }) {
    const n = str.length, sm = new Float32Array(n);
    for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let j = -3; j <= 3; j++) { const k = i + j; if (k >= 0 && k < n && str[k] === str[k]) { s += str[k]; c++; } } sm[i] = c ? s / c : NaN; }
    let best = { start: -1, end: -1, gaps: 0, mean: 0, sm };
    for (let st = 0; st < Math.min(n, startWithin); st++) {
      if (!(sm[st] >= T) || (st > 0 && sm[st - 1] >= T)) continue; // بدايةُ كلِّ امتدادٍ قويّ
      let end = st, gap = 0, gaps = 0, inGap = false, sum = 0, cnt = 0, gapMin = 1e9;
      for (let i = st; i < n; i++) {
        if (sm[i] !== sm[i]) continue; // خارجَ الجلد: غيرُ معروف
        if (sm[i] >= T) { if (inGap && gap >= minGap && gapMin < T * 0.35) gaps++; inGap = false; gap = 0; gapMin = 1e9; end = i; sum += sm[i]; cnt++; }
        else { gap++; inGap = true; gapMin = Math.min(gapMin, sm[i]); if (gap > maxGap) break; }
      }
      let known = 0; for (let i = st; i <= end; i++) if (sm[i] === sm[i]) known++;
      if (end - st > best.end - best.start) best = { start: st, end, gaps, mean: cnt ? sum / cnt : 0, fill: known ? cnt / known : 0, sm };
    }
    return best;
  }

  function trimmedRun(R, a, b, T, minGap = 10) {
    const sm = R.sm; let gaps = 0, gap = 0, inGap = false, gapMin = 1e9, sum = 0, cnt = 0;
    for (let i = a; i <= b; i++) {
      if (sm[i] !== sm[i]) continue;
      if (sm[i] >= T) { if (inGap && gap >= minGap && gapMin < T * 0.35) gaps++; inGap = false; gap = 0; gapMin = 1e9; sum += sm[i]; cnt++; }
      else { gap++; inGap = true; gapMin = Math.min(gapMin, sm[i]); }
    }
    let known = 0; for (let i = a; i <= b; i++) if (sm[i] === sm[i]) known++;
    return { ...R, end: b, gaps, mean: cnt ? sum / cnt : 0, fill: known ? cnt / known : 0 };
  }

  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  /**
   * gray: Uint8Array/ClampedArray N×N رماديّة (الراحةُ المقوَّمة). يُعيدُ لكلِّ خطٍّ رئيسيّ:
   * { present: true|false|null, confidence, states:[نصوصٌ مطابقةٌ لحالاتِ الكتاب], path:[{x,y}], measures }
   * present=null ⇒ «لم يتبيّنْ» (لا يُحكَمُ بغيابٍ ولا حضور).
   */
  function analyze(gray, N) {
    const { S, A, contrast } = strengthMap(gray, N);
    const out = { quality: { contrast: +contrast.toFixed(2) } };
    const T = 0.55;                  // عتبةُ «تجعّدٍ حقيقيّ» على مقياسِ الجلدِ نفسِه
    // صورةٌ بلا تجاعيدَ واضحة (ضبابيّة، بعيدة، إضاءةٌ مسطّحة): مقياسُ «الجلدِ نفسِه» يُضخِّمُ الضجيجَ حتى
    // يبدوَ خطوطًا — فلا يُحكَمُ على شيء. (كفوفٌ حقيقيّةٌ واضحة: ٩٫٩–١٣؛ جلدٌ بلا تجاعيد: ~٣٫٩)
    if (contrast < 6) {
      for (const k of ["heart", "head", "life", "fate"]) out[k] = { present: null, confidence: 0.1, states: [], path: [], measures: {} };
      out.quality.tooFlat = true;
      return out;
    }
    const goodImage = contrast > 2.2; // صورةٌ واضحةُ التجاعيد: يجوزُ معها الحكمُ بالغياب

    // ── خطُّ القلب (مسارٌ أوّليّ): من حافّةِ الخنصرِ (يمين) نحوَ السبّابة، أعلى الراحة ──
    const heartP = dpPath(S, N, { along: "x", uFrom: Math.round(N * 0.97), uTo: Math.round(N * 0.08), vMin: N * 0.03, vMax: N * 0.45, startV: [N * 0.06, N * 0.42], step: 1, smooth: 0.05 });
    const heartYAt = (x) => (heartP ? yOnPath(heartP.pts, x, "x") : N * 0.12);

    // ── خطُّ الحياة: من بين الإبهامِ والسبّابة (يسار/أعلى) يلتفُّ نزولًا نحوَ الرسغ ──
    const lifeP = dpPath(S, N, { along: "y", uFrom: Math.round(N * 0.1), uTo: Math.round(N * 0.97), vMin: N * 0.0, vMax: (y) => N * (0.2 + 0.45 * Math.min(1, (y / N - 0.1) / 0.5)), startV: [0, N * 0.25], step: 2, smooth: 0.04 });
    const lifeR = lifeP && runFromStart(lifeP.str, { T, maxGap: Math.round(N * 0.07), startWithin: Math.round(N * 0.3) });
    out.life = describeLife(lifeP, lifeR, N, goodImage);

    // ── خطُّ الرأس: من بين الإبهامِ والسبّابة (يسار) عبرَ الراحة. كثيرًا ما يبدأُ ملاصقًا للحياةِ أو
    // القلبِ ثمّ يفترق: لا يُشترَطُ أن يكونَ تحتَ القلبِ إلّا بعدَ ثلثِ الراحةِ الأوّل. ميلُه محدود
    // (خطوةٌ واحدةٌ لكلِّ عمود) حتى لا يقفزَ من تجعّدٍ إلى آخر.
    const lifeStartY = out.life.present ? out.life.path[0].y : N * 0.3;
    const headP = dpPath(S, N, {
      along: "x", uFrom: Math.round(N * 0.04), uTo: Math.round(N * 0.97),
      vMin: (x) => (x < N * 0.45 ? N * 0.03 : Math.max(N * 0.12, heartYAt(x) + N * 0.06)), vMax: N * 0.82,
      startV: [N * 0.03, Math.max(N * 0.3, lifeStartY + N * 0.15)], step: 1, smooth: 0.06,
    });
    const headR = headP && runFromStart(headP.str, { T, maxGap: Math.round(N * 0.06), startWithin: Math.round(N * 0.3) });
    out.head = describeHead(headP, headR, N, goodImage, out.life);

    // ── خطُّ القلب: يُقطَعُ حيث يلتقي بمسارِ الرأس (وإلّا «طال» بالسيرِ على الرأس) ──
    const heartR = heartP && runFromStart(heartP.str, { T, maxGap: Math.round(N * 0.06), startWithin: Math.round(N * 0.2) });
    out.heart = describeHeart(heartP, heartR, N, goodImage, out.head.present ? out.head.path : null);

    // ── خطُّ المصير: صاعدٌ في وسطِ الراحة — بعد استبعادِ مسارِ الحياة (كي لا يُعَدَّ انحناؤه «مصيرًا») ──
    const S2 = Float32Array.from(S);
    if (out.life.present) {
      const rad = Math.round(N * 0.045);
      for (const p of out.life.path) for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
        const x = p.x + dx, y = p.y + dy; if (x >= 0 && y >= 0 && x < N && y < N) S2[y * N + x] = 0;
      }
    }
    const fateP = dpPath(S2, N, { along: "y", uFrom: Math.round(N * 0.96), uTo: Math.round(N * 0.06), vMin: N * 0.3, vMax: N * 0.72, step: 1, smooth: 0.06 });
    const fateR = fateP && runFromStart(fateP.str, { T: T * 1.05, maxGap: Math.round(N * 0.05), startWithin: Math.round(N * 0.45) });
    out.fate = describeFate(fateP, fateR, N, goodImage, out.head, out.heart, headP, heartP);

    // تماسكُ الاتّجاه: في التجعّدِ الحقيقيّ يوازي اتّجاهُ الوادي عند كلِّ نقطةٍ اتّجاهَ المسارِ نفسِه؛
    // في الضجيج يكونُ عشوائيًّا (يتوافقُ مصادفةً في نحوِ الثلث). ما دون الحدِّ «لم يتبيّنْ».
    const comp = labelComponents(S, N, T);
    for (const k of ["heart", "head", "life", "fate"]) {
      const L = out[k];
      if (L.present !== true) continue;
      const c = coherence(L.path, A, N);
      L.measures.coh = +c.toFixed(2);
      L.measures.piece = +pieceRatio(L.path, comp, N).toFixed(2);
      if (c < COH_MIN) { out[k] = { present: null, confidence: 0.2, states: [], path: L.path, measures: { ...L.measures, rejected: "اتّجاهٌ غيرُ متماسك" } }; continue; }
      // كفوفٌ حقيقيّة: القلبُ والرأسُ والحياةُ ٠٫٣٩–١٫٠ على تجعّدٍ واحد؛ سلاسلُ خدوشٍ اصطناعيّة: ٠٫١٤–٠٫٣١
      // على الحدّ: لا يُرمى ولا يُعتمَد — «مرشَّحٌ ضعيف» يُرسَمُ ويُؤكِّدُه المستخدمُ بعينِه (الخدوشُ العشوائيّةُ
      // لا تصلُ إلى هنا: يرفضُها فحصُ الاتّجاه، والصورةُ المسطّحةُ ترفضُها بوّابةُ التباين)
      if (L.measures.piece < PIECE_MIN) out[k] = { ...L, confidence: 0.3, weak: true, measures: { ...L.measures, weakWhy: "قطعٌ متفرّقة — قد يكونُ خطًّا باهتًا أو تجاعيدَ متجاورة" } };
    }
    return out;
  }

  const COH_MIN = 0.55, PIECE_MIN = 0.35;
  // مكوّناتٌ متّصلةٌ في خريطةِ التجاعيد (فوقَ العتبة): الخطُّ الحقيقيُّ تجعّدٌ واحدٌ متّصلٌ طويل،
  // وسلسلةُ خدوشٍ قصيرةٍ متجاورة قطعٌ صغيرةٌ منفصلة حتى لو وصلها المسارُ ببعضها.
  function labelComponents(S, N, T) {
    const lab = new Int32Array(N * N), size = [0];
    let next = 0;
    const q = new Int32Array(N * N);
    for (let i = 0; i < N * N; i++) {
      if (lab[i] || !(S[i] >= T)) continue;
      next++; let h = 0, t = 0; q[t++] = i; lab[i] = next; let n = 0;
      while (h < t) {
        const c = q[h++]; n++;
        const x = c % N, y = (c / N) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= N || Y >= N) continue;
          const j = Y * N + X; if (!lab[j] && S[j] >= T) { lab[j] = next; q[t++] = j; }
        }
      }
      size.push(n);
    }
    return { lab, size };
  }
  // نسبةُ طولِ الخطِّ الواقعةِ على أكبرِ تجعّدٍ متّصلٍ واحد
  function pieceRatio(pts, comp, N) {
    if (!pts || pts.length < 10) return 0;
    const cnt = new Map();
    for (const p of pts) {
      const seen = new Set();
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const X = p.x + dx, Y = p.y + dy; if (X < 0 || Y < 0 || X >= N || Y >= N) continue;
        const l = comp.lab[Y * N + X]; if (l) seen.add(l);
      }
      for (const l of seen) cnt.set(l, (cnt.get(l) || 0) + 1);
    }
    let best = 0; for (const v of cnt.values()) best = Math.max(best, v);
    return best / pts.length;
  }
  function coherence(pts, A, N) {
    if (!pts || pts.length < 9) return 0;
    let good = 0, tot = 0;
    for (let i = 4; i < pts.length - 4; i++) {
      const a = pts[i - 4], b = pts[i + 4];
      const t = Math.atan2(b.y - a.y, b.x - a.x);
      const v = A[pts[i].y * N + pts[i].x];
      if (!(v === v)) continue;
      let d = Math.abs(((t - v) % Math.PI + Math.PI) % Math.PI); d = Math.min(d, Math.PI - d);
      tot++; if (d < Math.PI / 6) good++;
    }
    return tot ? good / tot : 0;
  }

  function yOnPath(pts, u, along) {
    let best = pts[0], bd = 1e9;
    for (const p of pts) { const d = Math.abs((along === "x" ? p.x : p.y) - u); if (d < bd) { bd = d; best = p; } }
    return along === "x" ? best.y : best.x;
  }
  const conf = (r, len) => clamp01(0.35 + 0.35 * clamp01((r.mean - 0.55) / 0.6) + 0.3 * clamp01(len / 0.6));
  function absentOrUnknown(goodImage, path) {
    return goodImage
      ? { present: false, confidence: 0.55, states: [], path: path ? path.pts : [], measures: {} }
      : { present: null, confidence: 0.2, states: [], path: path ? path.pts : [], measures: {} };
  }

  function describeHeart(P, R, N, good, headPts) {
    if (!P || !R || R.start < 0) return absentOrUnknown(good, P);
    let pts = P.pts.slice(R.start, R.end + 1);
    let joinsHead = false;
    // ينتهي القلبُ حيث ينعطفُ صاعدًا إلى ما بين الأصابع (حافّةُ الصورةِ العليا = ثنياتُ قواعدِ الأصابع)
    for (let i = 3; i < pts.length; i++) if (pts[i].y <= N * 0.06 && pts[i].x < N * 0.6) { pts = pts.slice(0, Math.max(1, i - 2)); break; }
    if (headPts && headPts.length) {
      let run = 0;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (p.x > N * 0.65) continue;
        const near = headPts.some((q) => Math.abs(q.x - p.x) <= 3 && Math.abs(q.y - p.y) <= N * 0.025);
        run = near ? run + 1 : 0;
        if (run >= 6) { pts = pts.slice(0, Math.max(1, i - run)); joinsHead = true; break; }
      }
    }
    // الانقطاعاتُ والقوّةُ تُعادُ على الجزءِ الحقيقيِّ وحدَه (بعد القطع)، لا على ما سار فيه المسارُ بعده
    R = trimmedRun(R, R.start, R.start + pts.length - 1, 0.55);
    const len = (pts[0].x - pts[pts.length - 1].x) / N; // من حافّةِ الخنصر
    if (len < 0.25) return { ...absentOrUnknown(false, P), measures: { len } };
    const endX = pts[pts.length - 1].x / N;
    const states = [];
    if (len >= 0.62 && R.mean > 0.75) states.push("طويلٌ عميقٌ واضح");
    else if (len < 0.45) states.push("قصيرٌ");
    // نهايتُه: تحت السبّابة (يسارَ منتصفِ ما بين السبّابةِ والوسطى) أو تحت الوسطى
    // السبّابةُ عند ~٠٫١ والوسطى عند ~٠٫٣٧ والبنصرُ عند ~٠٫٦٣ من عرضِ الصورةِ المقوَّمة
    if (!joinsHead && endX > 0.12 && endX < 0.23) states.push("يبدأُ عاليًا من تحت السبّابة (تلِّ المشتري)");
    else if (!joinsHead && endX >= 0.23 && endX < 0.52) states.push("يبدأُ من تحت الوسطى (تلِّ زحل)");
    if (R.gaps >= 1) states.push("متقطّعٌ / به كسور");
    return { present: true, confidence: +conf(R, len).toFixed(2), states, path: pts, measures: { len: +len.toFixed(2), endX: +endX.toFixed(2), gaps: R.gaps, strength: +R.mean.toFixed(2), fill: +(R.fill || 0).toFixed(2), joinsHead } };
  }

  function describeLife(P, R, N, good) {
    if (!P || !R || R.start < 0) return absentOrUnknown(good, P);
    const pts = P.pts.slice(R.start, R.end + 1);
    const len = (pts[pts.length - 1].y - pts[0].y) / N;
    if (len < 0.22) return { ...absentOrUnknown(false, P), measures: { len } };
    const states = [];
    const reach = pts[pts.length - 1].y / N;        // إلى أين ينزل (١ = الرسغ)
    const arc = Math.max(...pts.map((p) => p.x)) / N; // أبعدُ نقطةٍ داخلَ الكفّ
    if (reach >= 0.85 && R.mean > 0.7 && R.gaps === 0) states.push("طويلٌ عميقٌ واضحٌ متّصل");
    else if (reach < 0.62) states.push("قصيرٌ");
    if (R.gaps >= 1) states.push("متقطّعٌ");
    if (arc >= 0.42) states.push("يقوسُ واسعًا داخلَ الكفّ (تلُّ الزهرةِ كبير)");
    else if (arc <= 0.26) states.push("يلتصقُ بالإبهامِ (تلُّ الزهرةِ ضيّق)");
    return { present: true, confidence: +conf(R, len).toFixed(2), states, path: pts, measures: { len: +len.toFixed(2), reach: +reach.toFixed(2), arc: +arc.toFixed(2), gaps: R.gaps, strength: +R.mean.toFixed(2), fill: +(R.fill || 0).toFixed(2) } };
  }

  function describeHead(P, R, N, good, life) {
    if (!P || !R || R.start < 0) return absentOrUnknown(good, P);
    const pts = P.pts.slice(R.start, R.end + 1);
    const len = (pts[pts.length - 1].x - pts[0].x) / N;
    if (len < 0.25) return { ...absentOrUnknown(false, P), measures: { len } };
    const states = [];
    const endX = pts[pts.length - 1].x / N;
    const drop = (pts[pts.length - 1].y - pts[0].y) / N; // كم ينحدرُ نحوَ الأسفل (تلّ القمر أسفلَ جهةِ الخنصر)
    if (drop >= 0.18) states.push("منحدرٌ نحوَ تلِّ القمر");
    else if (drop < 0.1 && len >= 0.6 && R.mean > 0.7) states.push("مستقيمٌ واضحٌ طويل");
    if (len < 0.45) states.push("قصيرٌ");
    if (R.gaps >= 1) states.push("منكسرٌ / متقطّع");
    // علاقتُه بخطِّ الحياةِ عند البداية: كم تبعدُ بدايتُه عن مسارِ الحياة، وكم يسيرُ ملاصقًا له
    let sep = null, joinLen = 0;
    if (life && life.present && life.path.length) {
      const dmin = (p) => Math.min(...life.path.map((q) => Math.hypot(q.x - p.x, q.y - p.y)));
      sep = dmin(pts[0]) / N;
      for (let i = 0; i < pts.length; i++) { if (dmin(pts[i]) <= N * 0.025) joinLen = (pts[i].x - pts[0].x) / N; else if (i > 2) break; }
      if (sep > 0.1) states.push("منفصلٌ عن خطِّ الحياةِ من البداية"); // فجوةٌ واضحةٌ فقط
      else if (sep <= 0.03 && joinLen >= 0.12) states.push("ملتصقٌ بخطِّ الحياةِ مسافةً طويلة");
      else if (sep <= 0.03 && joinLen >= 0.02) states.push("ملتصقٌ بخطِّ الحياةِ مسافةً قصيرة");
    }
    return { present: true, confidence: +conf(R, len).toFixed(2), states, path: pts, measures: { len: +len.toFixed(2), endX: +endX.toFixed(2), drop: +drop.toFixed(2), gaps: R.gaps, strength: +R.mean.toFixed(2), fill: +(R.fill || 0).toFixed(2), sep: sep == null ? null : +sep.toFixed(3), joinLen: +joinLen.toFixed(2) } };
  }

  function describeFate(P, R, N, good, head, heart, headP, heartP) {
    if (!P || !R || R.start < 0) return absentOrUnknown(good, P);
    const pts = P.pts.slice(R.start, R.end + 1);
    const len = (pts[0].y - pts[pts.length - 1].y) / N;
    if (len < 0.25) return { ...absentOrUnknown(good, P), measures: { len } };
    const states = [];
    const top = pts[pts.length - 1];
    const headY = head.present ? yOnPath(headP.pts, top.x, "x") : null;
    const heartY = heart.present ? yOnPath(heartP.pts, top.x, "x") : null;
    if (heartY != null && top.y <= heartY + 6) states.push(top.y < N * 0.12 ? "واضحٌ مستقيمٌ يصلُ إلى تلِّ زحل" : "يتوقّفُ عند خطِّ القلب");
    else if (headY != null && Math.abs(top.y - headY) <= 8) states.push("يتوقّفُ عند خطِّ الرأس");
    if (R.gaps >= 1) states.push("متقطّعٌ");
    return { present: true, confidence: +conf(R, len).toFixed(2), states, path: pts, measures: { len: +len.toFixed(2), topY: +(top.y / N).toFixed(2), gaps: R.gaps, strength: +R.mean.toFixed(2), fill: +(R.fill || 0).toFixed(2) } };
  }

  /** يدمجُ تحليلَ عدّةِ لقطاتٍ لليدِ نفسِها: الخطُّ «موجود» إن ظهر في أغلبِها، والحالةُ تُثبَتُ فقط إن
   *  اتّفقت عليها أغلبيّةٌ واضحة (≥ ٧٥٪) من اللقطاتِ التي ظهر فيها — ما يتبدّلُ بين لقطةٍ وأخرى لا يُقال. */
  function consensus(results, agree = 0.75) {
    const keys = ["heart", "head", "life", "fate"];
    const out = { frames: results.length };
    for (const k of keys) {
      const rs = results.map((r) => r && r[k]).filter(Boolean);
      const pres = rs.filter((r) => r.present === true), abs = rs.filter((r) => r.present === false);
      if (pres.length / (rs.length || 1) >= agree) {
        const cnt = {};
        pres.forEach((r) => r.states.forEach((st) => (cnt[st] = (cnt[st] || 0) + 1)));
        const states = Object.keys(cnt).filter((st) => cnt[st] / pres.length >= agree);
        const unstable = Object.keys(cnt).filter((st) => cnt[st] / pres.length < agree);
        const best = pres.reduce((a, b) => (b.confidence > a.confidence ? b : a));
        const weak = pres.filter((r) => r.weak).length * 2 > pres.length;
        out[k] = { present: true, confidence: weak ? 0.3 : +Math.min(...pres.filter((r) => !r.weak).map((r) => r.confidence)).toFixed(2), weak, states, unstable, path: best.path, measures: best.measures };
      } else if (abs.length / (rs.length || 1) >= agree) {
        out[k] = { present: false, confidence: 0.55, states: [], unstable: [], path: [], measures: {} };
      } else {
        out[k] = { present: null, confidence: 0.2, states: [], unstable: [], path: [], measures: {} };
      }
    }
    return out;
  }

  const api = { analyze, strengthMap, consensus };
  root.KafLines = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof self !== "undefined" ? self : globalThis);
