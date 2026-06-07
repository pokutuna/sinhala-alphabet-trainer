# シンハラ文字の定義・仕組み・記述法

シンハラ文字(Sinhala script)が Unicode / OpenType でどう定義され、どう組み立てられるかの
一次情報まとめ。アプリ本体(表示・クイズ・翻字)でも ML 認識でも共通して効く普遍的な知識。

字種・音韻の**分類は Unicode 公式文字名(`unicodedata`)を真値**とし、コードポイント・名前は
すべて機械確認済み。翻字(ローマ字)は本アプリの慣習表記。

関連: 学習対象の部品モデルは [prepare.md](./prepare.md)、翻字マッピングは [transliteration.md](./transliteration.md)。
ML 認識の文脈(454 データセットへの当てはめ・補助ラベル設計)は
[char-ocr/docs/sinhala-script-spec.md](../char-ocr/docs/sinhala-script-spec.md)。

出典(一次情報):
- Unicode 16.0 Core Spec 第13章 South and Central Asia-II(Sinhala)
  <https://www.unicode.org/versions/Unicode16.0.0/core-spec/chapter-13/>
- r12a(W3C i18n)"Sinhala script notes" — śuddha/miśra の Basic/Extended 区分の典拠
  <https://r12a.github.io/scripts/sinh/si.html>
- Microsoft Typography "Creating and Supporting OpenType Fonts for Sinhala Script"
  <https://learn.microsoft.com/en-us/typography/script-development/sinhala>
- n8willis "OpenType shaping — Sinhala"(shaper の分類・並べ替え規則を最も詳細に記述)
  <https://github.com/n8willis/opentype-shaping-documents/blob/master/opentype-shaping-sinhala.md>
- SLS 1134:2004(スリランカ規格)<http://www.unicode.org/wg2/docs/n2737.pdf>

---

## 0. 結論サマリ(字数の真値)

| 区分 | 字数 | 内訳 |
| --- | --- | --- |
| 独立母音字 (IV) | **18** | U+0D85–0D96。śuddha 12 + miśra 6 |
| 子音字 (C) | **41** | U+0D9A–0DC6 の割当字。śuddha 24 + miśra 17 |
| 母音記号 (DV, matra/pilla) | **16** | U+0DCF–0DDF + U+0DF2–0DF3。a は記号なし(固有母音) |
| hal / al-lakuna (H) | **1** | U+0DCA。固有母音を殺す(virama) |
| anusvara / visarga / candrabindu (VM) | **3** | U+0D81 ඁ / U+0D82 ං / U+0D83 ඃ |

- **śuddha(純)= Basic 集合**。「すべての固有(eḷu)音素を表せる学校教科の中核字」。
- **miśra(混合)= Extended 集合**。サンスクリット・パーリ・外来語の音写用。
- śuddha/miśra の境界は r12a の Basic/Extended 区分に拠る(後述 §2 のリスト)。
  本アプリ JSON の `misra` フラグは子音 24/17 で r12a と完全一致することを確認済み。

---

## 1. 文字の構成要素(Unicode 定義)

シンハラは**アブギダ**(子音字が固有母音 /a/ を内蔵する音節文字)。akshara(書記素クラスタ)を
次の要素で組み立てる。

| 要素 | 役割 | コードポイント | 字数 |
| --- | --- | --- | --- |
| 子音 (C) | 基本字。固有母音 /a/ を持つ | U+0D9A–0DC6 | 41字 |
| 独立母音 (IV) | 語頭等で単独の母音 | U+0D85–0D96 | 18字 |
| 母音記号 (DV, matra) | 子音に付いて母音を変える | U+0DCF–0DDF / U+0DF2–0DF3 | 16字(左/右/上/下/挟み) |
| al-lakuna / hal (H) | **固有母音を殺す**(virama) | U+0DCA | 1字 |
| anusvara / visarga / candrabindu (VM) | 鼻音化 ං / 気息 ඃ / ඁ | U+0D81–0D83 | 3字 |
| ZWJ | 結合を**明示要求**する不可視文字 | U+200D | shaper はこれで特殊形を選ぶ |

結合文法(akshara の生成規則)は子音クラスタ + 独立母音クラスタの2種だけ。詳細は
[char-ocr/docs/akshara-rules.md](../char-ocr/docs/akshara-rules.md)。

---

