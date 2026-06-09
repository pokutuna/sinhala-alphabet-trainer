# /// script
# requires-python = ">=3.11"
# dependencies = ["regex", "uharfbuzz", "freetype-py", "pillow", "numpy"]
# ///
# (描画 render_text は freetype-py/pillow/numpy を使う。分解のみなら regex+uharfbuzz で足りる)
# akshara の分割・シェーピング・配置判定・役割分解の共通ロジック。
# gen_akshara_table.py / gen_training_labels.py から import して使う。
#
# 設計方針:
#   - 配置(BASE/PRE/NEXT/POST)は HarfBuzz 実シェーピングの返却順 + advance で判定。
#     詳細: docs/glyph-placement.md
#   - 役割ラベル(素子音/母音記号)は **コードポイント由来**で取る(フォント非依存)。
#     融合グリフ(darasinh 等)はフォント依存なので、役割はグリフでなく codepoint から。
import os
import regex
import unicodedata as ud

import uharfbuzz as hb

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")

INVALID_GLYPHS = {"uni25CC", "space", ".notdef"}
ZWJ = 0x200D
ZWNJ = 0x200C
HAL = 0x0DCA

# --- コードポイントの役割分類 ---


def role(c):
    """1 コードポイントの役割。C=子音 IV=独立母音 H=hal DV=母音記号 VM=anusvara/visarga"""
    o = ord(c)
    if 0x0D85 <= o <= 0x0D96:
        return "IV"
    if 0x0D9A <= o <= 0x0DC6:
        return "C"
    if o == HAL:
        return "H"
    if (0x0DCF <= o <= 0x0DDF) or (0x0DF2 <= o <= 0x0DF3):
        return "DV"
    if o in (0x0D82, 0x0D83):
        return "VM"
    if o == ZWJ:
        return "ZWJ"
    if o == ZWNJ:
        return "ZWNJ"
    return "X"


# --- akshara 分割 ---


def split_aksharas(text):
    """hal(0DCA)/ZWJ(200D) で終わるクラスタは次と連結し、結合子音を1 akshara に保つ。
    素朴な \\X(拡張書記素クラスタ)だと ZWJ 結合(ක්‍ර 等)が2片に割れるので連結ルールが必須。

    注意: このルールは「ハル止め子音の横並び」も1塊にまとめる。Armstrong の ම්ස්ට්‍රෝ は
    視覚的には ට්‍ర の積み1箇所しか無いのに1塊(子音4個)になる。この塊内の子音数を
    そのまま「連数」と解釈すると **視覚的な積み(stack)を過大評価する**(→ count_conjuncts
    の hal_chain と stack の違いを参照)。塊化は学習ラベルの単位確定が目的で、連数集計には
    count_conjuncts を使うこと。"""
    cl = regex.findall(r"\X", text)
    out, buf = [], ""
    for x in cl:
        if not any(0x0D80 <= ord(c) <= 0x0DFF or ord(c) == ZWJ for c in x):
            if buf:
                out.append(buf)
                buf = ""
            continue
        buf += x
        if x and ord(x[-1]) in (HAL, ZWJ):
            continue
        out.append(buf)
        buf = ""
    if buf:
        out.append(buf)
    return out


# --- 連数(conjunct)の2指標 ---
# 「N連」には2つの異なる意味があり、混同すると Armstrong を「4連」と誤集計する。
#   stack     = 視覚的に1つの base に積み重なった子音グリフ数(rakar/yansa/repaya)。
#               Noto Sans Sinhala では最大2(base + 後続1)。これが「字が縦に積まれた数」。
#   hal_chain = ハルで母音を消して連続する素子音の数(split_aksharas 1塊内の子音数)。
#               外来語音写(xtr=4, str=3)で伸びる。音韻的な子音連続であって積みではない。
# 例: Armstrong ආම්ස්ට්‍රෝන් → stack=2, hal_chain=4 / pra ප්‍ර → stack=2, hal_chain=2。


def count_conjuncts(akshara, font):
    """1 akshara(split_aksharas の1塊)の連数を (stack, hal_chain) で返す。

    stack     : shaping して base(advance>0)に乗った rakar/yansa/repaya の数 + 1。
                base が無ければ0。視覚的に積まれた子音数。
    hal_chain : 塊内の素子音(コードポイント C)の総数。ハル連結の長さ。
    """
    hal_chain = sum(1 for c in akshara if 0x0D9A <= ord(c) <= 0x0DC6)
    glyphs = shape(akshara, font)
    if not any(g["adv"] > 0 for g in glyphs):
        return 0, hal_chain
    stack = 1  # base
    for g in glyphs:
        n = g["name"].lower()
        if g["adv"] == 0 and ("rakar" in n or "yansa" in n or "repaya" in n):
            stack += 1
    return stack, hal_chain


