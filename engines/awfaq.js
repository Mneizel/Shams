// engines/awfaq.js
// ─────────────────────────────────────────────────────────────────────────────
// محرّك الأوفاق (المربّعات العددية / magic squares)
//
// يولّد مربّعًا وفقيًا من أي رتبة n ≥ 3، بأي عدد بادئ وأي أساس فرق (step)،
// ويحسب "وفق الاسم" (مربّع مجموعه السحري = جُمّل الاسم)، ويولّد أوفاق الكواكب
// السبعة التقليدية (3..9)، ويتحقّق من صحّة أي مربّع.
//
// الطُّرق:
//   - الرتبة الفردية (3,5,7,9,…): طريقة سيام (de la Loubère)
//   - رتبة زوجية-مفردة (n ≡ 2 mod 4): طريقة LUX (Conway)
//   - رتبة زوجية-مزدوجة (n ≡ 0 mod 4): طريقة النمط القُطري
// ─────────────────────────────────────────────────────────────────────────────

import abjad from "./abjad.js";
import {
  BUDUH, ORDER_NATURES, ORDER_NOTE, PURPOSE_WAFQ, BUILD_METHODS, SOURCES_META,
} from "../data/awfaq-lore.data.js";
import {
  TRIANGLE_SQUARES, TRIANGLE_ORIENT_NOTE, GEOMETRIC_TRIANGLE, GEOMETRIC_PRODUCT,
  TRIANGLE_HOLLOW, classifyNumber as _classifyNumber, acceptsJabr as _acceptsJabr,
  QUDRA_FIGURES, QUDRA_FIGURES_NOTE, QUDRA_PROPERTIES, SOURCE_META as QUDRA_SRC,
} from "../data/awfaq-qudra.data.js";

/** المجموع السحري لمربّع رتبته n، عدده البادئ a، وفرقه d. */
export function magicConstant(n, a = 1, d = 1) {
  return n * a + (d * n * (n * n - 1)) / 2;
}

// ── رتبة فردية: طريقة سيام ─────────────────────────────────────────────────
function oddSquare(n) {
  const sq = Array.from({ length: n }, () => Array(n).fill(0));
  let row = 0;
  let col = Math.floor(n / 2);
  for (let k = 1; k <= n * n; k++) {
    sq[row][col] = k;
    const nr = (row - 1 + n) % n;
    const nc = (col + 1) % n;
    if (sq[nr][nc] !== 0) {
      row = (row + 1) % n;
    } else {
      row = nr;
      col = nc;
    }
  }
  return sq;
}

// ── رتبة زوجية-مزدوجة (n % 4 === 0): نمط الأقطار ───────────────────────────
function doublyEvenSquare(n) {
  const sq = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const val = r * n + c + 1;
      const inDiag =
        (r % 4 === c % 4) || ((r % 4) + (c % 4) === 3);
      sq[r][c] = inDiag ? n * n + 1 - val : val;
    }
  }
  return sq;
}

// ── رتبة زوجية-مفردة (n % 4 === 2): طريقة ستراتشي (Strachey) ───────────────
function singlyEvenSquare(n) {
  const m = n / 2;                 // فردي
  const mm = m * m;
  const base = oddSquare(m);       // مربّع سيام رتبته m ، قيمه 1..m²

  // أرباع: A أعلى-يسار، C أعلى-يمين، D أسفل-يسار، B أسفل-يمين
  //   A(+0)     C(+2m²)
  //   D(+3m²)   B(+m²)
  const sq = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < m; r++) {
    for (let c = 0; c < m; c++) {
      sq[r][c]         = base[r][c];              // A
      sq[r][c + m]     = base[r][c] + 2 * mm;     // C
      sq[r + m][c]     = base[r][c] + 3 * mm;     // D
      sq[r + m][c + m] = base[r][c] + mm;         // B
    }
  }

  const k = (m - 1) / 2;           // عدد الأعمدة اليسرى المتبادَلة
  const mid = (m - 1) / 2;         // صف الوسط داخل الرُّبع

  // بدّل أقصى k أعمدة يسارًا بين A و D (كل الصفوف)
  for (let c = 0; c < k; c++) {
    for (let r = 0; r < m; r++) {
      [sq[r][c], sq[r + m][c]] = [sq[r + m][c], sq[r][c]];
    }
  }
  // في صف الوسط: أعِد تبديل العمود 0، وبدّل العمود k بدلًا منه
  if (k >= 1) {
    [sq[mid][0], sq[mid + m][0]] = [sq[mid + m][0], sq[mid][0]];
    [sq[mid][k], sq[mid + m][k]] = [sq[mid + m][k], sq[mid][k]];
  }
  // بدّل أقصى (k − 1) أعمدة يمينًا بين C و B
  for (let i = 0; i < k - 1; i++) {
    const c = m - 1 - i;
    for (let r = 0; r < m; r++) {
      [sq[r][c + m], sq[r + m][c + m]] = [sq[r + m][c + m], sq[r][c + m]];
    }
  }
  return sq;
}

