# グリフ配置ベースの部品分解(HarfBuzz 実測)

手書き認識のクラスを「視覚字形」で切るとき、コードポイントの理屈や目視でなく
**HarfBuzz の実シェーピング結果(グリフの x/y/advance)で部品の位置を確定する**アプローチ。
関連: 結合ルールは [akshara-rules.md](./akshara-rules.md)、部品の種類は [decomposition-table.md](./decomposition-table.md)、
モデル設計は [model-design.md](./model-design.md)。再現スクリプト: `scripts/gen_akshara_table.py`(HarfBuzz 分解 + 配置 + フォント融合フラグを CSV 出力)。

## なぜ HarfBuzz か(シンハラ向けに正しい・裏取り済み)

- HarfBuzz の **Indic shaper**(梵字系: Bengali/Devanagari/Tamil/Telugu/Sinhala 等)が
  シンハラの reordering(prebase 母音 / repaya / rakaaransaya)を実装。Win10 挙動に追従。
- **Chrome / Firefox / Android が使う標準 shaper** = ブラウザ実機が実際に描く字形そのもの。
  → 「フォントが実際にどう部品を置くか」を測る道具として最適。
- 注意: 出力は HarfBuzz + フォント(Noto Sans Sinhala)依存。別フォントで advance や
  rakaaransaya の細部は変わり得るが、**配置の構造的ルールは shaper が決める**ので大枠は頑健。
- 実行: `uv run --with uharfbuzz`。`hb.Face`/`hb.Font`/`hb.shape`、グリフ名 `font.get_glyph_name(cp)`、
  位置 `glyph_positions` の x_offset/y_offset/x_advance。

## なぜコードポイントだけでは足りないか

結合子音はどれも `[子音] [HAL] [子音]` という同じ構造の codepoint 列。
「後ろの子音が下に潜るか / 横に並ぶか / 斜め棒に化けるか」は **codepoint に書かれていない**。
配置はフォント(shaper)が GSUB/GPOS で決める。
→ 位置を機械的に得る唯一の手段が **shaper にレンダリングさせる**こと。

## 配置プリミティブ = 3 種で説明できる

**位置は x 座標でなく、HarfBuzz が返すグリフの順序(リスト上の位置)で判定する。**
HarfBuzz は prebase reordering 済みの**視覚順(左→右)**でグリフを返すので、BASE より前に
並ぶグリフが PRE(左)、後ろが NEXT/POST。x 座標は当てにならない(prebase の kombuva ෙ は
advance=0/x_offset=0 で base と同じ x=0 になり、x の不等号では PRE と判別できない)。

| タグ | 条件(BASE = 最初に advance>0 のグリフ) | 意味 |
| --- | --- | --- |
| **BASE** | 最初に advance>0 のグリフ | 主役の基底字(子音/独立母音、hal 付き含む)。必ず 1 つ |
| **PRE** | BASE より**前**に並ぶ | 左に回り込む prebase 母音(kombuva ෙ 系) |
| **NEXT** | BASE より後で advance>0 | 結合子音の後続子音(横並び。න්ට の ට) |
| **POST** | BASE より後で advance==0, y==0 | 右に付く母音記号・hal・anusvara |
| **ABOVE/BELOW** | BASE より後で advance==0, y≠0 | 上/下に付く記号 |

### SinOCR 626 クラスの実測分類(token シェア・修正後)

| 配置パターン | クラス数 | token% | 例 |
| --- | --- | --- | --- |
| BASE(1 グリフに完全融合) | 158 | **67.7%** | පු ෂ ල් ප හ ස |
| BASE+POST | 97 | 14.6% | රු සිං යා මා |
| BASE+NEXT(結合子音) | 157 | 6.1% | න්ට න්දි ල්කි ත්න |
| PRE+BASE(kombuva 左) | 46 | 5.6% | පෙ රේ ගේ කේ |
| PRE+BASE+POST(split matra 左右挟み) | 41 | 2.8% | කො හෝ මෝ බො |
| BASE+NEXT+POST | 57 | 1.7% | ර්නැ ල්ෂා ත්වැ |
| 残り(多重結合・裾) | ~70 | <2% | ස්ටෝ ප්‍රා 等 |

**1 グリフ完全融合が 67.7%**(子音+母音記号がフォント内で 1 グリフ pu/sha/l 等)。

## split matra はグリフ上「左右に分裂」= NFD 分解と一致

`කො`(ko)の実シェーピング:

```
入力 NFC: ක + ො           (子音 + o 記号)
入力 NFD: ක + ෙ + ා        (子音 + kombuva + aela-pilla)

HarfBuzz グリフ(返却順 = 視覚左→右):
  [ෙ evowelsign]  adv=0   ← PRE (BASE より前 = 左に回り込む)
  [ක kasinh]      adv=975 ← BASE(本体)
  [ා aavowelsign] adv=0   ← POST(右に貼り付く)
```

1 つの母音 o が視覚上 **左破片 ෙ + 右破片 ා** に割れて子音を挟む(split matra)。
`කෝ`(ō)は ෙ(PRE)+ ක්(BASE, 本体+hal)+ ා(POST)の 3 破片。`කෞ`(au)も ෙ(PRE)+ ක(BASE)+ ෟ(POST)。

→ **NFD の構成要素とグリフの破片が 1 対 1 対応**(NFD の ෙ↔左破片, ා↔右破片)。
ただし**並び順は違う**: NFD は `ක ෙ ා`(子音が先頭)だが、表示は `ෙ ක ා`(kombuva が左へ
reorder)。一致しているのは「同じ 2 部品に割れること」で、順序ではない。

## 位置つき分解の形(目標)

`(部品, 位置)` のタプル列で akshara を表す:

```
කො  → [ෙ@PRE] + [ක@BASE] + [ා@POST]
න්ම → [න්@BASE] + [ම@NEXT]
ම්න → [ම්@BASE] + [න@NEXT]
```

これで順序問題(`න්ම` vs `ම්න` = 同じ部品の並び順違い)も **どちらが BASE か**で区別できる。
コードポイントだけでは C-HAL-C の並び順しか持たないが、shaper の reorder 済み順序が
「どちらが先頭(BASE)か」を確定する。

## 検証: 位置つき分解で全 akshara が一意に表せる(衝突ゼロ)

各 akshara を `(gid, 位置)` のタプル列に分解してキー化し、SinOCR 626 クラスで衝突を測定:

- **626 クラス中、衝突ゼロ**。位置つき分解で全 akshara が可逆に区別できる。
- 順序ペア(`න්ම` vs `ම්න`)も解決: `[na+hal @BASE]+[ma @NEXT]` vs `[ma+hal @BASE]+[na @NEXT]`。
  **どちらが BASE(hal 付き・先頭)か**で区別。旧来の 13〜15 組の順序衝突が消えた。
- 出現する部品の種類 = **197 gid**(丸ごと 626 クラスより少ない)。
- 位置は **BASE / PRE / ABOVE / BELOW / POST / NEXT** の 6 種。

### 重要: gid で識別すること(グリフ名・Unicode 名末尾では潰れる)

ෂ(MUURDHAJA SAYANNA, gid60)/ ශ(TAALUJA SAYANNA, gid59)/ ස(DANTAJA SAYANNA, gid61)は
別グリフだが、Unicode 名の末尾単語が全部 "SAYANNA" で、表示用に末尾単語を使うと潰れて見える。
照合は必ず **glyph id** で行う(名前や Unicode 名末尾ではない)。
これを誤ると 85 組の偽衝突が出る(実体は衝突していない)。

## 部品語彙 197 gid の性質(設計判断が要る点)

197 gid には「ක(素の子音)」「ක්(ka+hal 合体)」「කි(ka+i 合体)」が **別 gid** として混在する
(フォントが融合グリフを別々に持つため)。つまり 197 は「素の部品(子音/母音記号)」ではなく
**フォントの描画単位**。融合グリフは `(子音 × {なし/hal/母音記号})` を shape した名前から
逆引き辞書を作れば素部品に割り戻せる(262 個の融合形を機械生成できることを確認済み)。

## 残課題

- このアプローチで認識クラスをどう定義するか: 1 グリフ融合(67.7%)を丸ごとクラスにするか、
  位置つき部品(gid × 位置)の組として扱うか、素部品まで割り戻すか。→ model-design.md に反映。
- 配置タグに **役割ラベル**(その NEXT は子音か / その POST は母音記号 ා か hal か)を付与し、
  「位置 × 役割」で完全な位置つき部品分解を作る。
- rakaaransaya(`ක්‍ර`)は後続 ර が専用グリフ karasinh に化けて base に重なる(POST/adv=0)融合。
  ZWJ の有無で字形が変わる(別クラス)点と合わせて要整理。