## 2. śuddha(純)と miśra(混合)― Q1

シンハラ字母は2層からなる:

- **śuddha siṃhala(純シンハラ / eḷu hōḍiya)= Basic 集合**:
  土着(eḷu)の全音素を表せる中核字。学校で教える。
- **miśra siṃhala(混合シンハラ)= Extended 集合**:
  サンスクリット・パーリ・外来語の音写のため追加された字(有気音・余分な歯擦音・一部鼻音)。

判定根拠は r12a の Basic consonants / Extended consonants の明示リスト(生 HTML で確認)。

### 子音 śuddha 24字(Basic)

ක ග ඟ ච ජ ට ඩ ණ ඬ ත ද න ඳ ප බ ම ඹ ය ර ල ව ස හ ළ

### 子音 miśra 17字(Extended + ඦ)

ඛ ඝ ඞ ඡ ඣ ඤ ඥ ඦ ඨ ඪ ථ ධ ඵ භ ශ ෂ ෆ

> r12a の Extended リストは 16字(ඦ を除く)。ඦ(U+0DA6 SANYAKA JAYANNA, ⁿja)は
> 希少字で r12a の表に未掲載だが、音韻的に miśra 側(前鼻音化 ja)に属する。Unicode 割当子音
> 41字 = śuddha 24 + miśra 17。

### 母音の śuddha / miśra(§3 の表で個別表示)

独立母音 18字のうち śuddha は 12字。miśra は ඍ ඎ ඏ ඐ(サンスクリット声成母音 ṛ/ṝ/ḷ/ḹ)
と ඓ(ai)ඖ(au)の 6字。

---

## 3. 独立母音字(IV)― Q2

語頭や母音単独で使う字。各母音には対応する母音記号(§4)がある(a を除く)。

| cp | 字 | 翻字 | IPA | 母音記号 | śuddha/miśra |
| --- | --- | --- | --- | --- | --- |
| U+0D85 | අ | a | a | (なし=固有母音) | śuddha |
| U+0D86 | ආ | ā | aː | ා | śuddha |
| U+0D87 | ඇ | æ | æ | ැ | śuddha |
| U+0D88 | ඈ | ǣ | æː | ෑ | śuddha |
| U+0D89 | ඉ | i | i | ි | śuddha |
| U+0D8A | ඊ | ī | iː | ී | śuddha |
| U+0D8B | උ | u | u | ු | śuddha |
| U+0D8C | ඌ | ū | uː | ූ | śuddha |
| U+0D8D | ඍ | ṛ | ɾu | ෘ | **miśra**(梵 vocalic r) |
| U+0D8E | ඎ | ṝ | ɾuː | ෲ | **miśra**(梵 vocalic rr) |
| U+0D8F | ඏ | ḷ | ɭu | ෟ | **miśra**(梵 vocalic l) |
| U+0D90 | ඐ | ḹ | ɭuː | ෳ | **miśra**(梵 vocalic ll) |
| U+0D91 | එ | e | e | ෙ | śuddha |
| U+0D92 | ඒ | ē | eː | ේ | śuddha |
| U+0D93 | ඓ | ai | ai | ෛ | **miśra** |
| U+0D94 | ඔ | o | o | ො | śuddha |
| U+0D95 | ඕ | ō | oː | ෝ | śuddha |
| U+0D96 | ඖ | au | au | ෞ | **miśra** |

---

## 4. 母音記号(DV / matra / pilla)― Q3

子音字に付いて固有母音 /a/ を別の母音に変える。**配置は左/右/上/下/挟み**の5系統。
shaper が視覚順に並べ替えるので、コードポイント順=視覚順ではない(§7)。

