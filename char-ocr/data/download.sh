#!/usr/bin/env bash
# Sinhala 手書き文字データセットを Kaggle から取得する。
#
# データ実体は .gitignore 済み。クローン後はこのスクリプトで再取得する。
#
# 前提:
#   - kaggle CLI がインストール済み (`pip install kaggle` / `uv tool install kaggle`)
#   - ~/.kaggle/kaggle.json に API トークンが配置済み
#     (https://www.kaggle.com/settings -> Create New Token)
#
# データセット: Sinhala Letter and Modifications (sathiralamal/sinhala-letter-454)
#   - 454 クラス (基本字 + 修飾子 pilla を別クラス)
#   - 80x80 グレースケール JPEG
#   - train 87,141 / valid 10,896 / test 10,896 枚
#   - License: CC BY 4.0 (要クレジット表示)
#   - 構造: Dataset454/{train,valid,test}/{class_id}/*.jpg
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${SCRIPT_DIR}/kaggle-sinhala"

if [ -d "${DEST}/Dataset454" ]; then
  echo "Already downloaded: ${DEST}/Dataset454"
  exit 0
fi

echo "Downloading sathiralamal/sinhala-letter-454 to ${DEST} ..."
kaggle datasets download -d sathiralamal/sinhala-letter-454 -p "${DEST}" --unzip

echo "Done: ${DEST}/Dataset454"
