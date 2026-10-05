// engines/learn.js — حساباتُ التعلّم من إجابات الناس (مشتركةٌ بين الموقع وأداة GitHub، فتتطابقُ النتيجة).
//
// ١) المقارنةُ بالصدفة: كثيرٌ من الجمل عامّة («بابُ رزقٍ ينفتح») يُجيبُ الناسُ عنها «صار» بسهولة، فالطريقةُ
//    التي تتفاءلُ دائمًا تأخذُ نقاطًا بلا استحقاق. لذلك لا تُحسَبُ الإصابةُ وحدَها، بل الإصابةُ ناقصَ ما كان
//    يُتوقَّعُ بالصدفة: إن كانت نسبةُ «صار» العامّة ٧٠٪ فالطريقةُ الموافقةُ للحكم لا تستحقُّ إلّا ما زاد على ٧٠٪.
// ٢) صوتٌ واحدٌ لكلّ شخص: إجاباتُ الشخص على الطريقة نفسها تُختصَرُ في معدّل، ثمّ يُؤخَذُ معدّلُ الأشخاص.
// ٣) الأشهرُ «العاديّة» (|الحكم| < ٠٫٤٥) لا تُحتسَب: لم يقلِ العارفُ فيها شيئًا حاسمًا.

export const STRONG = 0.45;
export const counted = (e) => Number.isFinite(e.score) && Math.abs(e.score) >= STRONG;

/** نسبةُ «صار» بين الإجابات المحتسَبة (أساسُ المقارنة بالصدفة)؛ ٠٫٥ إن قلّت الإجاباتُ عن الحدّ */
export function okRate(recs, min = 10) {
  const xs = recs.filter((e) => (e.kind === "month" || e.kind === "ask" || !e.kind) && counted(e));
  return xs.length >= min ? xs.filter((e) => e.ok).length / xs.length : 0.5;
}

function bump(tally, k, credit, wt, person) {
  const t = (tally[k] = tally[k] || { n: 0, sum: 0, people: {} });
  t.n++; t.sum += credit;
  const p = (t.people[person] = t.people[person] || { n: 0, sum: 0, wt: 0 });
  p.n++; p.sum += credit * wt; p.wt += wt;
}

/**
 * العارف: لكلّ عائلةٍ وطريقة (وكلٍّ منهما داخلَ الموضوع: love|sky) رصيدٌ = الإصابةُ − المتوقَّعُ بالصدفة.
 * @param {object[]} recs  إجاباتُ month/ask (فيها ok, score, fams, meths, topic, person, ver)
 * @param {{rate?:number, wtOf?:(e)=>number}} opt
 */
export function arifTally(recs, opt = {}) {
  const p = opt.rate ?? okRate(recs), wtOf = opt.wtOf || (() => 1), tally = {};
  for (const e of recs) {
    if (!counted(e)) continue;
    for (const [k, s] of Object.entries({ ...(e.fams || {}), ...(e.meths || {}) })) {
      if (!s) continue;
      const agree = Math.sign(s) === Math.sign(e.score);
      const hit = e.ok === agree ? 1 : 0;
      const credit = hit - (agree ? p : 1 - p);
      bump(tally, k, credit, wtOf(e), e.person || "me");
      if (e.topic) bump(tally, `${e.topic}|${k}`, credit, wtOf(e), e.person || "me");
    }
  }
  return tally;
}

/** حالك: لكلّ كتابٍ رصيد. «فيّ/مش فيّ» يُقارَنُ بنسبة «فيّ» العامّة، و«أقربُ لي» (اختيارٌ بين اثنين) بنصف */
export function lineTally(recs, opt = {}) {
  const tr = recs.filter((e) => e.kind === "trait");
  const plain = tr.filter((e) => !/\(لا /.test(e.item || ""));
  const yes = plain.length >= 10 ? plain.filter((e) => e.ok).length / plain.length : 0.5;
  const wtOf = opt.wtOf || (() => 1), tally = {};
  for (const e of tr) {
    const choice = /\(لا /.test(e.item || "");
    const votes = e.meths && Object.keys(e.meths).length ? e.meths : Object.fromEntries((e.lines || []).map((x) => [x, e.ok ? 1 : -1]));
    for (const [l, v] of Object.entries(votes)) bump(tally, l, (v > 0 ? 1 : 0) - (choice ? 0.5 : yes), wtOf(e), e.person || "me");
  }
  return tally;
}

/** الزواج: المقارنةُ بتاريخ الزواج الحقيقيّ تعطي أصابت/أخطأت لكلّ طريقة (+١/−١)؛ المتوقَّعُ بالصدفة نصف */
export function marriageTally(recs, opt = {}) {
  const wtOf = opt.wtOf || (() => 1), tally = {};
  for (const e of recs.filter((r) => r.kind === "marriage")) {
    const votes = e.meths && Object.keys(e.meths).length ? e.meths : Object.fromEntries((e.lines || []).map((k) => [k, e.ok ? 1 : -1]));
    for (const [k, v] of Object.entries(votes)) bump(tally, `marriage:${k}`, (v > 0 ? 1 : 0) - 0.5, wtOf(e), e.person || "me");
  }
  return tally;
}

/** من الرصيد إلى وزن (٠٫٥–١٫٥): معدّلُ الأشخاص لمعدّلِ كلّ شخص؛ يُشترَطُ min إجابةً وminPeople شخصًا */
export function toWeights(tally, { min = 20, minPeople = 5 } = {}) {
  const w = {};
  for (const [k, t] of Object.entries(tally)) {
    const ps = Object.values(t.people).filter((p) => p.wt > 0);
    if (t.n < min || ps.length < minPeople) continue;
    const mean = ps.reduce((a, p) => a + p.sum / p.wt, 0) / ps.length;
    w[k] = Math.round(Math.max(0.5, Math.min(1.5, 1 + mean)) * 100) / 100;
  }
  return w;
}

/** ملخّصٌ صغيرٌ للعرض والتقرير */
export const slim = (tally) => Object.fromEntries(Object.entries(tally).map(([k, t]) => [k, { n: t.n, people: Object.keys(t.people).length, lift: Math.round((t.sum / t.n) * 100) / 100 }]));

export default { STRONG, counted, okRate, arifTally, lineTally, marriageTally, toWeights, slim };
