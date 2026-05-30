# 設計: シンハラ文字学習アプリ

[prepare.md](./prepare.md) を前提に、実装する 2 機能(表 / クイズ)の設計をまとめる。

> GitHub Copilot (gpt-5.4) の設計レビューを反映済み(2026-05-30)。レビュー全文: `/tmp/claude-501/copilot-review-20260530-165344.md`。主な変更点は「ID 設計の追加」「クイズ軸の2軸化」「Unicode 前提の修正(色分けを MVP から外す)」「confusion group の追加」「レベルの family 別累積」。

## 方針(確定事項)

- **出題・表示の主軸は単体文字**。「子音単体 (ka などの裸字)・独立母音・母音記号 pilla」を覚える。合成音節 (キ・ク等) は後の難易度で追加。
- **表ビューは段階的な絞り込み**。フルセット → 純粋子音のみ → 基本母音 → 母音記号 → 合成表 → 例外、をボタン切替。
- **クイズは双方向**: 文字→読み / 読み→文字。
- **読み表記は 3 種**: かな・ローマ字 (rom)・発音記号 (IPA)。
- **各文字に「形・覚え方」の短い説明**を持たせ、文字フォーカス画面で表示する(下記)。

## 形・覚え方の説明テキスト

文字フォーカス画面に、覚え方を助ける短いテキストを 2 種類出す。

1. **字形 mnemonic(`mnemonic`)** — その文字の形の覚え方。例: 「ක = 丸い輪に右上へ跳ねる尾」のような一言。
   - **データとして保持**(機械生成できない)。`sinhala.json` の各文字に `mnemonic` フィールドを追加する(別ファイルにせず本体へ。これにより「JSON は touch しない」方針はここで解除)。
   - **まず主要文字だけ用意**: Lv1 基本子音 19(ක ග ච ජ ට ඩ ත ද න ප බ ම ය ර ල ව ස හ ළ)+ 基本母音 12(misra=false の独立母音)。それ以外は空でよく、後から拡充。
   - 生成は AI で下書き → レビューで精度確認(誤りやすいので要チェック)。
2. **組み立て説明(生成)** — 合成音節での母音記号の付き方。例: 「子音の **上** に i の記号」「子音の **左右** で挟む」。
   - これは `vowel_signs.position`(top/right/left/bottom/both)+ `name`(pilla 名)+ hal から **コードで生成**する(データ追加不要)。`lib/explain.ts` の `describeComposition(consonant, sign)` 等。

## 文字 ID 設計(重要 / レビュー P0)

raw glyph は ID にできない。理由:
- `vowel_signs` の `a` は `sign: ""`(空文字列)。
- `conjuncts` は ZWJ (U+200D) を含む(例 `ක්‍ය`)。
- 同じ glyph が複数文脈に現れうる。

→ **各エンティティに安定した `id` を付与**し、URL・レベル定義・クイズはすべて `id` で参照する。
- 子音: `c:<rom>`(例 `c:ka`)
- 独立母音: `v:<rom>`(例 `v:a`)
- 母音記号: `s:<rom>`(例 `s:i`、a は `s:a`)
- 例外形: `irr:<syllable>`
- id は JSON 本体を書き換えず、`lib/sinhala.ts` のロード時に `rom` 等から導出して付与する(JSON は touch しない方針を維持)。

## Unicode の扱い(重要 / レビュー P0)

検証結果(NFC):
- 母音記号はすべて**単一コードポイント**。`o`=U+0DDC, `ō`=U+0DDD(NFD にすると `ෙ`+`ා`(+`්`)に分解されるが、NFC では1つ)。
- conjuncts は ZWJ を含み grapheme 分割が不安定。

→ **コードポイント単位の汎用 span 色分けは shaping を壊すため MVP では行わない**(prepare.md の「left+right 2コードポイント」は NFD 前提の記述で、NFC の実データとは異なる)。
- MVP: 文字フォーカスは**単色の特大表示**。「base 子音 / vowel_sign / hal」の内訳は**テキストで併記**(例: `ක (base) + ි (i / top)`)。
- 将来: 色分けは汎用 Unicode 処理ではなく、合成音節を `{base, sign}` の**明示データ**として持って色付けする方式で実装する。

