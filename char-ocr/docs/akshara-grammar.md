# シンハラ akshara の形式的文法と網羅性の実証

シンハラの「1文字」= akshara(書記素クラスタ)を **形式的文法(正規文法)で定義**し、
その文法が実在のシンハラ語テキストをどこまで網羅するかを **実データ + 権威ある実装**で検証した記録。

- 入門・直感的な結合ルールは [akshara-rules.md](./akshara-rules.md)(本書はその厳密版・実証版)。
- 普遍仕様(字数・hal の振る舞い・配置)は [../../docs/sinhala-script.md](../../docs/sinhala-script.md)。
- 配置の実測分解は [glyph-placement.md](./glyph-placement.md)、欠落の地図は [[sinhala-synthetic-data-population]]。

## 結論サマリ

- **形式的文法は定義できる。** ただし「1 本のきれいな式」ではなく、HarfBuzz の Indic 音節機械
  (`hb-ot-shaper-indic-machine.rl`)が**唯一の権威ある定義**。本書はそれを Sinhala に特化して書き下す。
- **正しい akshara に限れば、文法はほぼ完全に網羅する。** Sinhala Wikipedia 全 18,354 種(3172 万トークン)に
  当てた結果、**トークン量で 99.92% が consonant/vowel syllable として生成可能**。
- 残り 0.08% は文法の漏れではなく **「壊れたクラスタ」=断片・akshara 境界の崩れ・過剰 ZWJ・非文字記号**。
  HarfBuzz もこれらを `broken_cluster` という**正式なクラスタ型**として扱う(捨てない)。
- **手書きの近似文法は信用しない。** 本調査では自前の正規表現を 3 回反証した(下記「失敗の記録」)。
  網羅性の最終的な権威は **HarfBuzz の音節機械 + フォントの dotted-circle 判定**にある。

---

## 1. 文字カテゴリ(Unicode IndicSyllabicCategory が真値)

文法の終端記号は個々のコードポイントではなく **音節カテゴリ**。割り当ては Unicode の
`IndicSyllabicCategory.txt`(Sinhala ブロック)を真値とする。HarfBuzz の Indic シェーパも同じ表から生成される。

| カテゴリ | 記号 | コードポイント | 例 | Indic_Syllabic_Category |
| --- | --- | --- | --- | --- |
| 子音 | `C` | U+0D9A–0DB1, 0DB3–0DBB, 0DBD, 0DC0–0DC6(41 字) | ක | Consonant |
| 子音 Ra | `R` | U+0DBB(ර のみ) | ර | Consonant(reph 候補なので別記号) |
| 独立母音 | `V` | U+0D85–0D96(18 字) | අ | Vowel_Independent |
| 母音記号(matra) | `M` | U+0DCF–0DD1, 0DD2–0DD4, 0DD6, 0DD8–0DDF, 0DF2–0DF3(16 字) | ි ා ේ | Vowel_Dependent |
| hal / al-lakuna | `H` | U+0DCA | ් | Virama |
| 音節修飾(anusvara/visarga/candrabindu) | `S` | U+0D81, 0D82, 0D83 | ං ඃ | Bindu / Visarga |
| 結合子 ZWJ | `J` | U+200D | `ක්‍ර` (kra, ZWJ あり) ↔ `ක්ර` (ZWJ なし) | — |
| 非結合子 ZWNJ | `W` | U+200C | `ක්‍ය` (ZWJ で結合) ↔ `ක්‌ය` (ZWNJ で分離) | — |