# --- フォント読み込み + シェーピング + 配置判定 ---


def load_font(path):
    with open(path, "rb") as fp:
        return hb.Font(hb.Face(fp.read()))


def shape(s, font):
    buf = hb.Buffer()
    buf.add_str(s)
    buf.guess_segment_properties()
    hb.shape(font, buf, {})
    glyphs = []
    for i, p in zip(buf.glyph_infos, buf.glyph_positions):
        glyphs.append(
            {
                "gid": i.codepoint,
                "name": font.get_glyph_name(i.codepoint) or f"gid{i.codepoint}",
                "x": p.x_offset,  # 前置コンブワ等の水平位置決めに必要
                "y": p.y_offset,
                "adv": p.x_advance,
                "notdef": i.codepoint == 0,
            }
        )
    return glyphs


def place(glyphs):
    """各グリフに位置タグ。HarfBuzz の返却順(reorder 済み視覚順)と advance で判定。
    x 座標は使わない(prebase kombuva は adv=0/x=0 で base と同じ x になる)。"""
    if not glyphs:
        return []
    base_i = next((i for i, g in enumerate(glyphs) if g["adv"] > 0), 0)
    tagged = []
    for i, g in enumerate(glyphs):
        if i == base_i:
            pos = "BASE"
        elif i < base_i:
            pos = "PRE"
        elif g["adv"] > 0:
            pos = "NEXT"
        elif g["y"] > 0:
            pos = "ABOVE"
        elif g["y"] < 0:
            pos = "BELOW"
        else:
            pos = "POST"
        tagged.append((g, pos))
    return tagged


def renderable(glyphs):
    """実体グリフが1つ以上あり、◌/notdef が出ていない = 文字として成立。"""
    real = [g for g in glyphs if not g["notdef"] and g["name"] not in INVALID_GLYPHS]
    bad = any(g["notdef"] for g in glyphs) or any(
        g["name"] == "uni25CC" for g in glyphs
    )
    return bool(real) and not bad


# --- HarfBuzz 実シェーピング + freetype gid直描画 ---
# PIL の text 描画は layout engine 依存で、フォントによって ra結合 か split matra
# のどちらかが必ず崩れる(Noto Sans Sinhala v2.002 で両立不能を確認)。
# そこで HarfBuzz でシェープした (gid, x_offset, advance) を freetype で gid 直指定
# ラスタライズして自前合成する。フォント非依存で結合が正しく、合成データ生成にも流用可。


def _ft_face(path):
    import freetype  # 遅延 import(描画時のみ必要)

    return freetype.Face(path)


def render_text(text, hb_font, ft_face, size_px, pad=4):
    """HarfBuzz でシェープし freetype で gid 直描画した PIL グレースケール画像を返す。
    黒文字・白背景。pad は周囲余白(px)。描けない(notdef/◌)場合も描画は試みる。"""
    import freetype  # 遅延 import(描画時のみ必要)
    import numpy as np
    from PIL import Image

    upem = hb_font.scale[0] or 1000  # font unit/em(HarfBuzz の advance 単位)
    s = size_px / upem  # font unit → px
    ft_face.set_pixel_sizes(0, size_px)
    glyphs = shape(text, hb_font)

    # 各 glyph を gid 指定でラスタライズし (alpha配列, 描画左上 x,y) を集める。
    # HarfBuzz 返却順 = 視覚順。advance>0 でペンを進める。advance=0(前置/後置/結合)は
    # ペンを進めず x_offset で位置補正。前置コンブワは x_offset=0 のフォントが多く base に
    # 重なるので、advance=0 かつ base 未出現のグリフは自分の幅ぶん手前(左)に置く。
    pen_x = 0.0
    items = []  # (alpha[h,w] uint8, left_px, top_px)
    base_seen = False
    for g in glyphs:
        ft_face.load_glyph(g["gid"], freetype.FT_LOAD_RENDER)
        slot = ft_face.glyph
        bm = slot.bitmap
        w, h = bm.width, bm.rows
        gx = pen_x + g["x"] * s + slot.bitmap_left
        gy = -(g["y"] * s) - slot.bitmap_top  # y は上が正 → 画面座標へ反転
        adv = g["adv"] * s
        if adv > 0:
            base_seen = True
            pen_after = pen_x + adv
        else:
            if not base_seen:
                gx = pen_x - w  # base の左に寄せる(前置コンブワ等)
            pen_after = pen_x
        if w and h:
            alpha = np.frombuffer(bytes(bm.buffer), np.uint8).reshape(h, w)
            items.append((alpha, gx, gy))
        pen_x = pen_after

    if not items:
        return Image.new("L", (size_px + pad * 2, size_px + pad * 2), 255)

    xs0 = min(x for _, x, y in items)
    ys0 = min(y for _, x, y in items)
    xs1 = max(x + a.shape[1] for a, x, y in items)
    ys1 = max(y + a.shape[0] for a, x, y in items)
    W = int(round(xs1 - xs0)) + pad * 2
    H = int(round(ys1 - ys0)) + pad * 2
    # ink(0=白..255=濃)を max 合成してから反転 → 黒文字・白背景。
    # garasinh(ra結合)等は base に重なって配置されるので、はみ出しても glyph 丸ごと
    # 捨てず、キャンバスと重なる矩形だけをクリップして合成する(round 誤差対策も兼ねる)。
    ink = np.zeros((max(H, 1), max(W, 1)), np.uint8)
    for alpha, x, y in items:
        h, w = alpha.shape
        ox = int(round(x - xs0)) + pad
        oy = int(round(y - ys0)) + pad
        # 描画先・コピー元の重なり矩形を求めてクリップ
        dx0, dy0 = max(ox, 0), max(oy, 0)
        dx1, dy1 = min(ox + w, ink.shape[1]), min(oy + h, ink.shape[0])
        if dx0 >= dx1 or dy0 >= dy1:
            continue
        sub = alpha[dy0 - oy : dy1 - oy, dx0 - ox : dx1 - ox]
        region = ink[dy0:dy1, dx0:dx1]
        np.maximum(region, sub, out=region)
    return Image.fromarray(255 - ink, "L")


