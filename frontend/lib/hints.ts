// Small pieces of trivia shown while a photo is being analyzed.
// Plain, general facts about everyday street things: no proper nouns, no sign
// text, and nothing about the specific object in the photo.
// Each entry was checked against the source in the comment above it (2026-11-08).
export const HINTS: readonly string[] = [
  // 東京都下水道局の説明を引用した記事: https://trafficnews.jp/post/654327
  "マンホールの蓋が丸いのは、どの向きにしても穴に落ちないからです。四角い蓋は対角線の向きで落ちてしまいます。",
  // 国土交通省の説明を引用した記事: https://trafficnews.jp/post/131680
  "道路の白線には細かいガラスの粒が混ぜてあります。車のライトを反射して、夜でも線が光って見えるのはそのためです。",
  // 道路構造令 第24条（舗装道 1.5〜2%）: https://www.mlit.go.jp/road/sign/pdf/kouzourei_3-6.pdf
  "アスファルトの道は、雨水を側溝へ流すために横方向へ1.5〜2%ほど傾けて作られています。歩いていても気づかない傾きです。",
  // 土木学会誌 2018-12: https://www.jsce.or.jp/journal/student/korette/201812.pdf
  "ガードレールの端が丸く折り曲げてあるのは、ぶつかった車が板の端に突き刺さらないようにするためです。「袖ビーム」と呼ばれます。",
  // 遠心力によるコンクリート柱体の製造方法（特許）: https://patents.google.com/patent/JPS59215808A/ja
  "コンクリートの電柱は中が空洞です。型枠を高速で回し、遠心力でコンクリートを外側に押し付けて締め固めて作ります。",
  // 仙台市・熊本市の石垣資料: https://www.city.sendai.jp/shisekichosa/documents/documents/sendaijounow5.pdf
  "石垣の裏側には小さな石がぎっしり詰めてあります。雨水を外へ逃がし、土の圧力で石垣が押し出されるのを防いでいます。",
  // 1967 年に岡山で設置、点＝警告・線＝誘導: https://trafficnews.jp/post/678277/2
  "点字ブロックは日本で生まれ、今では世界中の街で使われています。点のブロックは「注意」、線のブロックは「進む向き」を伝えています。",
  // 国総研「わが国の街路樹Ⅸ」令和4年3月31日現在: https://www.nilim.go.jp/lab/bcg/siryou/tnn/tnn1246pdf/ks1246_04.pdf
  // 理由は横浜市の解説: https://www.city.yokohama.lg.jp/kurashi/machizukuri-kankyo/doro/anzenshisetsu/yasashii/gairoju/jushu.html
  "令和4年度時点で、全国の街路樹で最も多いのはイチョウで約52万本。2位のサクラ類との差はわずか22本です。病害虫や大気汚染、剪定に強いためとされます。",
  // 長野県の道路構造基準（杖・車いすのキャスターが落ち込まない蓋）: https://www.pref.nagano.lg.jp/gijukan/infra/kensetsu/gijutsu/documents/06-2kotuanzenshisetutou_shinkyu_r304.pdf
  "側溝の格子蓋に目の細かい物があるのは、杖の先や車いすの前輪が落ち込まないようにするためです。歩道では細目が標準になっています。",
  // 建築基準法施行令 62条の8（国交省資料）: https://www.mlit.go.jp/common/001251612.pdf
  "ブロック塀は高さ2.2mまでと決められています。1.2mを超えると、3.4mごとに裏側へ支えの壁（控え壁）を付けなければなりません。",
];

/** Random hint, avoiding the one shown last time so two photos in a row read differently */
export function pickHint(exclude?: string | null): string {
  const pool = HINTS.filter((h) => h !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}