| cp | 記号 | Unicode 名 | 翻字 | 視覚配置 | NFD 分解 |
| --- | --- | --- | --- | --- | --- |
| (なし) | — | (固有母音) | a | — | — |
| U+0DCF | ා | AELA-PILLA | ā | 右 | 単一 |
| U+0DD0 | ැ | KETTI AEDA-PILLA | æ | 右 | 単一 |
| U+0DD1 | ෑ | DIGA AEDA-PILLA | ǣ | 右 | 単一 |
| U+0DD2 | ි | KETTI IS-PILLA | i | 上 | 単一 |
| U+0DD3 | ී | DIGA IS-PILLA | ī | 上 | 単一 |
| U+0DD4 | ු | KETTI PAA-PILLA | u | 下 | 単一(★子音と融合, Q8) |
| U+0DD6 | ූ | DIGA PAA-PILLA | ū | 下 | 単一(★子音と融合, Q8) |
| U+0DD8 | ෘ | GAETTA-PILLA | ṛ | 下 | 単一 |
| U+0DD9 | ෙ | KOMBUVA | e | **左** | 単一 |
| U+0DDA | ේ | DIGA KOMBUVA | ē | 左+上 | **ෙ + ්**(2片) |
| U+0DDB | ෛ | KOMBU DEKA | ai | 左(二重) | 単一 |
| U+0DDC | ො | KOMBUVA HAA AELA-PILLA | o | 左+右(挟み) | **ෙ + ා**(2片) |
| U+0DDD | ෝ | KOMBUVA HAA DIGA AELA-PILLA | ō | 左+右(挟み) | **ෙ + ා + ්**(3片) |
| U+0DDE | ෞ | KOMBUVA HAA GAYANUKITTA | au | 左+右(挟み) | **ෙ + ෟ**(2片) |
| U+0DDF | ෟ | GAYANUKITTA | (au の右片) | 右 | 単一 |
| U+0DF2 | ෲ | DIGA GAETTA-PILLA | ṝ | 下 | 単一 |
| U+0DF3 | ෳ | DIGA GAYANUKITTA | ḹ | 右 | 単一 |

> **split(分割)母音記号**: e/o 系の `ෙ`(左コンブワ)を含む記号は視覚的に子音を**左右から挟む**。
> NFD で複数片に割れる(ෝ = ෙ + ා + ්)。末尾の ් は hal と同一コードポイント・同一字形だが、
> ここでは**母音記号 ō の構成部品**であり「特殊な hal」ではない(§6-2b)。

---

## 5. 子音字(C)― Q4 / Q5 / Q6

### 5-1. 全子音表(調音位置 × 調音法 × śuddha/miśra)― Q5

分類はすべて Unicode 公式名から機械導出(KANTAJA=軟口蓋, TAALUJA=硬口蓋,
MUURDHAJA=そり舌, DANTAJA=歯, ALPAPRAANA=無気, MAHAAPRAANA=有気,
SANYAKA/AMBA=前鼻音, NAASIKYAYA=鼻音)。

