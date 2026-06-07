# 手書きシンハラ文字データセット 調査メモ

char-ocr のモデル学習に使うデータセットの調査結果と、未解決の問題を記録する。
調査時点: 2026-06。

## 採用データセット: Sinhala Letter and Modifications (454)

- **Kaggle**: https://www.kaggle.com/datasets/sathiralamal/sinhala-letter-454
- **取得**: `char-ocr/data/download.sh`(kaggle CLI、要 ~/.kaggle/kaggle.json)
- **License**: CC BY 4.0(要クレジット表示)
- **HuggingFace 版**: https://huggingface.co/sanjeevan7/emnist-letters-sinhala-resnet18-v2
  - **同一データ** + 学習済み ResNet-18 重み(`pytorch_model.bin`, 454出力)を同梱。ベースライン比較に使える

### 実体(DLして実測。Web上の伝聞値は誤りだった)

| 項目 | 伝聞(誤) | 実測(正) |
| --- | --- | --- |
| 解像度 | 28×28 BMP | **80×80 グレースケール JPEG** |
| 枚数 | 約45,400 | **108,933 枚** |

- **構造**: `Dataset454/{train,valid,test}/{class_id}/*.jpg`
- **分割**: train 87,141 / valid 10,896 / test 10,896(= 80/10/10)
- **クラス**: 454(フォルダ名は **1〜454**、1始まり)
- **クラス分布**: 平均 191.9 枚/クラス、標準偏差 1.9(min 155 / max 199)→ **極めて均等。不均衡なし**
- **筆跡の多様性**: ファイル名サフィックスが複数の収集セットを示す
  - `plain`(34,020) / `xccd`(28,717) / `w,w_s,w_b`(14,307) / `vld`(4,674) / `ns`(3,863) / `ad_mlk`(1,335) / その他
  - → 複数の収集者/筆跡が各クラスに混在。**汎化にプラス**
  - `Copy.jpg`(28)、`()`付き(263)などノイズ的命名も少数あり(手作業収集の痕跡、実害小)

### 精度見通し(実測ベース)

**十分な精度が出る見込みは高い**(小型CNNで valid/test 90%台後半が狙える条件)。
残る注意点(学習してみないと分からない):
1. 454クラスで似た字の取り違え(混同行列で要確認)
2. 筆跡の偏り → 「自分の手書き」での最終検証が必要(収集者母集団が不明)
3. JPEG圧縮ノイズ(軽微)

## シンハラ文字のクラス数 — 定義ごとに違う

「シンハラ文字は何クラスあるか」は**定義による**。454 は唯一の答えではなく、
頻度で選ばれた**恣意的な集合**である点に注意。

| 定義 | クラス数 | 中身 |
| --- | --- | --- |
| アルファベット(Hōḍiya) | **60** | 母音 18 + 子音 42(NIE 1989 標準字母表) |
| Unicode コードポイント | **91** | シンハラブロック U+0D80–0DFF の割当字 |
| 実用部品(基本字 + 母音記号/hal) | **66** | 本データ 454 を構成する部品(基本字 51 + 母音記号/hal 15) |
| キーボード入力で打てる組合せ | **事実上無限** | 部品コードポイントを任意に積む方式(Wijesekara / SLS 1134) |
| フォントが用意するグリフ | **約 600〜750** | 実装依存(Sinhala MN 735, Noto Sans Sinhala ~645)。shaping engine が規則で組むので全列挙しない |
| 合成字を丸ごと数える | **数百〜数千** | 子音 × 母音記号の組合せ。**454 はこの一例**(頻出のみ収録) |

- **454 はシンハラ文字の定義集合ではない**。実際に書かれる合成字のうち頻度の高いものを
  収録したデータセット固有の集合(`ක්‍රි` のような結合子音入りも含む一方、稀な組合せは欠ける)
- 部品(66 種)に分解すれば数百の合成字を有限の組合せで表現できる
  → モデル設計で部品ヘッドを併用する根拠([model-design.md](./model-design.md))
- 各クラスの具体的な分解は [decomposition-table.md](./decomposition-table.md)(454 行の対応表)

### 実コーパスでの使用実態(実測)

