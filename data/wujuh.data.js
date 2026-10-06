// data/wujuh.data.js
// ─────────────────────────────────────────────────────────────────────────────
// صورُ الوجوه الستّ والثلاثين (لكلّ برجٍ ثلاثةُ وجوه، كلُّ وجهٍ عشرُ درجات): الصورةُ التي «تطلعُ» في كلّ وجه، وما تدلّ عليه.
// المصدر (لا يُعرَض على الصفحة): أغريبا، الفلسفة الخفيّة، ك٢ ف٣٧ «في صور الوجوه، والصور التي خارج فلك البروج»
// (طبعة Tyson، text/sources/agrippa_tyson_text.txt). الترجمةُ العربيّة أمينةٌ للنصّ، والإنجليزيّةُ كما في الطبعة (en).
// الترتيب: FACES[برج 0..11][وجه 0..2] — البرجُ بترتيب الحمل…الحوت.
// ─────────────────────────────────────────────────────────────────────────────

export const INTRO = "وفي فلك البروج ستٌّ وثلاثون صورةً على عدد الوجوه، كتب فيها قديمًا «تيوكروس البابليّ»، وهو من أقدم الحُسّاب، ثمّ كتب فيها العرب من بعده.";

export const FACES = [
  [ // الحمل
    { image: "رجلٌ أسودُ قائم، يلبسُ ثوبًا أبيضَ مشدودَ الوسط، عظيمُ الجسم، أحمرُ العينين، شديدُ القوّة، كأنّه غضبان.", sign: "الجرأة، والشجاعة، والتعالي، وقلّةُ الحياء.",
      en: "the image of a black man, standing and clothed in a white garment, girdled about, of a great body, with reddish eyes, and great strength, and like one that is angry; and this image signifieth and causeth boldness, fortitude, loftiness, and shamelessness" },
    { image: "امرأةٌ عليها ثوبٌ أحمرُ من الخارج، وتحته ثوبٌ أبيضُ ينسدلُ على قدميها.", sign: "الشرف، وعلوُّ المُلك، وعِظَمُ السلطان.",
      en: "a form of a woman, outwardly clothed with a red garment, and under it a white, spreading abroad over her feet, and this image causeth nobleness, height of a kingdom, and greatness of dominion" },
    { image: "رجلٌ أبيضُ شاحب، أحمرُ الشعر، يلبسُ ثوبًا أحمر، في إحدى يديه سوارٌ من ذهب، ويمدُّ عصًا من خشب؛ قلقٌ كالغضبان لأنّه لا يقدرُ على فعل الخير الذي يريده.", sign: "الذكاء، والحِلم، والفرح، والجمال.",
      en: "the figure of a white man, pale, with reddish hair, and clothed with a red garment, who carrying on the one hand a golden bracelet, and holding forth a wooden staff, is restless, and like one in wrath, because he cannot perform the good he would. This image bestoweth wit, meekness, joy and beauty" },
  ],
  [ // الثور
    { image: "رجلٌ عُريان: رامٍ أو حاصدٌ أو فلّاح، يخرجُ ليزرعَ ويحرثَ ويبنيَ ويُعمِّرَ ويقسمَ الأرضَ على قواعد الهندسة.", sign: "الزرع والحرث والبناء والعمارة وقسمة الأرض.",
      en: "a naked man, an archer, harvester or husbandman, and goeth forth to sow, plough, build, people and divide the Earth, according to the rules of geometry" },
    { image: "رجلٌ عُريان، في يده مفتاح.", sign: "القوّة، والشرف، والسلطانُ على الناس.",
      en: "a naked man, holding in his hand a key; it giveth power, nobility, and dominion over people" },
    { image: "رجلٌ في يده حيّةٌ وسهم.", sign: "الحاجة والمنفعة، والشقاء والعبوديّة.",
      en: "a man in whose hand is a serpent, and a dart, and is the image of necessity and profit, and also of misery and slavery" },
  ],
  [ // الجوزاء
    { image: "رجلٌ في يده قضيب، كأنّه يخدمُ غيره.", sign: "الحكمة، ومعرفةُ الحساب والصنائع التي لا ربحَ فيها.",
      en: "a man in whose hand is a rod, and he is, as it were, serving another; it granteth wisdom, and the knowledge of numbers and arts in which there is no profit" },
    { image: "رجلٌ في يده مزمار، وآخرُ منحنٍ يحفرُ الأرض.", sign: "الخفّةُ المعيبةُ غيرُ الشريفة كخفّة المهرّجين والمشعوذين، والأتعابُ والبحثُ المُضني.",
      en: "a man in whose hand is a pipe, and another being bowed down, digging the earth; and they signify infamous and dishonest agility, as that of jesters and jugglers; it also signifies labours and painful searchings" },
    { image: "رجلٌ يطلبُ السلاح، وأحمقُ في يمينه طائرٌ وفي يساره مزمار.", sign: "النسيان، والغضب، والجرأة، والمزاح، والبذاءة، والكلامُ الذي لا ينفع.",
      en: "a man seeking for arms, and a fool holding in the right hand a bird, and in his left a pipe; and they are the significations of forgetfulness, wrath, boldness, jests, scurrilities, and unprofitable words" },
  ],
  [ // السرطان
    { image: "فتاةٌ عذراءُ في ثيابٍ حسنة، على رأسها تاج.", sign: "حدّةُ الحواسّ، ودقّةُ الذهن، ومحبّةُ الناس.",
      en: "the form of a young virgin, adorned with fine clothes, and having a crown on her head; it giveth acuteness of senses, subtilty of wit, and the love of men" },
    { image: "رجلٌ في لباسٍ حسن، أو رجلٌ وامرأةٌ جالسان إلى المائدة يلعبان.", sign: "الغنى، والمرح، والسرور، ومحبّةُ النساء.",
      en: "a man clothed in comely apparel, or a man and woman sitting at the table and playing; it bestoweth riches, mirth, gladness, and the love of women" },
    { image: "رجلٌ صيّادٌ معه رمحُه وبوقُه، يُخرجُ الكلابَ للصيد.", sign: "خصومةُ الناس، وملاحقةُ الهاربين، وصيدُ الأشياء وتملّكُها بالسلاح والشجار.",
      en: "a man, a hunter with his lance and horn, bringing out dogs for to hunt; the signification of this is the contention of men, the pursuing of those who fly, the hunting and possessing of things by arms and brawlings" },
  ],
  [ // الأسد
    { image: "رجلٌ راكبٌ على أسد.", sign: "الجرأة، والعنف، والقسوة، والشرّ، والشهوة، وأتعابٌ تُحتمَل.",
      en: "a man riding on a lion; it signifieth boldness, violence, cruelty, wickedness, lust and labours to be sustained" },
    { image: "صورةٌ رافعةٌ يديها، ورجلٌ على رأسه تاج، كأنّه غضبانُ يتوعّد، في يمينه سيفٌ مسلول وفي يساره تُرس.", sign: "الخصوماتُ الخفيّة، والانتصاراتُ المجهولة، والسَّفَلة، وأسبابُ الشجار والقتال.",
      en: "an image with hands lifted up, and a man on whose head is a crown; he hath the appearance of an angry man, and one that threateneth, having in his right hand a sword drawn out of the scabbard, and in his left a buckler; it hath signification upon hidden contentions, and unknown victories, and upon base men, and upon the occasions of quarrels and battles" },
    { image: "شابٌّ في يده سوط، ورجلٌ شديدُ الحزن سيّئُ المنظر.", sign: "المحبّة والصحبة، وتركُ المرء حقَّه تجنّبًا للخصام.",
      en: "a young man in whose hand is a whip, and a man very sad, and of an ill aspect; they signify love and society, and the loss of one's right for avoiding strife" },
  ],
  [ // العذراء (السنبلة)
    { image: "فتاةٌ صالحة، ورجلٌ يبذرُ البذور.", sign: "كسبُ المال، وتدبيرُ الطعام، والحرث، والزرع، والعمارة.",
      en: "the figure of a good maid, and a man casting seeds; it signifieth getting of wealth, ordering of diet, plowing, sowing, and peopling" },
    { image: "رجلٌ أسودُ لابسٌ جلدًا، ورجلٌ كثيفُ الشعر يحملُ كيسًا.", sign: "الربح، وجمعُ المال، والطمع.",
      en: "a black man clothed with a skin, and a man having a bush of hair, holding a bag; they signify gain, scraping together of wealth and covetousness" },
    { image: "امرأةٌ بيضاءُ صمّاء، أو شيخٌ متّكئٌ على عصا.", sign: "الضعف، والمرض، وفقدُ الأعضاء، وهلاكُ الشجر، وخرابُ البلاد.",
      en: "a white woman and deaf, or an old man leaning on a staff; the signification of this is to show weakness, infirmity, loss of members, destruction of trees, and depopulation of lands" },
  ],
  [ // الميزان
    { image: "رجلٌ غضبانُ في يده مزمار، ورجلٌ يقرأُ في كتاب.", sign: "إنصافُ المساكين والضعفاء وعونُهم على الأقوياء والأشرار.",
      en: "the form of an angry man, in whose hand is a pipe, and the form of a man reading in a book; the operation of this is in justifying and helping the miserable and weak against the powerful and wicked" },
    { image: "رجلان هائجان غاضبان، ورجلٌ في ثوبٍ حسنٍ جالسٌ على كرسيّ.", sign: "السُّخطُ على الأشرار، وسكونُ العيش وأمانُه مع كثرة الخير.",
      en: "two men furious and wrathful, and a man in a comely garment, sitting in a chair; and the signification of these is to show indignation against the evil, and quietness and security of life with plenty of good things" },
    { image: "رجلٌ عنيفٌ يحملُ قوسًا، وأمامه رجلٌ عُريان، ورجلٌ آخرُ في إحدى يديه خبزٌ وفي الأخرى كأسُ خمر.", sign: "الشهواتُ الفاسدة، والغناء، واللهو، والشَّرَه.",
      en: "a violent man holding a bow, and before him a naked man, and also another man holding bread in one hand, and a cup of wine in the other; the signification of these is to show wicked lusts, singings, sports and gluttony" },
  ],
  [ // العقرب
    { image: "امرأةٌ حسنةُ الوجه والهيئة، ورجلان يضربانها.", sign: "الحُسن والجمال، والخصوماتُ والخيانةُ والمكرُ والنميمةُ والهلاك.",
      en: "a woman of good face and habit, and two men striking her; the operations of these are for comeliness, beauty, and for strifes, treacheries, deceits, detractations, and perditions" },
    { image: "رجلٌ عُريانٌ وامرأةٌ عُريانة، ورجلٌ جالسٌ على الأرض أمامه كلبان يعضُّ أحدُهما الآخر.", sign: "الوقاحة، والخداع، وسوءُ المعاملة، وإلقاءُ الشرّ والخصام بين الناس.",
      en: "a man naked, and a woman naked, and a man sitting on the earth, and before him two dogs biting one another; and their operation is for impudence, deceit, and false dealing, and for to send mischief and strife amongst men" },
    { image: "رجلٌ منحنٍ على ركبتيه، وامرأةٌ تضربه بعصا.", sign: "السُّكر، والفاحشة، والغضب، والعنف، والخصام.",
      en: "a man bowed downward upon his knees, and a woman striking him with a staff; and it is the signification of drunkenness, fornication, wrath, violence, and strife" },
  ],
  [ // القوس
    { image: "رجلٌ لابسٌ درعًا، في يده سيفٌ مسلول.", sign: "الجرأة، والخبث، والحرّيّة.",
      en: "the form of a man armed with a coat of mail, and holding a naked sword in his hand; the operation of this is for boldness, malice, and liberty" },
    { image: "امرأةٌ تبكي، مُغطّاةٌ بالثياب.", sign: "الحزن، وخوفُ المرء على بدنه.",
      en: "a woman weeping, and covered with clothes; the operation of this is for sadness and fear of his own body" },
    { image: "رجلٌ لونُه كلون الذهب، أو رجلٌ بطّالٌ يلعبُ بعصا.", sign: "اتّباعُ الهوى والإصرارُ عليه، والنشاطُ في الشرّ، والخصوماتُ والأمورُ الفظيعة.",
      en: "a man like in colour to gold, or an idle man playing with a staff; and the signification of this is in following our own wills, and obstinacy in them, and in activeness for evil things, contentions, and horrible matters" },
  ],
  [ // الجدي
    { image: "امرأة، ورجلٌ يحملُ أكياسًا ممتلئة.", sign: "الخروج والفرح، والربحُ والخسارة مع ضعفٍ ودناءة.",
      en: "the form of a woman, and a man carrying full bags; and the signification of these is for to go forth and to rejoice, to gain and to lose with weakness and baseness" },
    { image: "امرأتان ورجلٌ ينظرُ إلى طائرٍ يطيرُ في الهواء.", sign: "طلبُ ما لا يُستطاع، والبحثُ عمّا لا يُعرَف.",
      en: "two women and a man looking towards a bird flying in the air; and the signification of these is for the requiring of those things which cannot be done, and for the searching after those things which cannot be known" },
    { image: "امرأةٌ عفيفةُ البدن حكيمةٌ في عملها، وصرّافٌ يجمعُ ماله على المائدة.", sign: "التدبيرُ بالحكمة، وحبُّ المال، والبخل.",
      en: "a woman chaste in body, and wise in her work, and a banker gathering his money together on the table; the signification of this is to govern in prudence, in covetousness of money, and in avarice" },
  ],
  [ // الدلو
    { image: "رجلٌ عاقل، وامرأةٌ تغزل.", sign: "الفكرُ والكدُّ في الكسب، مع الفقر والدناءة.",
      en: "the form of a prudent man, and of a woman spinning; and the signification of these is in the thought and labour for gain, in poverty and baseness" },
    { image: "رجلٌ طويلُ اللحية.", sign: "الفهم، والوداعة، والحياء، والحرّيّة، وحُسنُ الأخلاق.",
      en: "the form of a man with a long beard; and the signification of this belongeth to the understanding, meekness, modesty, liberty and good manners" },
    { image: "رجلٌ أسودُ غضبان.", sign: "إظهارُ التكبّر والوقاحة.",
      en: "a black and angry man; and the signification of this is in expressing insolence, and impudence" },
  ],
  [ // الحوت
    { image: "رجلٌ يحملُ الأثقالَ على كتفه، حسنُ اللباس.", sign: "الأسفار، وتغييرُ المكان، والحرصُ على كسب المال والثياب.",
      en: "a man carrying burdens on his shoulder, and well clothed; it hath his signification in journeys, change of place, and in carefulness of getting wealth and clothes" },
    { image: "امرأةٌ حسنةُ الطلعة، متزيّنة.", sign: "الرغبةُ في الأمور العالية العظيمة والسعيُ إليها.",
      en: "a woman of a good countenance, and well adorned; and the signification is to desire and put one's self on or about high and great matters" },
    { image: "رجلٌ عُريانٌ أو شابّ، وقربَه فتاةٌ جميلةٌ رأسُها مزيّنٌ بالأزهار.", sign: "الراحة، والبطالة، واللذّة، والفاحشة، ومعانقةُ النساء.",
      en: "a man naked, or a youth, and nigh him a beautiful maid, whose head is adorned with flowers; and it hath his signification for rest, idleness, delight, fornication, and for embracing of women" },
  ],
];