| cp | 字 | 翻字 | IPA | 調音位置 | 調音法 | śuddha/miśra |
| --- | --- | --- | --- | --- | --- | --- |
| U+0D9A | ක | ka | k | 軟口蓋 | 無気無声 | śuddha |
| U+0D9B | ඛ | kha | kʰ | 軟口蓋 | 有気無声 | miśra |
| U+0D9C | ග | ga | ɡ | 軟口蓋 | 無気有声 | śuddha |
| U+0D9D | ඝ | gha | ɡʱ | 軟口蓋 | 有気有声 | miśra |
| U+0D9E | ඞ | ṅa | ŋ | 軟口蓋 | 鼻音 | miśra |
| U+0D9F | ඟ | ⁿga | ⁿɡ | 軟口蓋 | 前鼻音 | śuddha |
| U+0DA0 | ච | ca | tʃ | 硬口蓋 | 無気無声 | śuddha |
| U+0DA1 | ඡ | cha | tʃʰ | 硬口蓋 | 有気無声 | miśra |
| U+0DA2 | ජ | ja | dʒ | 硬口蓋 | 無気有声 | śuddha |
| U+0DA3 | ඣ | jha | dʒʱ | 硬口蓋 | 有気有声 | miśra |
| U+0DA4 | ඤ | ña | ɲ | 硬口蓋 | 鼻音 | miśra |
| U+0DA5 | ඥ | jña | ɲ | 硬口蓋 | 鼻音(梵 jña 合字) | miśra |
| U+0DA6 | ඦ | ⁿja | ⁿdʒ | 硬口蓋 | 前鼻音 | miśra |
| U+0DA7 | ට | ṭa | ʈ | そり舌 | 無気無声 | śuddha |
| U+0DA8 | ඨ | ṭha | ʈʰ | そり舌 | 有気無声 | miśra |
| U+0DA9 | ඩ | ḍa | ɖ | そり舌 | 無気有声 | śuddha |
| U+0DAA | ඪ | ḍha | ɖʱ | そり舌 | 有気有声 | miśra |
| U+0DAB | ණ | ṇa | ɳ | そり舌 | 鼻音 | śuddha |
| U+0DAC | ඬ | ⁿḍa | ⁿɖ | そり舌 | 前鼻音 | śuddha |
| U+0DAD | ත | ta | t̪ | 歯 | 無気無声 | śuddha |
| U+0DAE | ථ | tha | t̪ʰ | 歯 | 有気無声 | miśra |
| U+0DAF | ද | da | d̪ | 歯 | 無気有声 | śuddha |
| U+0DB0 | ධ | dha | d̪ʱ | 歯 | 有気有声 | miśra |
| U+0DB1 | න | na | n | 歯 | 鼻音 | śuddha |
| U+0DB3 | ඳ | ⁿda | ⁿd̪ | 歯 | 前鼻音 | śuddha |
| U+0DB4 | ප | pa | p | 唇 | 無気無声 | śuddha |
| U+0DB5 | ඵ | pha | pʰ | 唇 | 有気無声 | miśra |
| U+0DB6 | බ | ba | b | 唇 | 無気有声 | śuddha |
| U+0DB7 | භ | bha | bʱ | 唇 | 有気有声 | miśra |
| U+0DB8 | ම | ma | m | 唇 | 鼻音 | śuddha |
| U+0DB9 | ඹ | ᵐba | ᵐb | 唇 | 前鼻音 | śuddha |
| U+0DBA | ය | ya | j | 硬口蓋 | 半母音 | śuddha |
| U+0DBB | ර | ra | r | 歯茎 | 流音(顫動) | śuddha |
| U+0DBD | ල | la | l | 歯 | 流音(側面) | śuddha |
| U+0DC0 | ව | va | ʋ | 唇歯 | 半母音 | śuddha |
| U+0DC1 | ශ | śa | ʃ | 硬口蓋 | 歯擦/摩擦 | miśra |
| U+0DC2 | ෂ | ṣa | ʂ | そり舌 | 歯擦/摩擦 | miśra |
| U+0DC3 | ස | sa | s | 歯 | 歯擦/摩擦 | śuddha |
| U+0DC4 | හ | ha | h | 声門 | 摩擦 | śuddha |
| U+0DC5 | ළ | ḷa | ɭ | そり舌 | 流音(側面) | śuddha |
| U+0DC6 | ෆ | fa | f | 唇歯 | 摩擦(外来) | miśra |

### 5-2. 半母音/歯擦音/歯音/唇音/その他の区別 ― Q4

| 区分 | 字 | 備考 |
| --- | --- | --- |
| **半母音(antastha)** | ය(ya) ර(ra) ල(la) ව(va) ළ(ḷa) | r/l/ḷ を流音として分けることもある |
| **歯擦音/摩擦音(ūṣma)** | ශ(śa) ෂ(ṣa) ස(sa) හ(ha) ෆ(fa) | śa/ṣa/sa が3歯擦音、ha は声門摩擦、fa は外来 |
| **歯音(dantaja)** | ත ථ ද ධ න ඳ ල ස | Unicode 名 DANTAJA を持つのは න ල ස。t/d 系も調音上は歯 |
| **唇音(oṣṭhaja)** | ප ඵ බ භ ම ඹ ෆ | va は唇歯 |
| **軟口蓋(kaṇṭhaja)** | ක ඛ ග ඝ ඞ ඟ | |
| **硬口蓋(tāluja)** | ච ඡ ජ ඣ ඤ ඥ ඦ ය ශ | |
| **そり舌(mūrdhaja)** | ට ඨ ඩ ඪ ණ ඬ ෂ ළ | |
| **声門** | හ | |

### 5-3. 調音法の6区分(無気無声/有気無声/無気有声/有気有声/純鼻音/前鼻音)― Q6

**表現されている**(Unicode 名がそのまま符号化)。破裂音は5調音位置 × (無気/有気)×(無声/有声)で
規則的に並ぶ。

