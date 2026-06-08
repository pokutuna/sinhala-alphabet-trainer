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
```

## 成果物(コミット対象)

- `akshara_freq_wikipedia.csv` — akshara, codepoints, freq(Wikipedia 出現回数)
- `akshara_table_full.csv` — 全 akshara テーブル(下記の列)

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
- 視覚統合が起きるのは 1 組だけ(`ර්ර`≡`ර්‍ර`)= Sinhala は NFC 正規化後ほぼ視覚単位。
- **ZWJ 結合と横並び結合は視覚的に別物**(`ක්‍ර`=kasinh+karasinh 下付き合字 / `ක්ර`=kahalantsinh+rasinh ハル+横並び)。統合されないのが正しい。

## メモ

- 既存の `tmp/akshara_table.csv`(コーパス∪454 の 841 行)とは母集団が別。本表は両存させる実験版。
- ②③ヘッドの設計根拠は `char-ocr/docs/model-design.md`「確定した原則: 3 ヘッド構成」と
  `char-ocr/docs/sinhala-script-spec.md` Q8 節を参照。
