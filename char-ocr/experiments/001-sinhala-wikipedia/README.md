# 001 — Sinhala Wikipedia で akshara の実在を裏取りし、全 akshara テーブルを作る

ルール&文字セットから全 akshara 組み合わせ(L1-L8)を列挙し、各行に
「視覚統合キー / ②③ヘッドのラベル / 分解パーツ / 読み / 実在頻度 / 学習データ有無」を
付けた 1 枚の表 `akshara_table_full.csv` を作る実験。

## なぜ Wikipedia か

「全組み合わせ」を機械生成すると、規則上は組めるが**実在しない結合**(`ක්‍ඞ` 等)が大量に混ざる。
Noto は実在しない結合も ◌/notdef を出さず「それらしく」描いてしまうため、`renderable` では実在を判定できない。
手元 SinOCR コーパスは 1135 行と小さく、結合の実在を頻度で測れない。
→ Sinhala Wikipedia 本文(約 3172 万 akshara トークン / 18,354 distinct)で頻度を取り、`wiki_freq` で実在を裏取りする。

## 再現手順

```bash
# 1. ダンプ取得(約 79MB bz2。data/ は .gitignore で追跡しない)
bash download.sh

# 2. akshara 頻度集計 → akshara_freq_wikipedia.csv
uv run --with regex --with uharfbuzz --with freetype-py --with pillow --with numpy count_aksharas.py

# 3. 全 akshara テーブル生成 → akshara_table_full.csv
uv run --with regex --with uharfbuzz --with freetype-py --with pillow --with numpy --with pandas gen_akshara_table_full.py

# 4. 形式的文法の網羅性検証(文法分類 × Noto 実シェーピングの 2x2)
#    スクリプト冒頭の curl で Noto を取得してから実行。結果は ../../docs/akshara-grammar.md
uv run verify_grammar_coverage.py
```

## 成果物(コミット対象)

- `akshara_freq_wikipedia.csv` — akshara, codepoints, freq(Wikipedia 出現回数)
- `akshara_table_full.csv` — 全 akshara テーブル(下記の列)
- `audit_romanization.py` / `romanization_audit.csv` — 翻字(rom)の規格監査(下記「翻字の規格監査」)
- `verify_grammar_coverage.py` — 形式的文法の網羅性検証(→ [../../docs/akshara-grammar.md](../../docs/akshara-grammar.md))

## 翻字の規格監査(reading の裏取りと規格統一)

`akshara_freq_wikipedia.csv` を使い、`app/data/sinhala.json` の部品 rom で「字 → 読み」を規則合成
(`app/lib/transliterate.ts` の `sinhalaToReading` と同じロジック)したときの**読み欠落**を実データで洗い出した。

- 当初、頻出する母音記号・複合字が辞書に無く読みが壊れていた(欠落 101,677 トークン / 0.32%)。
  実データで度数順に特定し、母音記号 **ෘ(ṛ) ෲ(ṝ) ෛ(ai) ෟ(ḷ) ෳ(ḹ)**・独立母音 **ඎ(ṝ) ඏ(ḷ) ඐ(ḹ)**・
  複合字 **ඥ(jña)** を `sinhala.json` に補完 → 文字単位の読み欠落は実質ゼロ(残りは句読点 ෴ や ZWJ 断片)。
- 翻字の**規格**は IAST/ALA-LC に統一。`audit_romanization.py` が ISO 15919 と IAST/ALA-LC の対照で現 rom を監査し、
  `romanization_audit.csv` に出力する。規格選択の根拠・vocalic l と子音 ළ の衝突対応は
  [docs/sinhala-script.md §7-1a](../../../docs/sinhala-script.md)。

```bash
uv run audit_romanization.py   # → romanization_audit.csv
```

## akshara_table_full.csv の列