/**
 * مربّع وفقي أساسي من 1..n².
 * @param {number} n رتبة المربّع (≥ 3)
 * @returns {number[][]}
 */
export function baseSquare(n) {
  n = Math.trunc(n);
  if (n < 3) throw new RangeError("رتبة المربّع يجب أن تكون 3 فأكثر (لا يوجد وفق رتبته 2).");
  if (n % 2 === 1) return oddSquare(n);
  if (n % 4 === 0) return doublyEvenSquare(n);
  return singlyEvenSquare(n);
}

/**
 * يحوّل مربّعًا أساسيًا (قيمه 1..n²) إلى مربّع بعدد بادئ a وفرق d:
 * كل قيمة x تصبح a + (x - 1) * d.
 */
export function transform(square, a = 1, d = 1) {
  return square.map((row) => row.map((x) => a + (x - 1) * d));
}

/**
 * يولّد مربّعًا رتبته n بعدد بادئ a وفرق d جاهزًا.
 */
export function makeSquare(n, a = 1, d = 1) {
  return transform(baseSquare(n), a, d);
}

/**
 * وفق الاسم/العدد: مربّع رتبته n مجموعه السحري = target (مثلًا جُمّل الاسم).
 *
 * المجموع السحري لأي مربّع بعدد بادئ a وفرق d هو n·a + d·n·(n²−1)/2، وهو من
 * مضاعفات n دائمًا. لذلك:
 *   1) إن كان target من مضاعفات n ⇒ حلّ مضبوط بالفرق d=1 وعدد بادئ صحيح.
 *   2) وإلا نبحث عن فرق d صحيح يجعل العدد البادئ صحيحًا (مربّع بفرق غير 1).
 *   3) وإلا يتعذّر مربّع تامّ بهذا المجموع؛ نُرجِع مربّعًا لأقرب مضاعَف من n
 *      (وهو ما يفعله الممارسون فعليًا: يقرّبون الرقم)، مع exact:false وبيان
 *      الفرق بين المطلوب والمُحقَّق.
 *
 * @param {number} n
 * @param {number} target
 * @returns {{square:number[][], base:number, step:number, magic:number,
 *            exact:boolean, requested:number, realized:number, shortfall:number}}
 */
export function wafqForTarget(n, target) {
  n = Math.trunc(n);
  const half = (n * (n * n - 1)) / 2;

  // (1) target من مضاعفات n
  if (target % n === 0) {
    const a = (target - half) / n;
    const square = makeSquare(n, a, 1);
    return {
      square, base: a, step: 1, magic: magicConstant(n, a, 1),
      exact: true, requested: target, realized: target, shortfall: 0
    };
  }

  // (2) ابحث عن فرق d صحيح (2..999) يجعل العدد البادئ صحيحًا
  for (let d = 2; d <= 999; d++) {
    const num = target - d * half;
    if (num % n === 0) {
      const a = num / n;
      const square = makeSquare(n, a, d);
      return {
        square, base: a, step: d, magic: magicConstant(n, a, d),
        exact: true, requested: target, realized: target, shortfall: 0
      };
    }
  }

  // (3) تقريب لأقرب مضاعَف من n
  const realized = n * Math.round(target / n);
  const a = (realized - half) / n;
  const square = makeSquare(n, a, 1);
  return {
    square, base: a, step: 1, magic: magicConstant(n, a, 1),
    exact: false, requested: target, realized, shortfall: target - realized
  };
}