## 難易度設計(覚えやすい順序)

学習データに**学習順のレベル付け**を加える。子音は調音点 (velar→labial) の順、各レベル内は五十音図の行順。

| Lv | 名前 | 含む文字 | 狙い |
| --- | --- | --- | --- |
| **Lv1** | 基本子音 | 純粋子音の無声・有声 + 鼻音 ම/න + 半母音 ය ර ල ව + 摩擦 ස හ (16字前後) | 五十音図の主要行。最初に覚える core |
| **Lv2** | 基本母音 | 独立母音 6 対 (a ā æ ǣ i ī u ū e ē o ō) | 語頭母音。短長ペアで |
| **Lv3** | 母音記号 pilla | pilla 13 種 (ක を例に合成) | 子音×母音の組み立てを体得 |
| **Lv4** | 残りの純粋子音 | そり舌 ට ඩ ණ・前鼻音化 ඟ ඬ ඳ ඹ・ළ など (misra=false の残り) | シンハラ特有音 |
| **Lv5** | 混成字母 miśra | 有気音 kha gha…、śa ṣa、サンスクリット母音 ඍ ai au・母音記号 au など (misra=true) | 外来語・宗教語用。最後 |

実装: `app/data/levels.ts` で各 Lv に属する **id 集合**を定義(JSON 本体は触らず、id で参照)。
- レベル定義は **family(consonant / vowel / sign)ごとに分けて**持つ。クイズの累積プールは「同 family 内で累積」を基本とし、family をまたぐ混合は上級オプション(レビュー P1)。
- `vowel_signs.au` は `misra:true` なので Lv3(基本 pilla)には含めず Lv5 に置く。Lv3 は misra=false の pilla のみ。
- 起動時に「定義した全 id が JSON に存在するか」を検証するヘルパーを置く(取りこぼし防止、レビュー P1)。

## ルーティング(`app/routes.ts`)

```
index("routes/home.tsx")       // トップ: 概要 + 表/クイズへの導線
route("table", "routes/table.tsx")   // 表ビュー
route("quiz", "routes/quiz.tsx")     // クイズ
```

`Navigation` を Home/表/クイズ に差し替え。

## データ層(`app/lib/`)

- `sinhala.ts` — `import data from "../data/sinhala.json"` し、型を付けて re-export。`Consonant` / `Vowel` / `VowelSign` 等の型定義。ロード時に各エンティティへ `id` を導出付与し、`id → entity` の索引を作る。
- `levels.ts` — レベル定義(**id 集合・family 別**)とヘルパー(`idsForLevel`, `cumulativeUpTo`, `validateLevels`)。
- `confusion.ts` — **混同しやすい文字グループ**(confusion group)を定義(レビュー P1)。distractor 選定で使う。代表例:
  - `ත/ට`(歯/そり舌 t)、`ද/ඩ`(歯/そり舌 d)、`ර/ල/ළ`(r/l/そり舌 l)、`න/ණ`、`u/ū`・各長短ペア、前鼻音化 `ඟ/ඬ/ඳ/ඹ`、字形が似る組。
- `explain.ts` — 組み立て説明の生成。`describeComposition(consonant, sign)` が `position`/`name` から「子音の上に i の記号」等の文字列を返す。
- `quiz.ts` — 出題ロジック。**`generateQuestion(pool, { promptField, answerField })`** の2軸設計(下記)。正解 + distractor 3 件は **confusion group 優先 → 同 family fallback** で選ぶ。`Math.random` に依存する部分は引数で乱数源を差せるようにしてテスト可能に。

## 画面の 2 階層

要望を踏まえ、画面を「一覧する画面」と「1 文字に着目する画面」の 2 階層に分ける。