| 列 | 意味 |
| --- | --- |
| `akshara` / `codepoints` | NFC 文字列 / U+XXXX 列 |
| `level` | 生成規則 L1(独立母音)/L2(子音)/L3(hal止め)/L4(子音+母音記号)/L5(子音+anusvara・visarga)/L6(ZWJ結合・全子音ペア)/L7(横並び結合・全子音ペア)/L8(ra/ya結合+母音記号) |
| `visual_key` | **同じ視覚グリフをまとめるキー** = Noto の shape 結果 gid 列。エンコード違い(ZWJ 有無/split matra)を畳む。①視覚ヘッドのクラス = この distinct 数 |
| `glyph_count_noto` / `renderable` | グリフ数 / 描けるか(◌・notdef なし) |
| `fused_{noto,mn,sangam}` | ZWJ 結合が 1 グリフに融合するか(専用合字の有無=実在の弱シグナル) |
| `main_glyph` | **②メイングリフヘッド**: 修飾を剥がした素の土台(子音/独立母音 1 字)。B群で角型化しても素に畳む |
| `mod_parts` | **③修飾パーツヘッド**: 位置つきの修飾片。Q8 の u は視覚形で割る(`u_下垂`/`u_角型`/`u_合字`)。位置 = `@TOP/PRE/RIGHT/ABOVE/BELOW/POST` |
| `nexts` | 後続子音(結合の 2 番目以降)。③とは別軸(横並び/ZWJ 結合の子音) |
| `parts_nfd` | NFD 分解した Unicode 素片の名前 |
| `reading` | ISO 15919 風ローマ字(`app/data/sinhala.json` を辞書に組み立て) |
| `wiki_freq` | **実在裏取り**: Sinhala Wikipedia 出現回数(0 = 未出現) |
| `in_454` | Kaggle 手書き 454 に含まれるか |

## 数字(2026-06 時点のダンプ)

- 全 akshara(規則生成): **5471**(全て renderable)
- wiki_freq>0(実在): **1951** / wiki_freq>=5: **1372** / in_454: **437**
- ①視覚クラス(renderable・実在): **1950** / ②main_glyph: **59** / ③mod_parts: **22**
- 視覚統合が起きるのは 1 組だけ(`ර්ර`≡`ර්‍ర`)= Sinhala は NFC 正規化後ほぼ視覚単位。
- **ZWJ 結合と横並び結合は視覚的に別物**(`ක්‍ర`=kasinh+karasinh 下付き合字 / `ක්ර`=kahalantsinh+rasinh ハル+横並び)。統合されないのが正しい。

### akshara_freq_wikipedia.csv を直接数えた「文字数」(数え方の注意)

`akshara_freq_wikipedia.csv` は `split_aksharas`(hal 止め連結も 1 塊)で切った **18,354 distinct**。
だがこれは外来語の長い連結を 1 巨大塊にした**膨張値**で、「文字数」としては過大。

- **視覚単位(Unicode `\X`)で数え直すと distinct = 3,052**(1/6 に減る)。頻度≥10 で 1,083、上位 454 種で token 99.8%。
- 「文字数」は何を 1 文字と数えるかで 5 段階(部品 ~80 → 論理上限 ≈108,500 → 実在 3,052 → 実用 ~450)。
  実数・カバレッジは [../../docs/akshara-grammar.md §4-3](../../docs/akshara-grammar.md)。
- **連数(N 連)は 2 指標**: stack(視覚的な積み、最大 2)/ hal_chain(ハル連結、外来語で最大 4)。
  混同すると Armstrong を「4 連」と誤集計する。計測は `scripts/_akshara.py` の `count_conjuncts`、詳細は同 §4-2。

## メモ

- 既存の `tmp/akshara_table.csv`(コーパス∪454 の 841 行)とは母集団が別。本表は両存させる実験版。
- ②③ヘッドの設計根拠は `char-ocr/docs/model-design.md`「確定した原則: 3 ヘッド構成」と
  `char-ocr/docs/sinhala-script-spec.md` Q8 節を参照。