// ── أوفاق الكواكب السبعة التقليدية ────────────────────────────────────────
export const PLANET_ORDERS = {
  زحل: 3,
  المشتري: 4,
  المريخ: 5,
  الشمس: 6,
  الزهرة: 7,
  عطارد: 8,
  القمر: 9
};

/**
 * وفق كوكب: المربّع الكلاسيكي من 1..n² لرتبة الكوكب.
 * @param {"زحل"|"المشتري"|"المريخ"|"الشمس"|"الزهرة"|"عطارد"|"القمر"} planet
 */
export function planetSquare(planet) {
  const n = PLANET_ORDERS[planet];
  if (!n) throw new Error("كوكب غير معروف: " + planet);
  const square = baseSquare(n);
  return {
    planet,
    order: n,
    square,
    magic: magicConstant(n, 1, 1),
    sumAll: (n * n * (n * n + 1)) / 2
  };
}

// ── تحقّق ────────────────────────────────────────────────────────────────
/**
 * يتحقّق أن المربّع وفقيّ: كل الصفوف والأعمدة والقطرين بمجموع واحد.
 * @returns {{ok:boolean, magic:number|null, rows:number[], cols:number[], diag:number[], issues:string[]}}
 */
export function verify(square) {
  const n = square.length;
  const issues = [];
  const rows = square.map((r) => r.reduce((a, b) => a + b, 0));
  const cols = Array.from({ length: n }, (_, c) =>
    square.reduce((a, r) => a + r[c], 0)
  );
  const d1 = square.reduce((a, r, i) => a + r[i], 0);
  const d2 = square.reduce((a, r, i) => a + r[n - 1 - i], 0);
  const target = rows[0];
  rows.forEach((v, i) => v !== target && issues.push(`الصف ${i + 1} = ${v} ≠ ${target}`));
  cols.forEach((v, i) => v !== target && issues.push(`العمود ${i + 1} = ${v} ≠ ${target}`));
  if (d1 !== target) issues.push(`القطر ٱلرئيسي = ${d1} ≠ ${target}`);
  if (d2 !== target) issues.push(`القطر ٱلثانوي = ${d2} ≠ ${target}`);
  return {
    ok: issues.length === 0,
    magic: issues.length === 0 ? target : null,
    rows,
    cols,
    diag: [d1, d2],
    issues
  };
}