| 調音位置 | 無気無声 | 有気無声 | 無気有声 | 有気有声 | 純鼻音 | 前鼻音(半鼻音) |
| --- | --- | --- | --- | --- | --- | --- |
| 軟口蓋 | ක ka | ඛ kha | ග ga | ඝ gha | ඞ ṅa | ඟ ⁿga |
| 硬口蓋 | ච ca | ඡ cha | ජ ja | ඣ jha | ඤ ña | ඦ ⁿja |
| そり舌 | ට ṭa | ඨ ṭha | ඩ ḍa | ඪ ḍha | ණ ṇa | ඬ ⁿḍa |
| 歯 | ත ta | ථ tha | ද da | ධ dha | න na | ඳ ⁿda |
| 唇 | ප pa | ඵ pha | බ ba | භ bha | ම ma | ඹ ᵐba |

- **純鼻音(NAASIKYAYA / 各列の na 系)**: ඞ ඤ ණ න ම の5字。ඥ(jña)も鼻音だが梵語合字。
- **前鼻音 = 半鼻音(SANYAKA / AMBA, prenasalized)**: ඟ ඦ ඬ ඳ ඹ の5字。
  鼻音 + 同位破裂音が癒合した土着音(ŋg, ⁿɖ 等)。**シンハラ独自で梵語・パーリにない**ため
  ඟ ඬ ඳ ඹ は śuddha 側、ඦ のみ miśra 扱い。
- anusvara(ං)/ visarga(ඃ)は子音字とは別カテゴリ(§1 の VM)。

---

## 6. hal(al-lakuna, U+0DCA)の振る舞い ― Q7 の前提

hal は単一の機能(固有母音を殺す)だが、**置かれる文脈で視覚形がまったく変わる**。
「hal は1種類」も「hal は全部特殊」も誤りで、正しくは
**「hal 単体の virama 形」と「hal+ZWJ が要求する3つの結合特殊形」を区別する**。

### 6-2a. 単純 virama(hal止め)― C + H

`ක්`(k + hal)のように、子音の固有母音を殺すだけ。視覚的には子音字形に**小さなフック等が付く**
(フォントは `<C>halantsinh` のような専用 hal止めグリフを持つ)。フックの形は子音ごとに違うが、
**これは「hal の特殊形」ではなく、子音 + virama の通常の合字**。akshara としては C 1つ + hal。

### 6-2b. split(2部品)母音記号の中の hal は「特殊形ではない」

長母音 ō の記号 `ෝ`(U+0DDD)は、Unicode 正規分解(NFD)で**3片に割れる**:

```
U+0DDD (ෝ, oo)  =  U+0DD9 (ෙ, 左コンブワ)  +  U+0DCF (ා, 右長音棒)  +  U+0DCA (් , hal)
```

この末尾の U+0DCA は「**母音記号 ō を構成する部品**」であって、6-2a の hal止めと同じ字形・同じ
コードポイント。`කෝ`(ō)に見える右上のフックは、`ත්`(hal止め)のフックと**視覚的に同一**。
→ 「ō の hal は帽子として特殊化している」は**誤り**。hal の字形は両者で同じ。

split する4つの母音記号(規格定義):

| 記号 | 名 | NFD 分解 | 構成(位置) |
| --- | --- | --- | --- |
| U+0DDA | ē | U+0DD9 + U+0DCA | 左コンブワ + hal |
| U+0DDC | o | U+0DD9 + U+0DCF | 左コンブワ + 右長音棒 |
| U+0DDD | ō | U+0DD9 + U+0DCF + U+0DCA | 左 + 右 + hal |
| U+0DDE | au | U+0DD9 + U+0DDF | 左コンブワ + 右ガヤヌキッタ |

### 6-2c. hal が本当に特殊字形を生む3パターン(ZWJ で明示要求)

shaper は文脈推論しない。**ZWJ を含む特定の並びだけ**が特殊結合形を呼ぶ(GSUB feature 経由)。
ここが「hal の特殊系」の正体で、**virama 形(6-2a)とは別物**。

| 名称 | 並び(codepoint) | GSUB feature | 視覚位置 | 形 |
| --- | --- | --- | --- | --- |
| **repaya**(reph) | 語頭 `ර` + H + ZWJ(ra が**非base**) | `rphf` | **上付き**(後続字の上に乗る○) | ර の上付き異体 |
| **yansaya** | C + H + ZWJ + `ය` | `vatu` | **後置(横)** | ya の post-base 形(`yapostsinh`) |
| **rakaransaya** | C + H + ZWJ + `ර` | `vatu` | **下付き** | base が `<C>rasinh` 合字に置換 |