- **一覧画面(表ビュー)**: たくさんの文字を俯瞰する。各文字は見やすく大きめに。
- **文字フォーカス画面**: 表のセルをタップ/クリックすると開く。1 文字を**特大表示**し、パーツ色分け・フォント(グリフ)切替・全表記(rom/ipa/kana)を見せる。「フォントによる字形の違いを学ぶ」「パーツ構造を学ぶ」のはこの画面が主役。

→ **パーツ色分けとフォント切替は文字フォーカス画面に集約**する(一覧側は実装をシンプルに保つ)。一覧側にもフォント切替は置けるが、必須はフォーカス側。

## 機能 1: 表ビュー (`routes/table.tsx`)

- 上部にモード切替ボタン(`display_modes` 相当): フルセット / 純粋子音 / 基本母音 / 母音記号 / 合成表 / 例外。
- 子音モードは **place × manner マトリクス**で表示(五十音図的)。母音は短長ペア。
- 各セル = **大きめのグリフ**(`text-5xl` 級)+ rom/ipa/kana(トグルで表示切替)。
- セルをクリック → **文字フォーカス画面をモーダル**(同一ルート内オーバーレイ)で開く。ページ遷移はせず一覧の上に重ねる。
  - 選択中の文字は **クエリパラメータ `?char=<id>`** と同期(`useSearchParams`)。glyph ではなく **id** を使う(P0)。URL 共有・リロード・ブラウザの戻る/進むでモーダルの開閉が効く。
  - モーダルを閉じる = `char` パラメータを削除。Esc / 背景クリックでも閉じる。
  - **アクセシビリティ**(レビュー P2): `role=dialog` / `aria-modal` / 初期フォーカス移動 / focus trap / 閉じた後に元のセルへフォーカス復帰 / 背景の inert 化。

### 文字フォーカス画面(要望の中心)
- グリフを**特大表示**(`text-8xl`〜`text-9xl` 級)。見やすさ最優先。上付き/下付き/左側記号がクリップしないよう**十分な padding と line-height** を確保(`leading-none` 禁止、レビュー P2)。
- **パーツ内訳**: MVP は**単色表示 + テキスト併記**(例: `base ක ka + sign ි i (top)`)。`parts_coloring` を使ったコードポイント単位の色分けは Unicode shaping を壊すため MVP では行わない(P0)。将来、合成音節を明示データ化してから色分けを入れる。
- **グリフ(フォント)切替**: `fonts` のフォントをセレクタで切替。「並べて比較」で複数同時表示し字形差(合字・ぶら下げ形)を観察。**MVP は Noto Sans Sinhala を既定に 1〜2 種から開始**、比較用フォントはフォーカス画面で**遅延ロード**(5 種同時ロードは重い、レビュー P2)。
- **形・覚え方**: 字形 mnemonic(データ `mnemonic`、未設定なら非表示)+ 組み立て説明(`explain.ts` で生成、合成音節のとき)を短いテキストで表示。
- rom / ipa / kana の全表記と note を併記(**kana は近似である旨を明示**、レビュー P1)。

### コンポーネント
- `CharCell` — 一覧の 1 セル(大きめグリフ + 読み)。クリックでフォーカスを開く。
- `ConsonantMatrix` — place×manner グリッド。
- `VowelTable` — 短長ペア表示。
- `CharFocus` — 文字フォーカス画面本体(特大グリフ + パーツ内訳テキスト + フォント切替 + 全表記)。a11y 対応のモーダル。
- `FontSwitcher` — フォント選択 + 並列比較トグル(比較フォントは遅延ロード)。
- `ReadingToggle` — rom/ipa/kana の表示切替。

## 機能 2: クイズ (`routes/quiz.tsx`)

### 出題軸(2軸設計 / レビュー P0)

`direction + answerField` ではなく、**「問題側に出すフィールド」「答え側に出すフィールド」の2軸**で設計する。フィールドは `glyph | rom | ipa | kana` の4種。

