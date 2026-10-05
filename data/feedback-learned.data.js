// data/feedback-learned.data.js — يُولَّدُ آليًّا من إجابات الناس (node tools/build-feedback.js). لا تعدّلْه يدويًّا.
// أوزانُ عائلات العارف المتعلَّمة من كلّ الإجابات (٠٫٥–١٫٥)، تُستعمَلُ لمن ليست له إجاباتٌ كافية.
export const LEARNED = { generated: null, answers: 0, people: 0, weights: {}, byTopic: {}, marriage: {} };