> **重要 1**: `ර`(RAYANNA)は子音だが reph(`ර්` が上付き記号 repaya に化ける)の候補なので、文法では `C` と別の `R` で扱う。
> **重要 2**: `ෝ`(U+0DDA, ō)などの **split matra は NFD で分解**して `M H` 等の並びとして扱う。HarfBuzz も
> `decompose_indic`(`hb-ot-shaper-indic.cc`)で Unicode 標準分解に委ねる。本書の文法も入力を **NFD 正規化してから**当てる。
> **重要 3(ZWJ/ZWNJ は不可視で字形を切り替えるスイッチ)**: どちらも幅ゼロ・画面に出ない制御文字で、
> **隣接文字をどう繋ぐか**だけを指示する。同じ `子音 + hal + 子音` の並びでも:
> - **ZWJ あり** `ක්‍ර`(ක ් **U+200D** ර)→ `ka` の下に `ra` が潜る合字(rakaransaya)= 1 つの塊。
>   「特殊結合形にしろ」のスイッチ。先頭が `ර` なら repaya、後続が `ය` なら yansaya を起動。
> - **ZWJ/ZWNJ なし** `ක්ර`(ක ් ර)→ `ක්` と `ර` が横に普通に並ぶ既定の合字。
> - **ZWNJ あり** `ක්‌ය`(ක ් **U+200C** ය)→ 本来くっつく合字を**あえて分離**(教材・特殊表記用。実テキストでは稀)。
>
> つまり **ZWJ = "繋げ/特殊形にしろ"、ZWNJ = "繋げるな"**。例欄の対比はこの違いを示す(レンダラ次第で表示差が出る)。

---

## 2. 形式的文法(HarfBuzz indic-machine.rl の Sinhala 特化版)

HarfBuzz の音節機械を、Sinhala に存在しないカテゴリ(register shifter `RS`、consonant medial `CM`、
nukta 系 `N`、Myanmar 系 `MPst` 等)を削って書き下したもの。記法は正規表現(`*`=0 回以上, `?`=省略可, `|`=選択)。

```ebnf
(* 終端: C R V M H S J(ZWJ) W(ZWNJ) — §1 のカテゴリ *)

c        = C | R ;                          (* 子音(Ra 含む) *)
z        = J | W ;                          (* joiner: ZWJ または ZWNJ *)
reph     = R H ;                            (* 先頭 Ra+hal → repaya 候補 *)
sm       = S ;                              (* 音節修飾(anusvara/visarga) *)

cn               = c , J? ;                                  (* 子音 + 任意 ZWJ *)
halant_group     = z? , H , J? ;                            (* (任意 joiner) hal (任意 ZWJ) *)
final_halant_grp = halant_group | ( H , W ) ;               (* 末尾 hal、または hal+ZWNJ *)
matra_group      = z* , M , H? ;                            (* (joiner) 母音記号 (hal) *)
syllable_tail    = ( z? , sm , sm? , W? )? ;                (* 末尾の修飾記号 *)
hal_or_matra     = final_halant_grp | matra_group* ;

complex_tail     = ( halant_group , cn )* , hal_or_matra , syllable_tail ;

(* === 2 種類の有効クラスタ === *)
consonant_syllable = cn , complex_tail ;
vowel_syllable     = reph? , V , ( J | complex_tail ) ;
```

読み方:
- **核は子音 1 つ(`cn`)または独立母音 1 つ(`V`)**。これが「akshara は必ず base を 1 つ持つ」の正体。
- `( halant_group , cn )*` が**結合子音の積み重ね**。`halant_group = z? H J?` が
  「hal の前後どちらにも joiner が来られる」を表す ── これが [akshara-rules.md](./akshara-rules.md) の
  式 `{C+H+ZWJ}` が**取りこぼしていた点**(ZWJ は任意、かつ hal の前にも置ける)。
- 末尾は `hal_or_matra`(hal で止めるか母音記号 1 個か)+ `syllable_tail`(anusvara 等)。

### 入力前処理(文法を当てる前に必須)

1. **NFC → NFD 正規化**(split matra を構成部品に分解)。
2. カテゴリ列に写像(§1)。
3. 上記文法に `fullmatch`。

---

## 3. 具体例(各規則がどう当たるか)

NFD 後のカテゴリ列を併記。`✓` は consonant/vowel syllable として成立。