「実際に使われる文字数は?」をテキストコーパスで実測した結果。
出典: **Fernando & Dias (2021)** "A Word Frequency List for Sinhala"(ICON 2021,
[aclanthology.org/2021.icon-main.74](https://aclanthology.org/2021.icon-main.74)、
[GitHub: nlpcuom/Word-Frequency-List-for-Sinhala](https://github.com/nlpcuom/Word-Frequency-List-for-Sinhala))。
verified 280,603 語 + 頻度を akshara(正書法クラスタ)に分割集計。
再現: `scripts/download_corpus.sh` でコーパス取得(akshara 分割集計は本表作成時のアドホック。実在 akshara 一覧は `scripts/gen_akshara_table.py` で CSV 生成可)。

| 区分 | 種類数 | 実テキストでのカバー率 |
| --- | --- | --- |
| 全ユニーク akshara | **4,747** | 100%(※大半がノイズ。この数を「使う文字数」と誤解しない) |
| **通常のシンハラ音節**(基本字 1 つ + 母音記号/hal/anusvara) | **730** | **92.2%** |
| **実用音節**(上記のうち頻度 ≥10) | **575** | — ←「日常使うシンハラ文字」の核 |
| 結合子音(基本字 2 つ以上) | 4,017 | **7.8%**(膨張の正体) |

- **4,747 が膨らむ正体は結合子音 4,017 種**。`ක්ස්ට්‍ර`(xtr)`ස්ට්‍රෑ`(str)等の
  **外来語音写**で、1,191 種は頻度=1(固有名詞・商品名・Web ノイズ)
- 元コーパスは **Common Crawl(Web)83% + News + Govt = 127M トークン**(論文 Table 1)。
  Web 主体ゆえ外来音写が濃い。verified でも低頻度語の正しさは未保証(人手確認は頻度上位 3,555 語のみ)
- カバレッジ: 通常音節 上位 190 種で 90%、93 種で 80%。**454 は上位 454 akshara 時点で 98.4%**
  → 作者はフォーム 3 ページ容量で選んだだけだが、結果的に妥当なライン
- **ML 含意**: 454 は実用上ほぼ十分(98%超)。残り 1.6% の取りこぼし(稀合成字・外来音写)は
  部品ヘッドで「近い候補」を出せれば実害が小さい → [model-design.md](./model-design.md) の方針を支持

### 454 の出自(作者の一次情報)

Kaggle dataset description(作者 Sathira Lamal)より、454 の根拠:

- **データ収集フォーム(紙 3 ページ)に収まる字数**が ~450。"able to collect 454 characters"
- **別研究のフォーム OCR セグメンテーション都合**で必要字を選定
  (参考文献 Gomez et al., "Intelligent Digitalization of the Sinhala Form Templates," TENCON 2021)
- 作者は "all possible Sinhala letters" と称するが**網羅性の検証はない**(主観的集合)
- → 言語的・標準的根拠はなく、**フォーム設計 × フォーム OCR 都合 × 主観**で決まった数

### 独立コーパス(SinOCR 手書き)での粒度別文字種 — 454 検証

上の単語頻度リストは Web 主体で外来語ノイズが濃い。**別の独立コーパス**=
SinOCR 手書き OCR の正解テキスト(人手転記、train 907 + test 226 = **1,135 句**、
85% が純シンハラ)で同じ集計をかけ、粒度ごとに数えた。
出典: **Gunathilaka et al. (2025)** "SinFUND and SinOCR"(Research Square,
doi:10.21203/rs.3.rs-6976719/v1 / [github.com/SriDoc/datasets](https://github.com/SriDoc/datasets))。
正解 CSV は `data/corpus/sinocr/{train,test}/data.csv` に追跡済み(粒度別集計は本表作成時のアドホック。実在 akshara の頻度・分解は `scripts/gen_akshara_table.py` で再現可)。

| 粒度 | 種類数 | 内訳 |
| --- | --- | --- |
| **文字単位**(Unicode コードポイント) | **71** | 子音 41 + 独立母音 13 + 母音記号 14 + hal 1 + anusvara 1 + 記号 1 |
| **合字単位**(子音連結の骨格。母音記号違いは統合) | **167** | 重子音 129 + rakaransaya(-ra)17 + yansaya(-ya)17 + その他 ZWJ 4 |
| **akshara 単位**(母音記号込みの音節クラスタ) | **620** | 通常音節 329(token 90%)+ 合字含む 291(token 10%) |

- **粒度の階層**: 文字 71 → 組合せて合字 167 → 母音記号が付いて音節 620
- **結合子音は外来語音写ではなく正統な結合が主**: 合字 167 のうち 129(77%)は ZWJ 無しの
  **重子音**(`න්න` `ත්ත` `ක්ෂ` 等、シンハラ語本来の語中重子音)。ZWJ 明示結合は
  ra/ya 系がほぼ全て(`ප්‍ර` `ද්‍ය` 等、サンスクリット由来)。Web リストで膨れた `xtr` 等の
  長い外来音写は手書き実文書では薄い(結合子音 token は両コーパスとも約 8〜10% で一致)
- **★ 454 の弱点が判明**: SinOCR akshara のうち **454 に含まれるのは 80.7% のみ**
  (単語頻度リスト基準の 98.4% は、454 の出自=同系フォーム OCR と母集団が近く楽観的だった)
  - 454 に無い高頻度音節: `ගේ`(gē, 属格語尾)`පෙ` `කො` `රේ` `දෙ` 等の **e/o 系母音記号**、
    `සිං` `ඉං` 等の **anusvara 付き**、`න්න` `ත්ත` 等の重子音
  - → **454 を丸ごと分類しても、実手書き文の約 2 割は未知クラスになる**

## label(クラスID → Unicode マッピング)の問題 ★未解決

学習(整数ラベル)には不要だが、**アプリ表示には必須**。以下の問題があり、確定していない。

### マッピングの所在

- 作者提供: `handwritten_constants.py`(変数 `TRUE_LABEL`)
  - URL: https://storage.googleapis.com/kaggle-forum-message-attachments/2632907/20266/handwritten_constants.py
  - Discussion: https://www.kaggle.com/datasets/sathiralamal/sinhala-letter-454/discussion/416368
  - 取得済み: `tmp/handwritten_constants.py`(UTF-8、要 `char-ocr/data/labels/` へ移動)
- Discussion 貼り付け版もあるが、公式 .py の方がマシ(壊れ値が少ない)

### 問題1: クラス数の不一致(影響大)

- **ラベルは 456 個**(idx 0..455)、**データフォルダは 454 個**(1..454)
- **2個多い**。先頭(folder 1 = `අ`)は対応一致を確認済み
- 末尾は基底字ではなく「結合記号・母音記号の単独クラス」ゾーン:
  ```
  idx449 (folder450): 'HQ'   ← 壊れ
  idx450 (folder451): 'ෛ'
  idx451 (folder452): 'ෙ'
  idx452 (folder453): 'H'    ← 壊れ
  idx453 (folder454): 'Hq'   ← 壊れ
  idx454 (folder455): 'ං'    ← データに対応フォルダなし(余分?)
  idx455 (folder456): 'ර්'   ← データに対応フォルダなし(余分?)
  ```
- **仮説**: 末尾2個(idx454 `ං`, idx455 `ර්`)が余分。ただし「途中でズレ始めていない」保証は未検証
- → **要検証**: 全クラスを画像と突き合わせ(検証シート `tmp/verify/page_01..12.png` を生成済み、1ページ40クラス)

### 問題2: 壊れた4ラベル = FM Abhaya レガシーフォント残骸

`COda`/`HQ`/`H`/`Hq` は **FM Abhaya レガシーフォントの ASCII エンコーディング残骸**(確定)。
変換マップ: [akuruAI/Pandukabhaya](https://github.com/akuruAI/Pandukabhaya) の `pandukabhaya/mappings/fm_abhaya.json`(取得済み: `tmp/maps/fm_abhaya.json`)。

FM Abhaya マップの該当キー:
- `CO`→`ඣ`(jha) / `H`→`්‍ය`(yansa, -ya結合) / `q`→`ු`(u) / `Q`→`ූ`(ū) / `d`→`ා`(ā) / `a`→`්`(hal)

機械変換結果と確度:

| folder | FM残骸 | 変換候補 | 確度 | 備考 |
| --- | --- | --- | --- | --- |
| 426 | `COda` | `ඣ`系派生 | 中 | `CO`=ඣ は確実。`da`部分の解釈に幅(ā+hal は不自然) |
| 450 | `HQ` | `්‍යූ`(yansa+ū) | 中〜高 | 末尾の記号ゾーン文脈と整合 |
| 453 | `H` | `්‍ය`(yansa) | 高 | FMマップで明確 |
| 454 | `Hq` | `්‍යු`(yansa+u) | 中〜高 | |

- 426 の周辺: 423`ඣ` 424`ඣා` 425`ඣු` **426`COda`** 427`ඣ්` → `ඣ`グループ内の母音派生のはず
- **未確定**: 単純 FM 変換だと基底子音が無く不完全。最終確定には画像照合 or シンハラ話者の確認が必要

### 重複表記(参考)

`බ්‍රෝ`(idx157,162) / `රැ`(191,192) / `ළූ`(279,280) / `ෆූ`(287,288)

## 残タスク

1. **456 vs 454 ズレの確定**(影響大。これを先に解くのが安全)
   - 検証シートで全クラスの folder↔label↔画像 対応を確認、ズレ起点を特定
2. 壊れ4ラベル(426/450/453/454)の正字確定
3. label を `char-ocr/data/labels/` に整備版として配置(壊れ修正・オフセット調整・454に揃える)
4. 学習自体は整数ラベルで先行可能(label 整備と並行 or 後回しでよい)

## 参考: 他データセット(行・フォーム単位、1文字認識には不向き)

- **SinOCR / SinFUND**(2025-09 最新ベンチマーク)
  - GitHub: https://github.com/SriDoc/datasets(実体は Google Drive)/ IEEE DataPort
  - SinOCR: 印刷10万枚(200フォント)+ 手書きテキスト 1,135枚
  - SinFUND: 手書きフォーム 100枚(フルアノテーション)
  - **行・テキスト・フォーム単位**。1文字に切り出すにはセグメンテーションが要る。将来の発展用
  - 引用必須(Research Square, doi:10.21203/rs.3.rs-6976719/v1)
