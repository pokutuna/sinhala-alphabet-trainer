# シンハラ合成字 → 部品分解テーブル(454クラス)

採用データセット(Kaggle 454)の各クラスを、Unicode コードポイント単位で
**基本字(子音・独立母音)+ 修飾(母音記号・hal・記号)** に分解した一覧。
`tmp/handwritten_constants.py` の `TRUE_LABEL`(先頭 454 件)から自動生成
(`tmp/gen_decompose_table.py`)。部品マルチタスクヘッドのラベルはこの表から作れる。

関連: クラス数の定義は [datasets.md](./datasets.md#シンハラ文字のクラス数--定義ごとに違う)、
モデルでの使い方は [model-design.md](./model-design.md)。

## 部品の内訳

454 クラスは **66 種の部品**で表現できる(基本字 51 + 母音記号/hal 15)。
※ anusvara `ං`(U+0D82)は **454 範囲には単独でも合成内でも現れない**
(ラベル配列の余分 2 件側=folder455 にのみ存在)。前メモの「67 種・anusvara 含む」は
456 ラベルで数えた誤りで、正しくは **66 種**。

### 基本字 51 種(子音 + 独立母音)

```
අ ආ ඇ ඈ ඉ ඊ උ එ ඒ ඔ ඕ
ක ඛ ග ඝ ඟ  ච ඡ ජ ඣ ඤ ඥ ඦ
ට ඨ ඩ ඪ ණ ඬ  ත ථ ද ධ න ඳ
ප ඵ බ භ ම ඹ  ය ර ල ව
ශ ෂ ස හ ළ ෆ
```

### 母音記号 + hal 15 種

| 記号 | U+ | 名称 | 役割 |
| --- | --- | --- | --- |
| ා | U+0DCF | AELA-PILLA | ā |
| ැ | U+0DD0 | KETTI AEDA-PILLA | æ |
| ෑ | U+0DD1 | DIGA AEDA-PILLA | ǣ |
| ි | U+0DD2 | KETTI IS-PILLA | i |
| ී | U+0DD3 | DIGA IS-PILLA | ī |
| ු | U+0DD4 | KETTI PAA-PILLA | u |
| ූ | U+0DD6 | DIGA PAA-PILLA | ū |
| ෘ | U+0DD8 | GAETTA-PILLA | ru |
| ෙ | U+0DD9 | KOMBUVA | e |
| ේ | U+0DDA | DIGA KOMBUVA | ē |
| ෛ | U+0DDB | KOMBU DEKA | ai |
| ෝ | U+0DDD | KOMBUVA HAA DIGA AELA-PILLA | ō |
| ෟ | U+0DDF | GAYANUKITTA | (lu) |
| ෲ | U+0DF2 | DIGA GAETTA-PILLA | rū |
| ් | U+0DCA | AL-LAKUNA (hal/virama) | 母音抑止 |

注: `ක්‍ර` のような結合子音は `子音 + ්(hal) + ZWJ + 子音` の並びで表現される
(表の「基本字」列に複数字が出るのはこのため)。

## 部品数の分布(ZWJ を除く文字数ベース)

| 部品数 | ラベル数 | 例 |
| --- | --- | --- |
| 1(基本字単独) | 60 | `ක` `අ` |
| 2(子音 + 母音記号) | 310 | `කා` `කි` |
| 3 | 17 | — |
| 4(結合子音 + 母音記号) | 63 | `ක්‍රි` |

(壊れ 4 ラベルは集計対象外)

## 分解一覧(folder 1〜454)

⚠ 印は FM Abhaya レガシーフォント残骸で正字未確定(変換候補のみ。datasets.md 参照)。

| folder | 合成字 | 基本字 | 修飾(母音記号・hal・記号) |
| --- | --- | --- | --- |
| 1 | අ | අ | (なし) |
| 2 | ආ | ආ | (なし) |
| 3 | ඇ | ඇ | (なし) |
| 4 | ඈ | ඈ | (なし) |
| 5 | ඉ | ඉ | (なし) |
| 6 | ඊ | ඊ | (なし) |
| 7 | උ | උ | (なし) |
| 8 | එ | එ | (なし) |
| 9 | ඒ | ඒ | (なし) |
| 10 | ඔ | ඔ | (なし) |
| 11 | ඕ | ඕ | (なし) |
| 12 | ක | ක | (なし) |
| 13 | කා | ක | ා(AELA-PILLA) |
| 14 | කැ | ක | ැ(KETTI AEDA-PILLA) |
| 15 | කෑ | ක | ෑ(DIGA AEDA-PILLA) |
| 16 | කි | ක | ි(KETTI IS-PILLA) |
| 17 | කී | ක | ී(DIGA IS-PILLA) |
| 18 | කු | ක | ු(KETTI PAA-PILLA) |
| 19 | කූ | ක | ූ(DIGA PAA-PILLA) |
| 20 | ක් | ක | ්(hal) |
| 21 | කෝ | ක | ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 22 | ක්‍ර | ක + ර | ්(hal) + ZWJ |
| 23 | ක්‍රි | ක + ර | ්(hal) + ZWJ + ි(KETTI IS-PILLA) |
| 24 | ක්‍රී | ක + ර | ්(hal) + ZWJ + ී(DIGA IS-PILLA) |
| 25 | ග | ග | (なし) |
| 26 | ගා | ග | ා(AELA-PILLA) |
| 27 | ගැ | ග | ැ(KETTI AEDA-PILLA) |
| 28 | ගෑ | ග | ෑ(DIGA AEDA-PILLA) |
| 29 | ගි | ග | ි(KETTI IS-PILLA) |
| 30 | ගී | ග | ී(DIGA IS-PILLA) |
| 31 | ගු | ග | ු(KETTI PAA-PILLA) |
| 32 | ගූ | ග | ූ(DIGA PAA-PILLA) |
| 33 | ග් | ග | ්(hal) |
| 34 | ගෝ | ග | ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 35 | ග්‍ර | ග + ර | ්(hal) + ZWJ |
| 36 | ග්‍රි | ග + ර | ්(hal) + ZWJ + ි(KETTI IS-PILLA) |
| 37 | ග්‍රී | ග + ර | ්(hal) + ZWJ + ී(DIGA IS-PILLA) |
| 38 | ච | ච | (なし) |
| 39 | චා | ච | ා(AELA-PILLA) |
| 40 | චැ | ච | ැ(KETTI AEDA-PILLA) |
| 41 | චෑ | ච | ෑ(DIGA AEDA-PILLA) |
| 42 | චි | ච | ි(KETTI IS-PILLA) |
| 43 | චී | ච | ී(DIGA IS-PILLA) |
| 44 | චු | ච | ු(KETTI PAA-PILLA) |
| 45 | චූ | ච | ූ(DIGA PAA-PILLA) |
| 46 | ච් | ච | ්(hal) |
| 47 | චෝ | ච | ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 48 | ච්‍ර | ච + ර | ්(hal) + ZWJ |
| 49 | ච්‍ර් | ච + ර | ්(hal) + ZWJ |
| 50 | ච්‍රී | ච + ර | ්(hal) + ZWJ + ී(DIGA IS-PILLA) |
| 51 | ජ | ජ | (なし) |
| 52 | ජා | ජ | ා(AELA-PILLA) |
| 53 | ජැ | ජ | ැ(KETTI AEDA-PILLA) |
| 54 | ජෑ | ජ | ෑ(DIGA AEDA-PILLA) |
| 55 | ජි | ජ | ි(KETTI IS-PILLA) |
| 56 | ජී | ජ | ී(DIGA IS-PILLA) |
| 57 | ජු | ජ | ු(KETTI PAA-PILLA) |
| 58 | ජූ | ජ | ූ(DIGA PAA-PILLA) |
| 59 | ජ් | ජ | ්(hal) |
| 60 | ජෝ | ජ | ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 61 | ජ්‍ර | ජ + ර | ්(hal) + ZWJ |
| 62 | ජ්‍රි | ජ + ර | ්(hal) + ZWJ + ි(KETTI IS-PILLA) |
| 63 | ජ්‍රී | ජ + ර | ්(hal) + ZWJ + ී(DIGA IS-PILLA) |
| 64 | ට | ට | (なし) |
| 65 | ටා | ට | ා(AELA-PILLA) |
| 66 | ටැ | ට | ැ(KETTI AEDA-PILLA) |
| 67 | ටෑ | ට | ෑ(DIGA AEDA-PILLA) |
| 68 | ටි | ට | ි(KETTI IS-PILLA) |
| 69 | ටී | ට | ී(DIGA IS-PILLA) |
| 70 | ටු | ට | ු(KETTI PAA-PILLA) |
| 71 | ටූ | ට | ූ(DIGA PAA-PILLA) |
| 72 | ට් | ට | ්(hal) |
| 73 | ටෝ | ට | ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 74 | ට්‍ර | ට + ර | ්(hal) + ZWJ |
| 75 | ට්‍ර් | ට + ර | ්(hal) + ZWJ |
| 76 | ට්‍රි | ට + ර | ්(hal) + ZWJ + ි(KETTI IS-PILLA) |
| 77 | ඩ | ඩ | (なし) |
| 78 | ඩා | ඩ | ා(AELA-PILLA) |
| 79 | ඩැ | ඩ | ැ(KETTI AEDA-PILLA) |
| 80 | ඩෑ | ඩ | ෑ(DIGA AEDA-PILLA) |
| 81 | ඩි | ඩ | ි(KETTI IS-PILLA) |
| 82 | ඩී | ඩ | ී(DIGA IS-PILLA) |
| 83 | ඩු | ඩ | ු(KETTI PAA-PILLA) |
| 84 | ඩූ | ඩ | ූ(DIGA PAA-PILLA) |
| 85 | ඩ් | ඩ | ්(hal) |
| 86 | ඩෝ | ඩ | ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 87 | ඩ්‍ර | ඩ + ර | ්(hal) + ZWJ |
| 88 | ඩ්‍ර් | ඩ + ර | ්(hal) + ZWJ |
| 89 | ඩ්‍රි | ඩ + ර | ්(hal) + ZWJ + ි(KETTI IS-PILLA) |
| 90 | ණ | ණ | (なし) |
| 91 | ණා | ණ | ා(AELA-PILLA) |
| 92 | ණි | ණ | ි(KETTI IS-PILLA) |
| 93 | ත | ත | (なし) |
| 94 | තා | ත | ා(AELA-PILLA) |
| 95 | ති | ත | ි(KETTI IS-PILLA) |
| 96 | තී | ත | ී(DIGA IS-PILLA) |
| 97 | තු | ත | ු(KETTI PAA-PILLA) |
| 98 | තූ | ත | ූ(DIGA PAA-PILLA) |
| 99 | ත් | ත | ්(hal) |
| 100 | තෝ | ත | ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 101 | ත්‍ර | ත + ර | ්(hal) + ZWJ |
| 102 | ත්‍රා | ත + ර | ්(hal) + ZWJ + ා(AELA-PILLA) |
| 103 | ත්‍රි | ත + ර | ්(hal) + ZWJ + ි(KETTI IS-PILLA) |
| 104 | ත්‍රී | ත + ර | ්(hal) + ZWJ + ී(DIGA IS-PILLA) |
| 105 | ද | ද | (なし) |
| 106 | දා | ද | ා(AELA-PILLA) |
| 107 | දැ | ද | ැ(KETTI AEDA-PILLA) |
| 108 | දෑ | ද | ෑ(DIGA AEDA-PILLA) |
| 109 | දි | ද | ි(KETTI IS-PILLA) |
| 110 | දී | ද | ී(DIGA IS-PILLA) |
| 111 | දු | ද | ු(KETTI PAA-PILLA) |
| 112 | දූ | ද | ූ(DIGA PAA-PILLA) |
| 113 | ද් | ද | ්(hal) |
| 114 | දෝ | ද | ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 115 | ද්‍ර | ද + ර | ්(hal) + ZWJ |
| 116 | ද්‍රෝ | ද + ර | ්(hal) + ZWJ + ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 117 | ද්‍රා | ද + ර | ්(hal) + ZWJ + ා(AELA-PILLA) |
| 118 | ද්‍රි | ද + ර | ්(hal) + ZWJ + ි(KETTI IS-PILLA) |
| 119 | ද්‍රී | ද + ර | ්(hal) + ZWJ + ී(DIGA IS-PILLA) |
| 120 | න | න | (なし) |
| 121 | නා | න | ා(AELA-PILLA) |
| 122 | නැ | න | ැ(KETTI AEDA-PILLA) |
| 123 | නෑ | න | ෑ(DIGA AEDA-PILLA) |
| 124 | නි | න | ි(KETTI IS-PILLA) |
| 125 | නී | න | ී(DIGA IS-PILLA) |
| 126 | නු | න | ු(KETTI PAA-PILLA) |
| 127 | නූ | න | ූ(DIGA PAA-PILLA) |
| 128 | න් | න | ්(hal) |
| 129 | නෝ | න | ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 130 | න්‍ර | න + ර | ්(hal) + ZWJ |
| 131 | න්‍රා | න + ර | ්(hal) + ZWJ + ා(AELA-PILLA) |
| 132 | න්‍රි | න + ර | ්(hal) + ZWJ + ි(KETTI IS-PILLA) |
| 133 | න්‍රී | න + ර | ්(hal) + ZWJ + ී(DIGA IS-PILLA) |
| 134 | ප | ප | (なし) |
| 135 | පා | ප | ා(AELA-PILLA) |
| 136 | පැ | ප | ැ(KETTI AEDA-PILLA) |
| 137 | පෑ | ප | ෑ(DIGA AEDA-PILLA) |
| 138 | පි | ප | ි(KETTI IS-PILLA) |
| 139 | පී | ප | ී(DIGA IS-PILLA) |
| 140 | පු | ප | ු(KETTI PAA-PILLA) |
| 141 | පූ | ප | ූ(DIGA PAA-PILLA) |
| 142 | ප් | ප | ්(hal) |
| 143 | ප්‍රෝ | ප + ර | ්(hal) + ZWJ + ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 144 | පෝ | ප | ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 145 | ප්‍ර | ප + ර | ්(hal) + ZWJ |
| 146 | ප්‍රා | ප + ර | ්(hal) + ZWJ + ා(AELA-PILLA) |
| 147 | ප්‍රි | ප + ර | ්(hal) + ZWJ + ි(KETTI IS-PILLA) |
| 148 | ප්‍රී | ප + ර | ්(hal) + ZWJ + ී(DIGA IS-PILLA) |
| 149 | බ | බ | (なし) |
| 150 | බා | බ | ා(AELA-PILLA) |
| 151 | බැ | බ | ැ(KETTI AEDA-PILLA) |
| 152 | බෑ | බ | ෑ(DIGA AEDA-PILLA) |
| 153 | බි | බ | ි(KETTI IS-PILLA) |
| 154 | බී | බ | ී(DIGA IS-PILLA) |
| 155 | බු | බ | ු(KETTI PAA-PILLA) |
| 156 | බූ | බ | ූ(DIGA PAA-PILLA) |
| 157 | බ් | බ | ්(hal) |
| 158 | බ්‍රෝ | බ + ර | ්(hal) + ZWJ + ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 159 | බ්‍ර | බ + ර | ්(hal) + ZWJ |
| 160 | බ්‍රා | බ + ර | ්(hal) + ZWJ + ා(AELA-PILLA) |
| 161 | බ්‍රි | බ + ර | ්(hal) + ZWJ + ි(KETTI IS-PILLA) |
| 162 | බ්‍රී | බ + ර | ්(hal) + ZWJ + ී(DIGA IS-PILLA) |
| 163 | බ්‍රෝ | බ + ර | ්(hal) + ZWJ + ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 164 | ම | ම | (なし) |
| 165 | මා | ම | ා(AELA-PILLA) |
| 166 | මැ | ම | ැ(KETTI AEDA-PILLA) |
| 167 | මෑ | ම | ෑ(DIGA AEDA-PILLA) |
| 168 | මි | ම | ි(KETTI IS-PILLA) |
| 169 | මී | ම | ී(DIGA IS-PILLA) |
| 170 | මු | ම | ු(KETTI PAA-PILLA) |
| 171 | මූ | ම | ූ(DIGA PAA-PILLA) |
| 172 | ම් | ම | ්(hal) |
| 173 | මෝ | ම | ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 174 | ම්‍ර | ම + ර | ්(hal) + ZWJ |
| 175 | ම්‍රා | ම + ර | ්(hal) + ZWJ + ා(AELA-PILLA) |
| 176 | ම්‍රි | ම + ර | ්(hal) + ZWJ + ි(KETTI IS-PILLA) |
| 177 | ම්‍රී | ම + ර | ්(hal) + ZWJ + ී(DIGA IS-PILLA) |
| 178 | ම්‍රෝ | ම + ර | ්(hal) + ZWJ + ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 179 | ය | ය | (なし) |
| 180 | යා | ය | ා(AELA-PILLA) |
| 181 | යැ | ය | ැ(KETTI AEDA-PILLA) |
| 182 | යෑ | ය | ෑ(DIGA AEDA-PILLA) |
| 183 | යි | ය | ි(KETTI IS-PILLA) |
| 184 | යී | ය | ී(DIGA IS-PILLA) |
| 185 | යු | ය | ු(KETTI PAA-PILLA) |
| 186 | යූ | ය | ූ(DIGA PAA-PILLA) |
| 187 | ෝ | - | ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 188 | ය් | ය | ්(hal) |
| 189 | යෝ | ය | ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 190 | ර | ර | (なし) |
| 191 | රා | ර | ා(AELA-PILLA) |
| 192 | රැ | ර | ැ(KETTI AEDA-PILLA) |
| 193 | රැ | ර | ැ(KETTI AEDA-PILLA) |
| 194 | රු | ර | ු(KETTI PAA-PILLA) |
| 195 | රූ | ර | ූ(DIGA PAA-PILLA) |
| 196 | රි | ර | ි(KETTI IS-PILLA) |
| 197 | රී | ර | ී(DIGA IS-PILLA) |
| 198 | ල | ල | (なし) |
| 199 | ලා | ල | ා(AELA-PILLA) |
| 200 | ලැ | ල | ැ(KETTI AEDA-PILLA) |
| 201 | ලෑ | ල | ෑ(DIGA AEDA-PILLA) |
| 202 | ලි | ල | ි(KETTI IS-PILLA) |
| 203 | ලී | ල | ී(DIGA IS-PILLA) |
| 204 | ලු | ල | ු(KETTI PAA-PILLA) |
| 205 | ලූ | ල | ූ(DIGA PAA-PILLA) |
| 206 | ල් | ල | ්(hal) |
| 207 | ලෝ | ල | ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 208 | ව | ව | (なし) |
| 209 | වා | ව | ා(AELA-PILLA) |
| 210 | වැ | ව | ැ(KETTI AEDA-PILLA) |
| 211 | වෑ | ව | ෑ(DIGA AEDA-PILLA) |
| 212 | වි | ව | ි(KETTI IS-PILLA) |
| 213 | වී | ව | ී(DIGA IS-PILLA) |
| 214 | වු | ව | ු(KETTI PAA-PILLA) |
| 215 | වූ | ව | ූ(DIGA PAA-PILLA) |
| 216 | ව් | ව | ්(hal) |
| 217 | වෝ | ව | ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 218 | ව්‍ර | ව + ර | ්(hal) + ZWJ |
| 219 | ව්‍රා | ව + ර | ්(hal) + ZWJ + ා(AELA-PILLA) |
| 220 | ව්‍රැ | ව + ර | ්(hal) + ZWJ + ැ(KETTI AEDA-PILLA) |
| 221 | ව්‍රෑ | ව + ර | ්(hal) + ZWJ + ෑ(DIGA AEDA-PILLA) |
| 222 | ව්‍රෝ | ව + ර | ්(hal) + ZWJ + ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 223 | ශ | ශ | (なし) |
| 224 | ශා | ශ | ා(AELA-PILLA) |
| 225 | ශැ | ශ | ැ(KETTI AEDA-PILLA) |
| 226 | ශෑ | ශ | ෑ(DIGA AEDA-PILLA) |
| 227 | ශි | ශ | ි(KETTI IS-PILLA) |
| 228 | ශී | ශ | ී(DIGA IS-PILLA) |
| 229 | ශු | ශ | ු(KETTI PAA-PILLA) |
| 230 | ශූ | ශ | ූ(DIGA PAA-PILLA) |
| 231 | ශ් | ශ | ්(hal) |
| 232 | ශෝ | ශ | ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 233 | ශ්‍ර | ශ + ර | ්(hal) + ZWJ |
| 234 | ශ්‍රා | ශ + ර | ්(hal) + ZWJ + ා(AELA-PILLA) |
| 235 | ශ්‍රැ | ශ + ර | ්(hal) + ZWJ + ැ(KETTI AEDA-PILLA) |
| 236 | ශ්‍රෑ | ශ + ර | ්(hal) + ZWJ + ෑ(DIGA AEDA-PILLA) |
| 237 | ශ්‍රි | ශ + ර | ්(hal) + ZWJ + ි(KETTI IS-PILLA) |
| 238 | ශ්‍රී | ශ + ර | ්(hal) + ZWJ + ී(DIGA IS-PILLA) |
| 239 | ශ්‍රෝ | ශ + ර | ්(hal) + ZWJ + ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 240 | ෂ | ෂ | (なし) |
| 241 | ෂා | ෂ | ා(AELA-PILLA) |
| 242 | ෂැ | ෂ | ැ(KETTI AEDA-PILLA) |
| 243 | ෂෑ | ෂ | ෑ(DIGA AEDA-PILLA) |
| 244 | ෂි | ෂ | ි(KETTI IS-PILLA) |
| 245 | ෂී | ෂ | ී(DIGA IS-PILLA) |
| 246 | ෂු | ෂ | ු(KETTI PAA-PILLA) |
| 247 | ෂූ | ෂ | ූ(DIGA PAA-PILLA) |
| 248 | ෂ් | ෂ | ්(hal) |
| 249 | ෂෝ | ෂ | ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 250 | ස | ස | (なし) |
| 251 | සා | ස | ා(AELA-PILLA) |
| 252 | සැ | ස | ැ(KETTI AEDA-PILLA) |
| 253 | සෑ | ස | ෑ(DIGA AEDA-PILLA) |
| 254 | සි | ස | ි(KETTI IS-PILLA) |
| 255 | සී | ස | ී(DIGA IS-PILLA) |
| 256 | සු | ස | ු(KETTI PAA-PILLA) |
| 257 | සූ | ස | ූ(DIGA PAA-PILLA) |
| 258 | සෝ | ස | ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 259 | ස්‍ර | ස + ර | ්(hal) + ZWJ |
| 260 | ස්‍රා | ස + ර | ්(hal) + ZWJ + ා(AELA-PILLA) |
| 261 | ස්‍රි | ස + ර | ්(hal) + ZWJ + ි(KETTI IS-PILLA) |
| 262 | ස්‍රී | ස + ර | ්(hal) + ZWJ + ී(DIGA IS-PILLA) |
| 263 | ස් | ස | ්(hal) |
| 264 | හ | හ | (なし) |
| 265 | හා | හ | ා(AELA-PILLA) |
| 266 | හැ | හ | ැ(KETTI AEDA-PILLA) |
| 267 | හෑ | හ | ෑ(DIGA AEDA-PILLA) |
| 268 | හි | හ | ි(KETTI IS-PILLA) |
| 269 | හී | හ | ී(DIGA IS-PILLA) |
| 270 | හු | හ | ු(KETTI PAA-PILLA) |
| 271 | හූ | හ | ූ(DIGA PAA-PILLA) |
| 272 | හ් | හ | ්(hal) |
| 273 | හෝ | හ | ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 274 | ළ | ළ | (なし) |
| 275 | ළා | ළ | ා(AELA-PILLA) |
| 276 | ළැ | ළ | ැ(KETTI AEDA-PILLA) |
| 277 | ළෑ | ළ | ෑ(DIGA AEDA-PILLA) |
| 278 | ළි | ළ | ි(KETTI IS-PILLA) |
| 279 | ළී | ළ | ී(DIGA IS-PILLA) |
| 280 | ළූ | ළ | ූ(DIGA PAA-PILLA) |
| 281 | ළූ | ළ | ූ(DIGA PAA-PILLA) |
| 282 | ෆ | ෆ | (なし) |
| 283 | ෆා | ෆ | ා(AELA-PILLA) |
| 284 | ෆැ | ෆ | ැ(KETTI AEDA-PILLA) |
| 285 | ෆෑ | ෆ | ෑ(DIGA AEDA-PILLA) |
| 286 | ෆි | ෆ | ි(KETTI IS-PILLA) |
| 287 | ෆී | ෆ | ී(DIGA IS-PILLA) |
| 288 | ෆූ | ෆ | ූ(DIGA PAA-PILLA) |
| 289 | ෆූ | ෆ | ූ(DIGA PAA-PILLA) |
| 290 | ෆ්‍ර | ෆ + ර | ්(hal) + ZWJ |
| 291 | ෆ්‍රි | ෆ + ර | ්(hal) + ZWJ + ි(KETTI IS-PILLA) |
| 292 | ෆ්‍රී | ෆ + ර | ්(hal) + ZWJ + ී(DIGA IS-PILLA) |
| 293 | ෆ්‍රැ | ෆ + ර | ්(hal) + ZWJ + ැ(KETTI AEDA-PILLA) |
| 294 | ෆ්‍රෑ | ෆ + ර | ්(hal) + ZWJ + ෑ(DIGA AEDA-PILLA) |
| 295 | ෆ් | ෆ | ්(hal) |
| 296 | ෆෝ | ෆ | ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 297 | ක්‍රා | ක + ර | ්(hal) + ZWJ + ා(AELA-PILLA) |
| 298 | ක්‍රැ | ක + ර | ්(hal) + ZWJ + ැ(KETTI AEDA-PILLA) |
| 299 | ක්‍රෑ | ක + ර | ්(hal) + ZWJ + ෑ(DIGA AEDA-PILLA) |
| 300 | ක්‍රෝ | ක + ර | ්(hal) + ZWJ + ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 301 | ග්‍රෝ | ග + ර | ්(hal) + ZWJ + ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 302 | ඛ | ඛ | (なし) |
| 303 | ඛා | ඛ | ා(AELA-PILLA) |
| 304 | ඛි | ඛ | ි(KETTI IS-PILLA) |
| 305 | ඛී | ඛ | ී(DIGA IS-PILLA) |
| 306 | ඛ් | ඛ | ්(hal) |
| 307 | ඝ | ඝ | (なし) |
| 308 | ඝා | ඝ | ා(AELA-PILLA) |
| 309 | ඝැ | ඝ | ැ(KETTI AEDA-PILLA) |
| 310 | ඝෑ | ඝ | ෑ(DIGA AEDA-PILLA) |
| 311 | ඝි | ඝ | ි(KETTI IS-PILLA) |
| 312 | ඝී | ඝ | ී(DIGA IS-PILLA) |
| 313 | ඝු | ඝ | ු(KETTI PAA-PILLA) |
| 314 | ඝූ | ඝ | ූ(DIGA PAA-PILLA) |
| 315 | ඝෝ | ඝ | ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 316 | ඝ් | ඝ | ්(hal) |
| 317 | ඝ්‍ර | ඝ + ර | ්(hal) + ZWJ |
| 318 | ඝ්‍රා | ඝ + ර | ්(hal) + ZWJ + ා(AELA-PILLA) |
| 319 | ඝ්‍රි | ඝ + ර | ්(hal) + ZWJ + ි(KETTI IS-PILLA) |
| 320 | ඝ්‍රී | ඝ + ර | ්(hal) + ZWJ + ී(DIGA IS-PILLA) |
| 321 | ඳ | ඳ | (なし) |
| 322 | ඳා | ඳ | ා(AELA-PILLA) |
| 323 | ඳැ | ඳ | ැ(KETTI AEDA-PILLA) |
| 324 | ඳෑ | ඳ | ෑ(DIGA AEDA-PILLA) |
| 325 | ෑ | - | ෑ(DIGA AEDA-PILLA) |
| 326 | ඳි | ඳ | ි(KETTI IS-PILLA) |
| 327 | ඳී | ඳ | ී(DIGA IS-PILLA) |
| 328 | ඳු | ඳ | ු(KETTI PAA-PILLA) |
| 329 | ඳූ | ඳ | ූ(DIGA PAA-PILLA) |
| 330 | ඳෝ | ඳ | ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 331 | ඳ් | ඳ | ්(hal) |
| 332 | ඟ | ඟ | (なし) |
| 333 | ඟා | ඟ | ා(AELA-PILLA) |
| 334 | ඟැ | ඟ | ැ(KETTI AEDA-PILLA) |
| 335 | ඟෑ | ඟ | ෑ(DIGA AEDA-PILLA) |
| 336 | ඟි | ඟ | ි(KETTI IS-PILLA) |
| 337 | ඟී | ඟ | ී(DIGA IS-PILLA) |
| 338 | ඟු | ඟ | ු(KETTI PAA-PILLA) |
| 339 | ඟූ | ඟ | ූ(DIGA PAA-PILLA) |
| 340 | ඟෝ | ඟ | ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 341 | ඟ් | ඟ | ්(hal) |
| 342 | ඬ | ඬ | (なし) |
| 343 | ැ | - | ැ(KETTI AEDA-PILLA) |
| 344 | ඬා | ඬ | ා(AELA-PILLA) |
| 345 | ඬැ | ඬ | ැ(KETTI AEDA-PILLA) |
| 346 | ඬෑ | ඬ | ෑ(DIGA AEDA-PILLA) |
| 347 | ඬි | ඬ | ි(KETTI IS-PILLA) |
| 348 | ඬී | ඬ | ී(DIGA IS-PILLA) |
| 349 | ඬු | ඬ | ු(KETTI PAA-PILLA) |
| 350 | ඬූ | ඬ | ූ(DIGA PAA-PILLA) |
| 351 | ඬෝ | ඬ | ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 352 | ඬ් | ඬ | ්(hal) |
| 353 | ඹ | ඹ | (なし) |
| 354 | ඹා | ඹ | ා(AELA-PILLA) |
| 355 | ඹැ | ඹ | ැ(KETTI AEDA-PILLA) |
| 356 | ඹෑ | ඹ | ෑ(DIGA AEDA-PILLA) |
| 357 | ඹි | ඹ | ි(KETTI IS-PILLA) |
| 358 | ඹී | ඹ | ී(DIGA IS-PILLA) |
| 359 | ඹු | ඹ | ු(KETTI PAA-PILLA) |
| 360 | ඹූ | ඹ | ූ(DIGA PAA-PILLA) |
| 361 | ඹෝ | ඹ | ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 362 | ඹ් | ඹ | ්(hal) |
| 363 | භ | භ | (なし) |
| 364 | භා | භ | ා(AELA-PILLA) |
| 365 | භැ | භ | ැ(KETTI AEDA-PILLA) |
| 366 | භෑ | භ | ෑ(DIGA AEDA-PILLA) |
| 367 | භි | භ | ි(KETTI IS-PILLA) |
| 368 | භී | භ | ී(DIGA IS-PILLA) |
| 369 | භු | භ | ු(KETTI PAA-PILLA) |
| 370 | භූ | භ | ූ(DIGA PAA-PILLA) |
| 371 | භෝ | භ | ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 372 | භ් | භ | ්(hal) |
| 373 | ධ | ධ | (なし) |
| 374 | ධා | ධ | ා(AELA-PILLA) |
| 375 | ධැ | ධ | ැ(KETTI AEDA-PILLA) |
| 376 | ධෑ | ධ | ෑ(DIGA AEDA-PILLA) |
| 377 | ධි | ධ | ි(KETTI IS-PILLA) |
| 378 | ධී | ධ | ී(DIGA IS-PILLA) |
| 379 | ධු | ධ | ු(KETTI PAA-PILLA) |
| 380 | ධූ | ධ | ූ(DIGA PAA-PILLA) |
| 381 | ධෝ | ධ | ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 382 | ධ් | ධ | ්(hal) |
| 383 | ඨ | ඨ | (なし) |
| 384 | ඨා | ඨ | ා(AELA-PILLA) |
| 385 | ඨැ | ඨ | ැ(KETTI AEDA-PILLA) |
| 386 | ඨි | ඨ | ි(KETTI IS-PILLA) |
| 387 | ඨී | ඨ | ී(DIGA IS-PILLA) |
| 388 | ඨු | ඨ | ු(KETTI PAA-PILLA) |
| 389 | ඨූ | ඨ | ූ(DIGA PAA-PILLA) |
| 390 | ඨ් | ඨ | ්(hal) |
| 391 | ඪ | ඪ | (なし) |
| 392 | ඪා | ඪ | ා(AELA-PILLA) |
| 393 | ඪි | ඪ | ි(KETTI IS-PILLA) |
| 394 | ඨෝ | ඨ | ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 395 | ඵ | ඵ | (なし) |
| 396 | ඵා | ඵ | ා(AELA-PILLA) |
| 397 | ඵු | ඵ | ු(KETTI PAA-PILLA) |
| 398 | ඵි | ඵ | ි(KETTI IS-PILLA) |
| 399 | ඵෝ | ඵ | ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 400 | ඵ් | ඵ | ්(hal) |
| 401 | ථ | ථ | (なし) |
| 402 | ථා | ථ | ා(AELA-PILLA) |
| 403 | ථැ | ථ | ැ(KETTI AEDA-PILLA) |
| 404 | ථ් | ථ | ්(hal) |
| 405 | ා | - | ා(AELA-PILLA) |
| 406 | ෟ | - | ෟ(GAYANUKITTA) |
| 407 | ණැ | ණ | ැ(KETTI AEDA-PILLA) |
| 408 | ණෑ | ණ | ෑ(DIGA AEDA-PILLA) |
| 409 | ෘ | - | ෘ(GAETTA-PILLA) |
| 410 | ණී | ණ | ී(DIGA IS-PILLA) |
| 411 | ණු | ණ | ු(KETTI PAA-PILLA) |
| 412 | ණූ | ණ | ූ(DIGA PAA-PILLA) |
| 413 | ණෝ | ණ | ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 414 | ණ් | ණ | ්(hal) |
| 415 | ඥ | ඥ | (なし) |
| 416 | ඥා | ඥ | ා(AELA-PILLA) |
| 417 | ඥෝ | ඥ | ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 418 | ඤ | ඤ | (なし) |
| 419 | ඤා | ඤ | ා(AELA-PILLA) |
| 420 | ඤු | ඤ | ු(KETTI PAA-PILLA) |
| 421 | ඤෝ | ඤ | ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 422 | ඤ් | ඤ | ්(hal) |
| 423 | ඣ | ඣ | (なし) |
| 424 | ඣා | ඣ | ා(AELA-PILLA) |
| 425 | ඣු | ඣ | ු(KETTI PAA-PILLA) |
| 426 | ⚠`COda`(壊れ) | (要確定) | ඣ系派生(CO=ඣ) |
| 427 | ඣ් | ඣ | ්(hal) |
| 428 | ඦ | ඦ | (なし) |
| 429 | ඦා | ඦ | ා(AELA-PILLA) |
| 430 | ඦැ | ඦ | ැ(KETTI AEDA-PILLA) |
| 431 | ඦෑ | ඦ | ෑ(DIGA AEDA-PILLA) |
| 432 | ඦි | ඦ | ි(KETTI IS-PILLA) |
| 433 | ඦු | ඦ | ු(KETTI PAA-PILLA) |
| 434 | ඦූ | ඦ | ූ(DIGA PAA-PILLA) |
| 435 | ඦෝ | ඦ | ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 436 | ඦ් | ඦ | ්(hal) |
| 437 | ඡ | ඡ | (なし) |
| 438 | ඡා | ඡ | ා(AELA-PILLA) |
| 439 | ඡැ | ඡ | ැ(KETTI AEDA-PILLA) |
| 440 | ඡෑ | ඡ | ෑ(DIGA AEDA-PILLA) |
| 441 | ඡි | ඡ | ි(KETTI IS-PILLA) |
| 442 | ඡේ | ඡ | ේ(DIGA KOMBUVA) |
| 443 | තැ | ත | ැ(KETTI AEDA-PILLA) |
| 444 | තෑ | ත | ෑ(DIGA AEDA-PILLA) |
| 445 | ත්‍රැ | ත + ර | ්(hal) + ZWJ + ැ(KETTI AEDA-PILLA) |
| 446 | ත්‍රෑ | ත + ර | ්(hal) + ZWJ + ෑ(DIGA AEDA-PILLA) |
| 447 | ත්‍රෝ | ත + ර | ්(hal) + ZWJ + ෝ(KOMBUVA HAA DIGA AELA-PILLA) |
| 448 | ළු | ළ | ු(KETTI PAA-PILLA) |
| 449 | ෲ | - | ෲ(DIGA GAETTA-PILLA) |
| 450 | ⚠`HQ`(壊れ) | (要確定) | ්‍යූ (yansa+ū) |
| 451 | ෛ | - | ෛ(KOMBU DEKA) |
| 452 | ෙ | - | ෙ(KOMBUVA) |
| 453 | ⚠`H`(壊れ) | (要確定) | ්‍ය (yansa) |
| 454 | ⚠`Hq`(壊れ) | (要確定) | ්‍යු (yansa+u) |
