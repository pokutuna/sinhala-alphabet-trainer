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