# --- 役割分解(コードポイント由来。学習の正解ラベル生成用)---


def decompose_roles(akshara):
    """akshara を役割ラベルに分解する(NFC 前提・コードポイント由来 = フォント非依存)。

    これは **L1(文字の成り立ち・構造)** の分解。コードポイント由来でフォント非依存。
    L2(OCR の視覚単位 = gid 列)とは別レイヤで、依存は L2→L1 の一方向(docs/model-design.md「大原則」)。

    返り値 dict:
      base     : 主役の基底子音/独立母音(単一コードポイント文字列)
      hal      : base が hal 止め(子音単独形)か(bool)
      nexts    : 結合する後続子音のリスト(横並び NEXT + ra/ya 結合も含む。素子音)
      posts    : 母音記号/anusvara/visarga の素パーツ列(NFD 分解後)。
                 split matra の構成片(ෙ ා ් 等)を順序保持で並べる。
      conjunct : 子音 2 つ以上か(bool)= **hal_chain≥2 と同義**(L1 の言語的指標)。
                 **「視覚的に積まれた(stack)」とは別物**。`න්න`(横並び重子音)も
                 `ද්‍ර`(融合)も conjunct=True だが stack はそれぞれ 1/1(積みは rakar 1 個)。
                 OCR ラベル(L2)には入れない。視覚的な積みが要るなら count_conjuncts の stack を使う。
    順序・個数を保持する(`න්ම`≠`ම්න`、`ත්`≠`ත්ත`、`කො`≠`කෝ`)。
    """
    s = ud.normalize("NFC", akshara)
    cps = [c for c in s if role(c) not in ("ZWJ", "ZWNJ")]  # ZWJ/ZWNJ は役割に無関係

    consonants = [c for c in cps if role(c) == "C"]
    ivs = [c for c in cps if role(c) == "IV"]

    # base = 最初の子音、子音が無ければ独立母音
    if consonants:
        base = consonants[0]
        nexts = consonants[1:]  # 2つ目以降の子音 = 結合の後続
    elif ivs:
        base = ivs[0]
        nexts = []
    else:
        base = None
        nexts = []

    # hal止め(母音を伴わない)か = NFC 列の末尾が hal。
    #   ත්(子音単独)も ක්‍ර්(ra結合クラスタ全体の hal止め)も hal=1。
    #   末尾が子音/母音記号なら hal=0。中間 hal(න්ම の連結 hal)はここに含めない。
    base_hal = bool(cps) and role(cps[-1]) == "H"

    # 母音記号/記号は NFD で素パーツに割る(split matra: ො→ෙ+ා, ෝ→ෙ+ා+්)。
    # NFD は base 子音が先頭・以降にマーク列が続く正規順。
    #   母音記号片(DV)を見て以降に来る hal は母音記号の構成片(ෝ の ්)なので post に入れる。
    #   それ以外の hal(base/結合の hal止め・中間 hal)は base_hal/構造で表現済みなので捨てる。
    nfd = ud.normalize("NFD", s)
    posts = []
    seen_dv = False
    for c in nfd:
        r = role(c)
        if r == "DV":
            seen_dv = True
            posts.append(c)
        elif r == "VM":
            posts.append(c)
        elif r == "H" and seen_dv:
            posts.append(c)  # ෝ 等、母音記号の構成片としての hal

    return {
        "base": base,
        "hal": base_hal,
        "nexts": nexts,
        "posts": posts,
        "conjunct": len(consonants) >= 2,
    }
