# akshara(書記素クラスタ)の結合ルール

シンハラの「1文字」= akshara(grapheme cluster)がどう組み立てられるかの規則。
出典: Microsoft OpenType Sinhala 仕様(Uniscribe shaping engine)
<https://learn.microsoft.com/en-us/typography/script-development/sinhala> + Unicode。
関連: クラス数の階層は [datasets.md](./datasets.md) / [model-design.md](./model-design.md)。

> **本書は入門・直感版。** 下記の式は「読んで理解する」ための簡略形で、ZWJ の任意性・hal 前後の
> joiner・split matra・reph を畳んでいるため、**そのままでは実テキストの一部しか生成できない**
> (実測で v1 は 12% しか網羅しなかった)。網羅的な形式文法・実データでの網羅性検証・HarfBuzz
> 音節機械との対応は [akshara-grammar.md](./akshara-grammar.md)(厳密版・実証版)を参照。

## 大前提: クラスタは 2 種類だけ

1 つの akshara は次のどちらかの文法でしか作れない。

```
① 独立母音クラスタ:  IV + [VM]
② 子音クラスタ:      {C + H + ZWJ} + C + [<H | DV>] + [VM]
```

記号:

| 記号 | 意味 | 例 | コードポイント |
| --- | --- | --- | --- |
| `C` | 子音 | ක | U+0D9A–0DC6 |
| `IV` | 独立母音 | අ | U+0D85–0D96 |
| `H` | hal / al-lakuna(母音を殺す) | ් | U+0DCA |
| `DV` | 母音記号(matra) | ි ා ේ | U+0DCF–0DDF 等 |
| `VM` | 母音修飾(anusvara ං / visarga ඃ) | ං | U+0D82, U+0D83 |
| `ZWJ` | 結合子(不可視) | | U+200D |
| `{ }` | 0 回以上の繰り返し(文法上の上限なし。視覚的な積み stack は実質 2 が上限) | | |
| `[ ]` | 省略可能 | | |
| `<x\|y>` | x か y のどちらか | | |

この文法が、前に整理した「**1 文字 = 5 パターン**」を生成規則で表したもの。

## 文法を分解して読む(子音クラスタ)

右から読むと核が分かる。**核は子音 1 つ `C`**、前後にオプション。

```
{C + H + ZWJ}   +   C   +   [<H | DV>]   +   [VM]
└── 前置(結合) ─┘   └核┘   └─ 後置(1個) ─┘   └修飾┘
```

- **中央 `[<H | DV>]` が最重要**: 核の直後に付くのは
  - `H`(hal)1 個 → `ක්`(子音のみ)= パターン④
  - **または** `DV`(母音記号)1 個 → `කි කා කේ`(子音+母音記号)= パターン③
  - **どちらか 1 個だけ**。両方も複数も不可。
  - → これが「**1 音節に母音記号は最大 1 個**」ルールの正体。スロットが 1 つしかないから構造的に 2 個入らない。
- **何も付けない** → `ක`(子音 + 内在母音 /a/)= パターン②
- **前置 `{C + H + ZWJ}`** = 結合子音(conjunct)。「子音+hal+ZWJ」を核の前に 0 回以上積む。
  - `ක්‍ර`(k+r)`ද්‍ය`(d+y)= パターン⑤。結合文字にも末尾で `[<H|DV>]+[VM]` が付く → `ක්‍රි`(kri)。
- **末尾 `[VM]`** = anusvara/visarga を 0〜1 個。

独立母音クラスタ `IV + [VM]` は、母音字単独(+稀に修飾)= パターン①。**母音字に母音記号や hal は付かない**。

## 5 パターン対応

| # | パターン | 文法上の現れ方 | 例 |
| --- | --- | --- | --- |
| ① | 母音字単独(+修飾) | `IV + [VM]` | අ, අං |
| ② | 子音 + 内在母音 a | `C`(後置なし) | ක |
| ③ | 子音 + 母音記号 | `C + DV` | කි, කා |
| ④ | 子音のみ(hal) | `C + H` | ක් |
| ⑤ | 結合文字(+母音記号) | `{C+H+ZWJ} + C + [DV]` | ක්‍ර, ක්‍රි |

## 結合(conjunct)の作り方 — ZWJ の位置で種類が変わる

| 種類 | エンコード列 | 例 | 形 |
| --- | --- | --- | --- |
| 通常合字 / yansaya(-ya) / rakaaransaya(-ra) | `C + H + ZWJ + C` | ක්‍ර, ක්‍ය | 後続子音が下/後ろに付く |
| repaya(reph) | `ර + H + ZWJ + C` | ර්‍ක | 先頭 Ra が上付き記号になる |
| touching letters(パーリ/サンスクリット古典) | `C + ZWJ + H + C` | ක‍්ක | 字が接触する |

- `H + ZWJ`(hal→ZWJ)が**標準の結合** = 文法 `{C + H + ZWJ}`。
- `ZWJ + H`(ZWJ→hal)が **touching letters** = もう一方の文法 `{C + ZWJ + H}`。
- rakaaransaya = `ක්‍ර`、yansaya = `ක්‍ය`。列は同じで後続子音が ර か ය かの違い。
- repaya は先頭が ර のときだけ、その ර が上付きになる。

## 不正な並び(invalid cluster)

- **DV・H・VM・ZWJ は、有効な base(C か IV)なしには始められない。**
- base のない結合記号は無効 → shaping engine が **点線の丸 U+25CC(dotted circle)** を補って単独表示する。
- → これが「**母音記号・hal・結合パーツだけでは 1 文字として書けない(必ず base が要る)**」の技術的裏付け。文法のどのスロットも先頭は必ず `C` か `IV`。

## 「理論 ≫ 実際」がこの文法から説明できる

- 文法上は前置 `{C+H+ZWJ}` を**回数無制限**に積めるので組み合わせは天文学的(理論)。HarfBuzz にも上限は無い。
- だが**視覚的に積み重なる(stack)のは実質 2 連が上限**。rakar/yansa/repaya は base 1 個に 1 個しか乗らない。
- 実コーパス(Wikipedia)では前置は **0 回(単独子音, token 98.4%)か 1 回(2 連結, 1.6%)がほぼ全部**。
  ハル連結(hal_chain)で見ても日常語は最大 3 連、4 連は Armstrong/express 等の外来語音写、5 連以上は Web ノイズ。
  → 2 指標(stack / hal_chain)の実測分布は [akshara-grammar.md §4-2](./akshara-grammar.md)。
- だから実際の akshara は **620 種・頻出 ~200 種**に収まる(→ [datasets.md](./datasets.md))。
- 文法は無限を許すが、実用は前置回数を 0〜1 に絞るので有限。これが「理論的組み合わせ数 ≫ 実際に登場する数」の構造的理由。

## shaping パイプライン(参考)

Uniscribe Sinhala の処理段階: ① 文字解析(クラスタ分割・妥当性検査) → ② split matra 分解 →
③ 並べ替え(prebase 母音を先頭へ / yansaya を前の base に融合 / repaya を base 後へ) →
④ GSUB(akhn 合字 → rphf repaya → vatu rakar+yan → pres/abvs/blws/psts) → ⑤ GPOS(配置)。
学習用には文字解析〜クラスタ妥当性検査の部分だけ理解すれば足りる。
