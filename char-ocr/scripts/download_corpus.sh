#!/usr/bin/env bash
# シンハラ語単語頻度リストを取得する(akshara 使用頻度の実測用)。
#
# 出典: Fernando & Dias (2021) "Building a Linguistic Resource:
#       A Word Frequency List for Sinhala", ICON 2021, Univ. of Moratuwa.
#       https://aclanthology.org/2021.icon-main.74
# リポジトリ: https://github.com/nlpcuom/Word-Frequency-List-for-Sinhala
#
# 元コーパス(論文 Table 1): 計 ~127M トークン
#   - Common Crawl (Web)  106M  (83%)
#   - News                 20M
#   - Govt Documents      0.75M
# verified_word_list_200K.si = スペルチェッカ通過 + 上位3,555語人手確認 → 280,603 語(+頻度)
#
# 注意: verified でも低頻度語の正しさは未保証(人手確認は頻度上位のみ)。
#       Web 主体ゆえ外来語音写の結合子音が多い。
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${SCRIPT_DIR}/../data/corpus"
mkdir -p "${DEST}"
URL="https://raw.githubusercontent.com/nlpcuom/Word-Frequency-List-for-Sinhala/main/verified_word_list_200K.si"
OUT="${DEST}/verified_word_list_200K.si"
if [ -f "${OUT}" ]; then
  echo "Already downloaded: ${OUT}"
  exit 0
fi
echo "Downloading verified word list to ${OUT} ..."
curl -fsSL "${URL}" -o "${OUT}"
echo "Done. lines: $(wc -l < "${OUT}")"

# --- SinOCR 手書き正解テキスト(粒度別文字種の実測用) ---
# 出典: Gunathilaka et al. (2025) "SinFUND and SinOCR: Benchmarks for Sinhala
#       Handwritten OCR and Template-Free Form Understanding", Research Square,
#       doi:10.21203/rs.3.rs-6976719/v1 / https://github.com/SriDoc/datasets
# 実体は Google Drive。SinOCR-handwritten.zip(5MB)内の data.csv が
# 画像→正解テキスト対応(train 907 / test 226 = 1,135 行)。
# CSV は data/corpus/sinocr/{train,test}/data.csv に追跡済み(再取得不要)。
# 画像実体が必要なら以下で取得(zip は gitignore):
#   uvx gdown "16X6lAzinZTIgiy6iw8Z0mLEyPyEwZJkL" -O "${DEST}/SinOCR-handwritten.zip"
#   unzip -o "${DEST}/SinOCR-handwritten.zip" -d "${DEST}/sinocr-images"
echo "SinOCR ground-truth CSVs are tracked in data/corpus/sinocr/ (no download needed)."