| akshara | 読み | NFD コードポイント | カテゴリ列 | 当たる規則 | 判定 |
| --- | --- | --- | --- | --- | --- |
| `අ` | a | 0D85 | `V` | `vowel_syllable: V` | ✓ |
| `අං` | aṃ | 0D85 0D82 | `V S` | `V , syllable_tail` | ✓ |
| `ක` | ka | 0D9A | `C` | `cn`(後置なし) | ✓ |
| `කි` | ki | 0D9A 0DD2 | `C M` | `cn , matra_group` | ✓ |
| `කා` | kā | 0D9A 0DCF | `C M` | 同上 | ✓ |
| `ක්` | k | 0D9A 0DCA | `C H` | `cn , final_halant_grp` | ✓ |
| `ක්‍ර` | kra | 0D9A 0DCA 200D 0DBB | `C H J C` | `(halant_group=z?HJ?) cn` | ✓ |
| `ක්‍රි` | kri | 0D9A 0DCA 200D 0DBB 0DD2 | `C H J C M` | 結合 + matra | ✓ |
| `න්ත` | nta | 0DB1 0DCA 0DAD | `C H C` | 結合(**ZWJ なし**) | ✓ |
| `ක්ෂ` | kṣa | 0D9A 0DCA 0DC2 | `C H C` | 同上(頻出 51,631) | ✓ |
| `ශ්‍රී` | śrī | 0DC1 0DCA 200D 0DBB 0DD3 | `C H J C M` | 結合 + matra | ✓ |
| `ර්ක` | rka | 0DBB 0DCA 0D9A | `R H C`(= reph) | `(halant_group) cn` | ✓ |
| `කෝ` | kō | 0D9A 0DDA→0DD9 0DCF | `C M M`(split matra) | NFD 後 `cn matra_group*` | ✓ |

### 文法が弾く例(= broken_cluster。これらは「文字でない」)

| 入力 | NFD カテゴリ | なぜ弾くか | Noto 実シェーピング |
| --- | --- | --- | --- |
| `ෙ`(kombuva 単独) | `M` | base(C/V)が無い | `sin_e_matra.25CC`(★dotted circle) |
| `ත්අ`(t+hal+独立母音) | `C H V` | hal の後に独立母音 = **2 つの別 akshara** | `ta.virama` + `a`(2 字として描画) |
| `‍ය`(先頭 ZWJ + ya) | `J C` | 先頭が joiner = 前の akshara の尾が切れた断片 | 成立するが断片 |
| `රැු`(母音記号 2 個) | `C M M`(同種) | 母音記号スロットは 1 つ | dotted circle |
| `න්්`(hal 2 個) | `C H H` | hal が 2 連 | dotted circle |
| `෴`(句読点 kunddaliya) | `X` | そもそも Indic 文字でない | — |

---

## 4. 網羅性の実証(全 akshara × 2 つの権威)

`experiments/001-sinhala-wikipedia/verify_grammar_coverage.py` で、Sinhala Wikipedia 全 akshara に対して
**(A) §2 の文法による分類**と **(B) Noto Sans Sinhala の実シェーピング(dotted-circle が出れば不成立)**を
突き合わせた。データは `akshara_freq_wikipedia.csv`(18,354 種 / 31,719,390 トークン)。

### 文法による分類

| クラスタ型 | distinct | %dist | tokens | %tok |
| --- | ---: | ---: | ---: | ---: |
| consonant_syllable | 13,397 | 73.0% | 29,997,086 | **94.570%** |
| vowel_syllable | 154 | 0.8% | 1,698,093 | **5.353%** |
| broken(弾かれた) | 4,753 | 25.9% | 23,973 | 0.076% |
| non_indic(`෴` 等) | 50 | 0.3% | 238 | 0.001% |

→ **正しい akshara はトークン量 99.92% を文法が生成**。distinct の 26% が broken に落ちるのは、
**少頻度の断片・崩れがロングテールに大量に存在する**ため(が、テキスト中の実出現はごく僅か)。

### 文法 vs 実シェーピング(2×2、トークン)

| | shape 成立 | shape 不成立(dotted/notdef) |
| --- | ---: | ---: |
| **文法:成立** | 31,693,233(99.92%) | 1,946 |
| **文法:broken** | 20,634 | 3,577 |