- **repaya**: `ර්` が音節の**最初**の子音で、かつ base でないときだけ。`ර්ම` → ම の上に repaya の○。
- **yansaya**: `ක්‍ය` → ka の右に ya が縦棒状に付く(`yapostsinh`)。ただし**ර の後では `yarephsinh`**
  (repaya と ya の複合)に化ける。
- **rakaransaya**: `ක්‍ර` → ka の下に小さな尾。**ra の元字形(りんご型)は残らず、base が専用合字に置換される**
  (`ක්‍ර` の ka グリフ自体が `karasinh` に変わる。「ra が下に潜る」という説明は不正確)。

### 6-2d. touching consonant(Pali/Sanskrit, ZWJ+Halant 順)

`ද‍්ධ` のように **ZWJ + Halant の順**(6-2c と前後が逆)で書くと、hal の見えない密着連結になる。
古典・仏典用。現代の常用表記には現れにくい。

---

## 7. 結合文字の翻字・配置(OpenType 並べ替えタグ)― Q7

### 7-1. 結合文字の翻字規則

akshara の翻字は**部品の翻字を視覚順でなく音韻順に連結**する(子音→母音記号)。
hal止めは母音を付けない。

| 例 | 構成 | 翻字 | 備考 |
| --- | --- | --- | --- |
| ක | ka(固有母音) | ka | 子音単独 = +a |
| කා | ka + ා(ā) | kā | 母音記号で母音差し替え |
| කි | ka + ි(i) | ki | |
| කු | ka + ු(u) | ku | 下付き融合(Q8) |
| කෝ | ka + ෝ(ō) | kō | split matra |
| ක් | ka + hal | k | 固有母音を殺す |
| ක්‍ර | ka + hal + ZWJ + ra | kra | rakaransaya(下付き ra) |
| ක්‍ය | ka + hal + ZWJ + ya | kya | yansaya(後置 ya) |
| ර්‍ම | ra + hal + ZWJ + ma | rma | repaya(上付き ra)+ ma |
| කං | ka + anusvara | kaṃ | 鼻音 |
| කඃ | ka + visarga | kaḥ | 気息 |

機械化: NFC + ZWJ/ZWNJ 除去 → `decompose_roles()`(base / hal / nexts / posts)で
役割分解し、各部品の翻字を引いて連結する。実装は
[char-ocr/scripts/_akshara.py](../char-ocr/scripts/_akshara.py)、
翻字辞書は [transliteration.md](./transliteration.md)。

### 7-2. 配置の記述法(OpenType 並べ替えタグ)

shaper(HarfBuzz Indic / Win Uniscribe)は入力コードポイント順でなく、**視覚順に並べ替えて**
グリフを返す。位置の語彙:

| OpenType 位置 | 意味 | 例 |
| --- | --- | --- |
| POS_PREBASE_MATRA | 左に回り込む | 左コンブワ ෙ(e/o/ō/au の左片) |
| POS_SYLLABLE_BASE | 主役の基底字 | base 子音/独立母音 |
| POS_ABOVEBASE | 上付き | repaya, 母音記号 ි ී |
| POS_BELOWBASE | 下付き | rakaransaya, 母音記号 ු ූ ෘ |
| POS_POSTBASE | 後置(右/横) | yansaya・重子音の後続子音・右母音記号 |

base の決め方は **BASE_POS_LAST_SINHALA**(音節末から後方走査し、ZWJ 直後の子音を飛ばした
最後の子音)。これが「どの子音が主役で、どれが結合形か」を決める。

→ 同じ `C + hal + C` でも「後ろの子音が下に潜るか(rakaransaya)/上に乗るか(repaya)/
横に並ぶか(yansaya・重子音)」は**コードポイントに書かれておらず、ZWJ と shaper が決める**。
視覚位置を機械的に得るには shaper に実レンダリングさせる(HarfBuzz)のが唯一確実な手段。
実測ベースの配置分類は [char-ocr/docs/glyph-placement.md](../char-ocr/docs/glyph-placement.md)。

---

## 8. 対応子音で字形が変わる付加記号 ― Q8

HarfBuzz 実シェープで各母音記号を全子音に付け、グリフ名・ラスタ画像で字形変化を実測。
**主役は u(◌ු)・ū(◌ූ)の paa-pilla**。英語版 Wikipedia の記述とも一致を確認済み。

### 8-1. u(◌ු)/ ū(◌ූ)の3パターン

