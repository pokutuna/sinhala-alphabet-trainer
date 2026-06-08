#!/usr/bin/env bash
# PWA アイコンを生成する(依存追加なし: rsvg-convert か magick を使う)。
#   シンハラ文字 අ(母音の先頭=「あ」)を中央に置いたアイコン。
#   - public/pwa-192x192.png  : manifest 標準アイコン
#   - public/pwa-512x512.png  : manifest 大アイコン(maskable 兼用)
#   - public/apple-touch-icon.png : iOS ホーム画面用(180x180)
#   - public/favicon.svg      : ベクター favicon
# テーマ: 背景 = blue-600 (#2563eb)、文字 = 白。
# maskable のセーフゾーン(中央 80%)に文字を収めるため、文字はやや小さめ・中央寄せ。
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUBLIC="$(cd "$HERE/.." && pwd)/public"
mkdir -p "$PUBLIC"

GLYPH="අ"
BG="#2563eb"
FG="#ffffff"

# 角丸の正方形に文字を中央配置。viewBox 512、文字は安全ゾーンに収まる font-size。
# フォントは Noto Sans Sinhala を優先、無ければ system フォントにフォールバック。
svg() {
  cat <<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="$BG"/>
  <text x="256" y="256" font-family="Noto Sans Sinhala, sans-serif"
        font-size="300" font-weight="600" fill="$FG"
        text-anchor="middle" dominant-baseline="central">$GLYPH</text>
</svg>
SVG
}

TMP_SVG="$(mktemp -t pwa-icon-XXXX).svg"
svg > "$TMP_SVG"
cp "$TMP_SVG" "$PUBLIC/favicon.svg"

# SVG → PNG 変換。rsvg-convert を優先(テキストレンダリングが安定)、無ければ magick。
render() {
  local size="$1" out="$2"
  if command -v rsvg-convert >/dev/null 2>&1; then
    rsvg-convert -w "$size" -h "$size" "$TMP_SVG" -o "$out"
  elif command -v magick >/dev/null 2>&1; then
    magick -background none -density 384 "$TMP_SVG" -resize "${size}x${size}" "$out"
  else
    echo "error: need rsvg-convert or magick (ImageMagick) to render PNG" >&2
    exit 1
  fi
  echo "  wrote $out"
}

render 192 "$PUBLIC/pwa-192x192.png"
render 512 "$PUBLIC/pwa-512x512.png"
render 180 "$PUBLIC/apple-touch-icon.png"

rm -f "$TMP_SVG"
echo "done: PWA icons in $PUBLIC"