両者はトークン量で **99.92% 一致**。残る不一致(22,580 トークン = 0.07%)の内訳:

| 不一致カテゴリ | distinct | tokens | 例 | 意味 |
| --- | ---: | ---: | --- | --- |
| E. 過剰/位置ずれ ZWJ(除去で成立) | 3,175 | 10,437 | `කි‍්‍ර` `ක‍ෂ` `ය‍ට` | 文法は broken 判定だが、**ZWJ を除けば成立**。視覚的には描ける |
| C. 先頭/末尾 ZWJ 断片 | 735 | 6,435 | `‍ය` `යි‍` | 前後の akshara の尾が 1 セルに切れて混入 |
| D. hal+独立母音 = akshara 境界 | 172 | 3,286 | `ත්අ` `න්එ` | **2 つの別 akshara**が連続。分割ミス |
| B. 文法が緩く shape 不成立 | 429 | 1,110 | `රැු` `විෙ` | 文法は通すが Noto が dotted circle。**文法が緩い側の誤り** |
| A. 独立母音+従属記号 → Noto 拒否 | 20 | 836 | `අැ` `අා` `එ්` | 文法は `vowel + matra` を許すが Noto は不正とする(正書法上も異常) |
| その他(末尾断片・二重 hal・非 Indic) | 200 | 476 | `ක්රි්යා` `෴` | 構造破れ・記号 |

### この 2×2 から分かること

- **E・C・D(計 20,158 トークン)は「文法の漏れ」ではない。** ZWJ 過剰・断片・境界崩れで、
  HarfBuzz も `broken_cluster` として隔離する対象。文法が弾くのが**正しい**。
- **A・B(計 1,946 トークン)だけが「文法が緩すぎる」真の不一致。** `vowel + matra`(`අැ`)や
  母音記号 2 個を文法が通してしまうが、フォント(と正書法)は拒否する。**完全な厳密化にはこの 2 ケースを
  文法から除く制約が要る**(が、トークン量 0.006% で実害は無視できる)。

---

## 4-2. 「連数(conjunct)」の 2 指標 — 混同が「Armstrong = 4 連」誤集計の原因

「N 連」には**異なる 2 つの意味**があり、混ぜると外来語を過大評価する。両者を別指標として定義する。

| 指標 | 定義 | 計測 | 何を表すか |
| --- | --- | --- | --- |
| **stack** | 1 つの base に視覚的に積み重なった子音グリフ数(base + 乗った rakar/yansa/repaya) | shape して `adv>0` の base に乗る `adv==0` の結合子音グリフを数える | **字が縦に積まれた数** |
| **hal_chain** | ハルで母音を消して連続する素子音の数(`split_aksharas` 1 塊内の C コードポイント数) | コードポイントの C を数える | **音韻的な子音連続の長さ** |

実装は [`scripts/_akshara.py` の `count_conjuncts(akshara, font)`](../scripts/_akshara.py) が `(stack, hal_chain)` を返す。

### 実測分布(Sinhala Wikipedia 18,354 distinct / 31,719,390 token)

**stack(視覚的な積み):**

| stack | distinct | token | 例 |
| ---: | ---: | ---: | --- |
| 1(積みなし) | 93.2% | **98.41%** | ක, න්, කි |
| **2(積み 1 段)** | 6.7% | **1.58%** | `ප්‍ර` `ක්‍රි` `ත්‍ර` — **現実の上限** |
| 3 以上 | 0.04% | 0.00003% | `ස්ෆ්ට්ෆ්‍ර්ස්…` 等、**全てノイズ**(無意味な羅列) |

→ **正しい綴りで字が積み重なるのは最大 2 連。**rakar/yansa/repaya は base 1 個に 1 個しか乗らない構造なので、stack≥3 は壊れデータだけ。

**hal_chain(ハル連結):**