- `promptField`: 問題として提示するもの
- `answerField`: 選択肢として答えるもの
- 例:
  - 文字→読み = `prompt: glyph, answer: rom`(または ipa / kana)
  - 読み→文字 = `prompt: rom, answer: glyph`
- UI 上は「方向(文字→読み / 読み→文字)」+「表記(かな/rom/IPA)」の2択で選ばせ、内部でこの2軸に変換する。これで「読み→文字で“問題側の表記”を選ぶ」ケースも破綻しない。
- **既定は rom または IPA**。kana は近似なので既定にせずヒント/補助寄りに(レビュー P1)。

### 設定パネル
- 出題範囲(難易度): Lv1 / Lv1-2 / … / 全部(**family 内で累積**)
- 方向: 文字→読み / 読み→文字
- 表記: かな / rom / IPA

### 出題
- プールから 1 問、4 択(正解 1 + distractor 3)。distractor は **confusion group 優先 → 同 family fallback** で選定(`lib/confusion.ts`)。
- 選択肢のラベルが重複しないよう、answerField の値が同一になる文字は弾く。
- 回答 → 正誤フィードバック(正解の文字 + 全表記 + note を表示)→ 次へ。
- スコア表示(正答数 / 出題数、簡易ストリーク)。状態は `useState` のみ、永続化なし(必要なら後で localStorage)。

### コンポーネント
- `QuizSetup` — 範囲・方向・表記の選択。
- `QuizCard` — 問題提示 + 選択肢ボタン。
- `QuizResult` — 正誤と解説。

## フォント読み込み

- `root.tsx` の `links` で**既定フォントのみ先読み**(Noto Sans Sinhala)。
- 比較用フォント(Noto Serif Sinhala, Abhaya Libre, Yaldevi, Gemunu Libre)は**文字フォーカス画面で遅延ロード**(必要になった時に `<link>` を差し込む or CSS で対象フォントだけ要求)。5 種同時ロードは避ける(レビュー P2)。

## スタイル

Tailwind v4。グリフは大きく(一覧 `text-5xl` 級、フォーカス `text-8xl`〜`9xl`)。**`leading-none` を避け十分な行間・padding** を取り、上下左右の記号がクリップしないようにする。

## MVP / 段階リリース(レビュー反映)

**MVP に残す核**:
1. 純粋子音マトリクス(place×manner)
2. 独立母音(短長ペア)
3. pilla を `ක` などの carrier 付きで見せる表示
4. **id ベース**の文字フォーカスモーダル(単色・パーツはテキスト併記)
5. rom/IPA 中心の 4択クイズ(2軸設計)
6. **confusion-group ベースの distractor**

**MVP では削る / 後回し**:
- 汎用のパーツ**色分け**(Unicode shaping リスク。明示データ化してから)
- 全フォント**並列比較**(まず 1〜2 種、遅延ロード)
- **conjuncts** UI
- family をまたぐ**混合クイズ**
- スコアの**永続化**(localStorage)
- 書き取り(なぞり書き)

## 実装ステップ

1. **mnemonic データ追加**: 主要文字(Lv1 子音 19 + 基本母音 12)の `mnemonic` を AI 下書き → レビュー → `sinhala.json` に追記
2. データ層(`lib/sinhala.ts` + 型 + id 付与 + mnemonic 型、`lib/levels.ts` + 検証、`lib/confusion.ts`、`lib/explain.ts`)
3. 既定フォント `<link>` 追加・Navigation 差し替え・ルート追加
4. 表ビュー(子音マトリクス → 母音 → 母音記号 → 合成表/例外)+ a11y モーダル(?char=id 同期)
5. 文字フォーカス(特大グリフ + 形/覚え方テキスト + パーツ内訳 + フォント切替 遅延ロード)
6. クイズ(出題ロジック `lib/quiz.ts` 2軸 + confusion distractor → 設定 → カード → 結果)
7. Home の導線整備
8. `npm run typecheck` / `npm run check` で検証