// الصورُ التي خارج فلك البروج — من الفصل نفسه، كما ذكرها (أشهرُها فقط)
export const OUTSIDE = [
  { name: "الفرس الأعظم (Pegasus)", use: "ينفعُ من أمراض الخيل، ويحفظُ الفرسانَ في القتال." },
  { name: "المرأة المسلسلة (Andromeda)", use: "توقعُ المحبّةَ بين الزوج والزوجة، حتى قيل إنّها تُصلحُ بين الخائنين." },
  { name: "ذات الكرسيّ (Cassiopeia)", use: "تردُّ الأبدانَ الضعيفة، وتقوّي الأعضاء." },
  { name: "الحوّاء (Serpentarius)", use: "يطردُ السموم، ويشفي لدغَ الهوامّ." },
  { name: "الجاثي (Hercules)", use: "يعطي النصرَ في الحرب." },
  { name: "التنّين مع الدبّين (Draco, the Bears)", use: "تجعلُ الإنسانَ داهيةً ذكيًّا شجاعًا، مقبولًا عند الآلهة والناس." },
  { name: "الشجاع (Hydra)", use: "يعطي الحكمةَ والغنى، ويقاومُ السموم." },
  { name: "قنطورس (Centaurus)", use: "يعطي الصحّةَ وطولَ العمر." },
  { name: "المجمرة (Ara)", use: "تحفظُ العفّة، وتجعلُ صاحبها مقبولًا عند الآلهة." },
  { name: "قيطس (Cetus)", use: "يجعلُ صاحبه محبوبًا عاقلًا سعيدًا في البرّ والبحر، ويُعينه على استرداد ما ضاع منه." },
  { name: "السفينة (the Ship)", use: "تعطي الأمانَ في المياه." },
  { name: "الأرنب (the Hare)", use: "ينفعُ من المكر والجنون." },
  { name: "الكلب (the Dog)", use: "يشفي الاستسقاء، ويقاومُ الطاعون، ويحفظُ من الوحوش والضواري." },
  { name: "الجبّار (Orion)", use: "يعطي النصر." },
  { name: "العُقاب (the Eagle)", use: "يعطي كراماتٍ جديدة، ويحفظُ القديمة." },
  { name: "الدجاجة (the Swan)", use: "تُبرئُ من الفالج وحُمّى الربع." },
  { name: "حامل رأس الغول (Perseus)", use: "يُخلّصُ من الحسد والسحر، ويحفظُ من الصواعق والعواصف." },
  { name: "الأيّل (the Hart)", use: "يحفظُ المبرسَمين والمجانين." },
];
export const OUTSIDE_NOTE = "وفي فلك البروج أيضًا ثلاثمئةٍ وستّون صورةً على عدد الدرجات، وخارجه صورٌ كثيرة؛ هذه أشهرُها.";

export default { INTRO, FACES, OUTSIDE, OUTSIDE_NOTE };