| hal_chain | token | 例 | 性質 |
| ---: | ---: | --- | --- |
| 1 | 85.43% | ක, ය | 単独 |
| 2 | 8.92% | `න්න` `ත්ත` `ක්ෂ` | 重子音・語中連結(日常語) |
| 3 | 0.28% | `න්ත්‍ර`(ndra) `ම්ප්‍ර`(mpra) | サンスクリット・外来音写 |
| **4** | 0.006% | `ම්ස්ට්‍රෝ`(Arm**stro**ng) `ක්ස්ප්‍ර`(ex**spr**ess) | **外来語音写**(固有名詞) |
| 5 以上 | <0.001% | `ඩ්ෆ්හ්ඩ්ෆ්` 等 | ほぼ全て Web ノイズ |

→ **意味のある単語は最大 3 連(hal_chain)。4 連は Armstrong/express 等の外来語音写。5 連以上はノイズ。**

### 「Armstrong = 4 連」はなぜ誤りだったか

Armstrong `ආම්ස්ට්‍රෝන්` を `split_aksharas` で切ると `ආ | ම්ස්ට්‍රෝ | න්` の 3 塊になり、中央の塊は
**hal_chain = 4**(m+s+ṭ+r)。これを「4 連」と呼んでいた。だが視覚的には:

```
ම්ස්ට්‍රෝ を shape → [ma-al, sa-al, tta, rakar-sign, ...]
                      └横並び┘└横並び┘└─ ට්‍ర の積み(stack=2)─┘
```

積まれるのは末尾 `ට්‍ర` の **stack=2** だけ。手前の `ම් ස්` はハル止め子音が**横に並ぶだけで積まれない**。
「4 つの字が積み重なる」字は存在せず、**hal_chain=4 を視覚的な積みと取り違えていた**のが誤集計の正体。

---

## 4-3. 「文字数」は何を 1 文字と数えるかで 5 段階ある

「シンハラ文字は何字あるか」は**数え方で 2 桁変わる**。論理(文法が許す)→ 実在(コーパスに出る)→
実用(頻度で絞る)の 5 段階を、実数で固定する。部品母数は **子音 41 / 独立母音 18 / 母音記号 19 / 母音修飾(anusvara・visarga) 2**。

| 段階 | 数え方 | 数 | 内訳・根拠 |
| --- | --- | ---: | --- |
| ① 部品 | 単独のコードポイント | **~80** | 子音 41 + 独立母音 18 + 母音記号 19 + hal/VM ほか |
| ② 理論上限(1〜2連) | 文法が許す全組み合わせ | **≈ 108,500** | 1連 41×21×3+18×3=2,637、2連は全 C×C で 41×41×21×3=105,903。3連以上は前置を増やすぶん無限なので数えない(視覚的な積み stack は最大 2 連) |
| ③ 現実的な積みに限定 | 2連の後続を ra/ya に絞る | **≈ 7,800** | 積み(stack)は rakar(後続 ර)/yansa(後続 ය)/repaya(先頭 ර)がほぼ全て。後続を 2 種に絞ると 1連 2,637 + 2連 41×2×21×3=5,166 |
| ④ 実在(Wikipedia) | 実際に書かれた視覚単位(`\X`)の distinct | **3,052** | 3172 万トークンに登場した distinct。`split_aksharas`(hal_chain)で数えた 18,354 は外来語の長い連結を 1 巨大塊にした膨張で、視覚単位で数え直すと 1/6 に減る |
| ⑤ 実用コア | 頻度で絞る | **~300〜450** | 頻度≥10 で 1,083 種。上位 300 種で token 99.0%、**454 種(Kaggle 454 相当)で 99.8%** |

> **数え方の注意**: ④の「3,052」は Unicode 標準の拡張書記素クラスタ `\X`(= 視覚的な 1 文字単位)で
> distinct を取った値。学習ラベルの 1 ユニットを `split_aksharas`(ハル止め連結も 1 塊にする)で切ると
> 外来語音写が 1 巨大トークンに化けて distinct が 18,354 に膨らむ。**「文字数」を語るときは視覚単位(`\X`)で
> 数えるのが正しい**(hal_chain ベースの塊数は連数集計同様、外来語を過大評価する)。