/** تنسيق نصّي بسيط للطباعة/التصحيح. */
export function toText(square) {
  const w = Math.max(...square.flat().map((x) => String(x).length));
  return square.map((r) => r.map((x) => String(x).padStart(w)).join(" ")).join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// الطبقة العمليّة (من كتب الأوفاق): بُدُوح، طبائع الرتب، الوفق الحرفيّ،
// وفق الاسم بالتعمير، الأغراض ← عمليّات كاملة، والمربّع المؤطَّر (التطريف).
// ─────────────────────────────────────────────────────────────────────────────

/** مربّع بُدُوح الثلاثيّ (٢ ٩ ٤ / ٧ ٥ ٣ / ٦ ١ ٨) وحروفُه وخواصُّه. مقلوبٌ للنقض. */
export function buduh(reversed = false) {
  const numbers = reversed
    ? BUDUH.numbers.map((r) => r.slice().reverse()).reverse()
    : BUDUH.numbers.map((r) => r.slice());
  const letters = reversed
    ? BUDUH.letters.map((r) => r.slice().reverse()).reverse()
    : BUDUH.letters.map((r) => r.slice());
  return {
    numbers, letters, reversed,
    magic: BUDUH.magic, name: BUDUH.name, nameFrom: BUDUH.nameFrom,
    uses: BUDUH.uses, practice: BUDUH.practice, servant: BUDUH.servant,
  };
}

/** طبعُ رتبةٍ وكوكبُها وأغراضُها ويومُها وبخورُها. */
export function orderNature(n) {
  const e = ORDER_NATURES[n];
  return e ? { order: n, ...e } : { order: n, note: ORDER_NOTE };
}
export function orderNatures() {
  return Object.entries(ORDER_NATURES).map(([n, e]) => ({ order: +n, ...e }));
}

/**
 * الوفق الحرفيّ: حشوُ حروفِ نصٍّ في مربّعٍ order×order (تدويرًا لملء الخانات)،
 * ثم حسابُ مجاميعِ الصفوف والأعمدة والقطرين من قيمِ الحروف. لا يلزم أن يتّزن.
 * @param {string} text
 * @param {{order?:number, path?:"rows"|"siamese"}} [opt]
 */
export function letterWafq(text, opt = {}) {
  const norm = abjad.normalize(text);
  const letters = abjad.letters(norm);
  const L = letters.length || 1;
  const order = Math.max(2, Math.trunc(opt.order || Math.ceil(Math.sqrt(L))));
  const cells = order * order;
  const seq = Array.from({ length: cells }, (_, i) => letters[i % L] || "ا");
  const grid = Array.from({ length: order }, () => Array(order).fill(""));
  if (opt.path === "siamese" && order % 2 === 1) {
    let row = 0, col = Math.floor(order / 2);
    for (let k = 0; k < cells; k++) {
      grid[row][col] = seq[k];
      const nr = (row - 1 + order) % order, nc = (col + 1) % order;
      if (grid[nr][nc] !== "") row = (row + 1) % order;
      else { row = nr; col = nc; }
    }
  } else {
    for (let k = 0; k < cells; k++) grid[Math.floor(k / order)][k % order] = seq[k];
  }
  const valueGrid = grid.map((r) => r.map((ch) => abjad.jummal(ch)));
  const v = verify(valueGrid);
  return {
    source: norm, order, letters,
    letterGrid: grid, valueGrid,
    rowSums: v.rows, colSums: v.cols, diagSums: v.diag,
    isMagic: v.ok, magic: v.ok ? v.magic : null,
    totalValue: valueGrid.flat().reduce((a, b) => a + b, 0),
    note: v.ok
      ? "اتّزن الوفقُ الحرفيّ — وهو نادر، وغالبًا مصادفةٌ لا صنعة."
      : "الوفقُ الحرفيّ لا يتّزن عادةً؛ الممارسُ يقبله بصورتِه ولو اختلفت المجاميع.",
  };
}

/**
 * وفقُ الاسم بالتعمير: رتبةٌ تلقائيّةٌ من عددِ الحروف، ومجموعٌ = جُمّل الاسم
 * (أو العدد نفسُه)، مع بيانِ «المفتاح» (العدد البادئ) كما يفعل الممارس.
 */
export function nameWafq(text, opt = {}) {
  const raw = String(text).trim();
  const norm = abjad.normalize(raw);
  const target = /^\d+$/.test(raw) ? parseInt(raw, 10) : abjad.jummal(norm);
  const L = abjad.letters(norm).length || 1;
  const order = Math.min(9, Math.max(3, Math.trunc(opt.order || Math.ceil(Math.sqrt(L)))));
  const w = wafqForTarget(order, target);
  const aass = (order * (order * order - 1)) / 2;
  return {
    source: norm, target, order, aass,
    ...w,
    taᶜmir: `المفتاح = (المجموع ${target} − الآسّ ${w.step === 1 ? aass : w.step * aass}) ÷ ${order} = ${w.base}` +
      (w.step !== 1 ? `، بفرقٍ d=${w.step}` : "") + (w.exact ? "" : `، تعذّر الضبطُ فقُرِّب إلى ${w.realized}`),
    letterWafq: letterWafq(norm, { order }),
  };
}

export function listPurposes() {
  return Object.entries(PURPOSE_WAFQ).map(([id, p]) => ({ id, title: p.title, order: p.order }));
}

const REV = (s) => [...abjad.normalize(s || "")].reverse().join("");
/** يحلّ عنصرَ «يُملأ بـ» إلى نصّه الفعليّ حسب بيانات صاحب البطاقة (والطرف الآخر إن وُجد). */
function resolveFillItem(item, opt) {
  switch (item.role) {
    case "self": return opt.name || item.text;
    case "self_reversed": return opt.name ? REV(opt.name) : item.text;
    case "self_mother": return (opt.name && opt.mother) ? `${opt.name} ${opt.mother}` : item.text;
    case "target": return opt.targetName || item.text;
    case "target_reversed": return opt.targetName ? REV(opt.targetName) : item.text;
    // اسم الطرف الآخر إلزاميّ هنا، واسم أمّه اختياريّ (يُضاف إن وُجد فيرفع دقّة التمييز، ولا يمنع التخصيص إن غاب).
    case "target_mother": return opt.targetName ? `${opt.targetName}${opt.targetMother ? " " + opt.targetMother : ""}` : item.text;
    default: return item.text;
  }
}

/** غرضٌ ← عمليّةُ وفقٍ كاملة: رتبة/كوكب/ملء/توقيت/بخور/وسيط/نسخ/نقض + مربّعٌ مثال + مربّعٌ مملوءٌ فعليًّا بحروف بيانات صاحبه. */
export function operation(id, opt = {}) {
  const p = PURPOSE_WAFQ[id];
  if (!p) throw new Error("غرضٌ غير معروف: " + id);
  const nat = orderNature(p.order);
  const resolved = p.fillNames.map((item) => ({ ...item, resolved: resolveFillItem(item, opt) }));
  const personalized = resolved.some((r) => r.role !== "fixed" && r.resolved !== r.text);
  // المربّعُ الحرفيّ: كلّ عناصر «يُملأ بـ» (مفكوكةً لحروفها) مجموعةً معًا وحاشيةً رتبةَ الغرض.
  const filledText = resolved.map((r) => r.resolved).join(" ");
  const lw = letterWafq(filledText, { order: p.order });
  // مجموعُ الوفق العدديّ = جُمّل نفسِ ما يُكتَب فعليًّا في المربّع الحرفيّ أعلاه (لا حسابٌ منفصل قد يختلف عمّا يُكتَب).
  const target = personalized
    ? abjad.jummal(filledText)
    : Math.trunc(opt.target || abjad.jummal(p.title.split(/\s|\(/)[0]) || nat.magic || 15);
  const demoTarget = target || nat.magic || 15;
  const w = wafqForTarget(p.order, demoTarget);
  const aass = (p.order * (p.order * p.order - 1)) / 2;
  const toxic = (p.incense || []).filter((s) => /سامّ/.test(s));
  return {
    id, title: p.title, order: p.order, orderNature: nat,
    fill: resolved, personalized,
    medium: p.medium, timing: p.timing, incense: p.incense,
    toxicIncense: toxic, disposal: p.disposal, reverse: p.reverse,
    demoTarget, square: w.square, base: w.base, step: w.step, exact: w.exact,
    magicRealized: verify(w.square).magic,
    letterGrid: lw.letterGrid,
    trace: [
      `الغرض «${p.title}» ⇒ رتبةُ الوفق ${p.order} (${nat.planet || "—"}/${nat.starName || "—"}، طبعُه ${nat.element || "—"}).`,
      `يُملأ بـ: ${resolved.map((r) => r.resolved).join("  +  ")}${personalized ? " (مبنيٌّ فعليًّا على بيانات بطاقتك)" : " (مثالٌ توضيحيّ — لم تُملأ بطاقتك بعد)"}.`,
      `المربّعُ الحرفيّ: حشوُ الكلماتِ أعلاه حرفًا حرفًا في مربّع ${p.order}×${p.order} (تكرارًا لملء كلّ الخانات).`,
      `التعمير العدديّ (المجموع ${demoTarget}): المفتاح = (${demoTarget} − ${aass}) ÷ ${p.order} = ${w.base}${w.exact ? "" : " (قُرِّب)"}.`,
      `التوقيت: ${p.timing}.`,
      `البخور: ${(p.incense || []).join("، ")}${toxic.length ? " — ⚠ فيه سامُّ الدخان، لا يُستنشَق." : ""}.`,
      `الوسيط: ${p.medium}`,
      `النسخ الثلاث: ${p.disposal}`,
      `النقض: ${p.reverse}`,
      "المُحصّلة: حشوُ جدولٍ + جدولُ مطابقاتٍ (كوكب/يوم/بخور/وسيط) — لا قوّةَ وراءه.",
    ],
  };
}

export function buildMethods() {
  return Object.entries(BUILD_METHODS).map(([id, m]) => ({ id, ...m }));
}

// ── المربّع المؤطَّر (طريقة التطريف) ─────────────────────────────────────
function seededRand(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

/**
 * مربّعٌ مؤطَّرٌ للرتب الفرديّة (٥ فأكثر): رتبةٌ داخليّةٌ (n−2) محاطةٌ بإطارٍ من
 * أزواجٍ متكاملةٍ (x مع n²+1−x) متقابلة. الأقطارُ تتّزن تلقائيًّا؛ يبقى ضبطُ
 * الصفِّ الأعلى والعمودِ الأيسر ببحثٍ حتميٍّ ببذرةٍ ثابتة. يُتحقَّق بـ verify.
 */
export function borderedSquare(n) {
  n = Math.trunc(n);
  if (n < 5 || n % 2 === 0) {
    const sq = baseSquare(n < 3 ? 3 : n);
    return { order: n, square: sq, method: "غير مؤطَّر", isMagic: verify(sq).ok,
      note: "التطريفُ يصلح للرتب الفرديّة ٥ فأكثر؛ أُرجِع مربّعٌ عاديّ." };
  }
  const off = 2 * (n - 1);
  const inner = transform(baseSquare(n - 2), 1 + off, 1);
  const frame = [];
  for (let i = 1; i <= off; i++) { frame.push(i); frame.push(n * n + 1 - i); }
  const pairs = [];
  for (let i = 0; i < frame.length; i += 2) pairs.push([frame[i], frame[i + 1]]);
  const rnd = seededRand(n * 7919 + 13);
  for (let attempt = 0; attempt < 300000; attempt++) {
    const P = pairs.map((p) => (rnd() < 0.5 ? [p[0], p[1]] : [p[1], p[0]]));
    for (let i = P.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [P[i], P[j]] = [P[j], P[i]]; }
    const sq = Array.from({ length: n }, () => Array(n).fill(0));
    for (let r = 1; r < n - 1; r++) for (let c = 1; c < n - 1; c++) sq[r][c] = inner[r - 1][c - 1];
    let k = 0;
    for (let c = 1; c < n - 1; c++) { sq[0][c] = P[k][0]; sq[n - 1][c] = P[k][1]; k++; }
    for (let r = 1; r < n - 1; r++) { sq[r][0] = P[k][0]; sq[r][n - 1] = P[k][1]; k++; }
    sq[0][0] = P[k][0]; sq[n - 1][n - 1] = P[k][1]; k++;
    sq[0][n - 1] = P[k][0]; sq[n - 1][0] = P[k][1];
    if (verify(sq).ok) {
      return { order: n, square: sq, method: "التطريف (مربّعٌ مؤطَّر)", isMagic: true,
        inner: n - 2,
        note: `رتبةٌ داخليّةٌ (${n - 2}) محاطةٌ بإطارٍ من ${pairs.length} زوجًا متكاملًا؛ متحقَّقٌ منه.` };
    }
  }
  const sq = baseSquare(n);
  return { order: n, square: sq, method: "غير مؤطَّر (تعذّر ضمن الحدّ)", isMagic: verify(sq).ok,
    note: "لم يُعثَر على إطارٍ متّزنٍ ضمن حدِّ البحث." };
}

// ─────────────────────────────────────────────────────────────────────────────
// إضافاتُ «قدرة الخلاق في علم الأوفاق» (الطوخي)
// ─────────────────────────────────────────────────────────────────────────────

/** صورةُ المثلث (وفقُ ٣) بحسب طبيعة الغرض: نار/هواء/ماء/تراب [قدرة الخلاق ص ٤٦]. */
export function triangleSquare(element = "تراب") {
  const sq = TRIANGLE_SQUARES[element] || TRIANGLE_SQUARES["تراب"];
  return {
    element, square: sq.map((r) => [...r]),
    magic: magicConstant(3), isMagic: verify(sq).ok,
    orientNote: TRIANGLE_ORIENT_NOTE,
    source: QUDRA_SRC.title,
  };
}

/** المثلثُ الهندسيّ: وفقٌ ضربيٌّ (٢ مرفوعًا لأسّ لو-شو) [ص ٤٧]. */
export function geometricTriangle() {
  const sq = GEOMETRIC_TRIANGLE;
  const prod = (arr) => arr.reduce((a, b) => a * b, 1);
  const rows = sq.map(prod);
  const cols = [0, 1, 2].map((c) => prod(sq.map((r) => r[c])));
  const diags = [prod([sq[0][0], sq[1][1], sq[2][2]]), prod([sq[0][2], sq[1][1], sq[2][0]])];
  const all = [...rows, ...cols, ...diags];
  return {
    square: sq.map((r) => [...r]),
    product: GEOMETRIC_PRODUCT,
    isMagic: all.every((x) => x === GEOMETRIC_PRODUCT),
    centerCube: sq[1][1] ** 3,
    note: "وفقٌ ضربيٌّ: حاصلُ ضربِ كلِّ سطرٍ وعمودٍ وقطرٍ = ٢^١٥ = ٣٢٧٦٨، ومكعبُ الوسط مثلُه.",
    source: QUDRA_SRC.title,
  };
}

/** مثلثاتٌ خاليةُ خانةٍ (خالي الوسط / خالي الجنب) [ص ٤٦]. */
export function hollowTriangle(kind = "خالي الوسط") {
  return { kind, square: (TRIANGLE_HOLLOW[kind] || TRIANGLE_HOLLOW["خالي الوسط"]).map((r) => [...r]), source: QUDRA_SRC.title };
}

/** تصنيفُ العدد (زوج الزوج / زوج الفرد / زوج الزوج والفرد / فرد / دائريّ) [ص ١٢–١٩]. */
export function classifyNumber(n) {
  const c = _classifyNumber(n);
  return { ...c, acceptsJabr: _acceptsJabr(n), source: QUDRA_SRC.title };
}

/** هل تقبل هذه المرتبةُ «الجبر» (التطريف/التحصين)؟ [ص ٢٢، ٤٨–٥٣]. */
export function jabrOf(order) {
  return { order, acceptsJabr: _acceptsJabr(order), source: QUDRA_SRC.title };
}

/**
 * الصورةُ المرجعيّةُ لرتبةٍ من «قدرة الخلاق» (إن وُجِدت)، مع التحقّق،
 * ومقارنتُها بما يولّده المحرّك.
 */
export function bookFigure(order) {
  const fig = QUDRA_FIGURES[order];
  if (!fig) return { order, figure: null, note: "لا صورةَ لهذه الرتبة في «قدرة الخلاق» ضمن المُستخرَج." };
  const v = verify(fig);
  const generated = makeSquare(order);
  return {
    order, figure: fig.map((r) => [...r]),
    isMagic: v.ok, magic: v.magic ?? magicConstant(order),
    matchesGenerated: JSON.stringify(fig) === JSON.stringify(generated.square),
    note: QUDRA_FIGURES_NOTE, properties: QUDRA_PROPERTIES,
    source: QUDRA_SRC.title,
  };
}

export const SOURCES = { ...SOURCES_META, qudra: QUDRA_SRC };
export const WAFQ_PROPERTIES = QUDRA_PROPERTIES;

export default {
  magicConstant,
  triangleSquare,
  geometricTriangle,
  hollowTriangle,
  classifyNumber,
  jabrOf,
  bookFigure,
  WAFQ_PROPERTIES,
  baseSquare,
  transform,
  makeSquare,
  wafqForTarget,
  planetSquare,
  PLANET_ORDERS,
  verify,
  toText,
  buduh,
  orderNature,
  orderNatures,
  letterWafq,
  nameWafq,
  listPurposes,
  operation,
  buildMethods,
  borderedSquare,
  SOURCES,
};