u と ū は同一のアタッチ規則を共有する(長短で形は違うが、子音への付き方は同じ)。

| パターン | 適用子音 | 挙動 |
| --- | --- | --- |
| **A. 標準下垂フック** | 残り **33字** | 子音の右下から下方向へ素直にフックが垂れる。本体は変形しない(例 දු du, පු pu) |
| **B. 折り返し角型(k-shape)** | **6字** ක ග ඟ ත භ ශ(ka ga ⁿga ta bha śa) | フックが本体に巻き込まれ、左下で折り返す角型に融合(例 කු ku, ගු gu) |
| **C. 特殊固有合字** | **2字** ර(ra)・ළ(ḷa) | 本体と高度に融合した独自曲線。とくに **ර は次項④の連鎖を起こす** |

> B群6字は Wikipedia 原文 "⟨ක⟩ ka, ⟨ග⟩ ga, ⟨ඟ⟩ n̆ga, ⟨ත⟩ ta, ⟨භ⟩ bha, or ⟨ශ⟩ śa" と一致。
> A群を「33字」とするのは 全41 − B群6 − C群(ra/ḷa)2 = 33 の計算。

### 8-2. ර(ra)+ u が æ 記号を専有する連鎖(idiosyncratic)

ර に u を付けた合字 `රු`(ru)は、**たまたま通常の æ 母音記号(`aevowelsignsinh`)と同一字形**になる。
そのため ර+æ を普通に書くと ru と区別できず、**ræ/rǣ 側に専用の別グリフ**が用意される。
(因果: 「ru が æ 形を専有」が原因 → 「ræ が特殊形」が結果。誤読回避の相手は ru↔ræ であって ත/න ではない。)

実測グリフ名(因果の決定的証拠):

```
රු (ru)  → rasinh + aevowelsignsinh     ← ru なのに「æ の記号」
රූ (rū)  → rasinh + aaevowelsignsinh    ← rū は「ǣ の記号」
කැ (kæ)  → kasinh + aevowelsignsinh     ← 通常の æ。ru と同一グリフ
රැ (ræ)  → rasinh + raevowelsinh        ← ræ は ra 専用の別グリフ
රෑ (rǣ)  → rasinh + raaevowelsinh       ← rǣ も ra 専用
```

Wikipedia 原文: "Combinations of ර(r) or ළ(ḷ) with ⟨u⟩ have idiosyncratic shapes, viz රු, රූ, ළු and ළූ.
The diacritic used for රු and රූ is what is normally used for the ⟨æ⟩, and therefore there are
idiosyncratic forms for ræ and rǣ."(ළ も同様に u で特殊合字)

### 8-3. その他の子音依存

| 付加記号 | 子音依存か | 挙動 |
| --- | --- | --- |
| **ra結合(්‍ර, rakaransaya)** | **★依存** | base 子音ごとに専用合字(`karasinh` `garasinh`…)。base そのものが置換される |
| **ya結合(්‍ය, yansaya)** | 一部依存 | 通常 `yapostsinh` だが **ර の後では `yarephsinh`**(repaya+ya 複合) |
| repaya(上付き ර) | base 非依存 | 後続字の上に同じ○ |
| ෘ(ṛ, vocalic r) | 非依存 | 常に `rvocalicvowelsignsinh`。base に付くだけ |
| ā ි ී ෙ 等 | 非依存 | base と独立に並ぶ |

**結論(Q8)**: 対応子音で字形が変わる付加記号は **u(◌ු)・ū(◌ූ)が代表**(B群6字が角型 / ra・ḷa が特殊合字)。
さらに ර+u は æ 記号を専有して ræ/rǣ に別形を生み(§8-2)、ra結合(rakaransaya)は base 子音側を、
ya結合は ර の後で形を変える。
これらは pixel から予測する ML 認識で「同じ母音記号でも見た目が大きく異なるクラス」を生む
(詳細は [char-ocr/docs/sinhala-script-spec.md](../char-ocr/docs/sinhala-script-spec.md))。

検証コマンド(再現可能):

```bash
cd char-ocr/scripts
PYTHONPATH=. uv run --with regex --with uharfbuzz python -c '
import _akshara as A
font=A.load_font("../tmp/NotoSansSinhala.ttf")
for b in ["ක","ග","ර","ට"]:
    print(b+"ු", [g["name"] for g in A.shape(b+"ු", font)])'
```