**カバレッジ(Wikipedia, 視覚単位 token):**

| 上位 N 種 | token カバー率 |
| ---: | ---: |
| 200 | 96.2% |
| 300 | 99.0% |
| **454** | **99.8%**(Kaggle 454 のライン) |
| 620 | 99.9% |

→ **「通常考えなくていいライン」= 上位 ~450 種**。これで実テキストの 99.8% をカバーし、残り 0.2% は
外来語音写・固有名詞で部品の組み合わせ([model-design.md](./model-design.md) のパーツヘッド)で近似できる。

再現: [`experiments/001-sinhala-wikipedia/`](../experiments/001-sinhala-wikipedia/) の `akshara_freq_wikipedia.csv` に
`count_conjuncts` / `\X` 分割を当てて算出(`scripts/_akshara.py`)。粒度別の文字種は [datasets.md](./datasets.md) 参照。

---

## 5. 「網羅するか」への最終回答

| 母集団 | 網羅できるか |
| --- | --- |
| **正しい akshara(視覚的に成立する形)** | ✅ **ほぼ完全**。トークン量 99.92%、残りは文法を厳密化すれば詰められる |
| **生コードポイント列の崩れ・断片を含む全文字列** | ❌ 不可能。だが**網羅すべきでない**(HarfBuzz も broken として隔離する) |
| **手書きの近似式 1 本で** | ❌ 不可。実測で 3 回反証(下記) |

**要点:** 形式的文法は定義できるし、正しい akshara をほぼ完全に網羅する。ただし権威は
**HarfBuzz の Indic 音節機械**であり、自前の式ではない。実運用で「成立/不成立」を判定するなら、
[model-design.md](./model-design.md) の方針どおり **shape して dotted-circle(U+25CC)・notdef が出なければ成立**、
が最も確実な網羅判定になる(文法はその構造の理解と、フォント非依存の生成規則として使う)。

---

## 6. 失敗の記録(なぜ手書き文法を信用しないか)

本調査で自前の正規表現を段階的に直し、その都度実データで反証された:

| 版 | 仮定 | 実データ distinct カバー | 反証されたもの |
| --- | --- | ---: | --- |
| v1 | `{C+H+ZWJ}+C+...`(akshara-rules.md の式そのまま、ZWJ 必須) | 12% | `න්ත` 等の **ZWJ なし結合**が大半 |
| v2 | ZWJ を任意に | 66%(token 99.88%) | `ප‍්‍ර` の **hal 前後両側 ZWJ** |
| v3 | ZWJ を hal 前後に + 前置に matra + hal 無し ZWJ 結合 + V+matra | 94%(token 99.99%) | 残りは断片・境界崩れ(= broken が正しい) |
| **権威版** | HarfBuzz indic-machine.rl を Sinhala 特化で移植 | token **99.92%**(実シェーピングと一致) | — |

教訓: シンハラのクラスタ規則は ZWJ の位置・任意性・split matra・reph で例外が多く、
**直感で書いた式は必ず取りこぼす**。HarfBuzz の音節機械(`hb-ot-shaper-indic-machine.rl`)が
業界標準の唯一の正解で、ブラウザ(Chrome/Firefox/Android)もこれで描く。

## 出典・再現

- 文法: HarfBuzz `src/hb-ot-shaper-indic-machine.rl`(Indic 音節機械。Sinhala は Indic シェーパが担当 = `src/hb-ot-shaper.hh`)
- カテゴリ: Unicode `IndicSyllabicCategory.txt`(Sinhala ブロック U+0D80–0DFF)
- split matra 分解: HarfBuzz `src/hb-ot-shaper-indic.cc` `decompose_indic`(Unicode 標準分解に委譲)
- 検証: `experiments/001-sinhala-wikipedia/verify_grammar_coverage.py`(要 Noto Sans Sinhala、スクリプト冒頭に取得コマンド)
- データ: `experiments/001-sinhala-wikipedia/akshara_freq_wikipedia.csv`(3172 万トークン集計)
