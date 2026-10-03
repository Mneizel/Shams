// engines/dalil.js — «دليل الحيران في طالع الإنسان» للطوخي: مرتبةُ الطالع من (اسم الشخص + اسم أمّه) بأعداد الحروف الهجائيّة ÷ ٩،
// وطبعُه ÷ ٤. حتميّ.
import abjad from "./abjad.js";
import * as D from "../data/dalil-hayran.data.js";

export function hijaiValue(text) {
  return [...abjad.normalize(text || "")].reduce((a, ch) => a + (D.HIJAI.indexOf(ch) + 1 || 0), 0);
}

export function rank(name, mother, sex = "m") {
  const total = hijaiValue(name) + hijaiValue(mother);
  const r9 = total % 9 || 9, r4 = total % 4;
  const table = sex === "f" ? D.RANKS_WOMEN : D.RANKS_MEN;
  return { total, rank: r9, tab: D.TAB_BY_REM4[r4], ...table[r9], src: D.DALIL_SRC,
    trace: [`أعدادُ الحروف الهجائيّة: «${abjad.normalize(name)}» ${hijaiValue(name)} + «${abjad.normalize(mother)}» ${hijaiValue(mother)} = ${total}`,
            `${total} ÷ ٩ ⇒ الباقي ${r9} ⇒ المرتبة ${r9} من مراتب ${sex === "f" ? "الإناث" : "الذكور"}`,
            `${total} ÷ ٤ ⇒ الباقي ${r4} ⇒ الطبع ${D.TAB_BY_REM4[r4]}`] };
}

export default { rank, hijaiValue };
