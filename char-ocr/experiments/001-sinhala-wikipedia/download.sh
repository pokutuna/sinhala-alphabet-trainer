#!/usr/bin/env bash
# Sinhala Wikipedia の本文ダンプを取得する。
#   結合 akshara の「実在・利用実績」を裏取りする頻度集計のための母集団。
#   約79MB(bz2)。展開せず bz2 のまま集計スクリプトに渡す。
#   再取得用。生データ(data/ 配下)は .gitignore で追跡しない。
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA="$HERE/data"
mkdir -p "$DATA"

URL="https://dumps.wikimedia.org/siwiki/latest/siwiki-latest-pages-articles.xml.bz2"
OUT="$DATA/siwiki-latest-pages-articles.xml.bz2"

if [[ -f "$OUT" ]]; then
  echo "already exists: $OUT ($(du -h "$OUT" | cut -f1))"
  exit 0
fi

echo "downloading: $URL"
curl -fL --retry 3 -o "$OUT" "$URL"
echo "done: $OUT ($(du -h "$OUT" | cut -f1))"
