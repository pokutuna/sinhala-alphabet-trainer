---
source: https://www.kaggle.com/code/sathiralamal/example-usage-of-sinhala-handwritten-dataset
author: sathiralamal (Kaggle)
title: Example usage of Sinhala handwritten dataset
fetched: 2026-06-07
---

# Kaggle 公式サンプル: 454 データセットの使い方

採用データセット [Sinhala Letter and Modifications (454)](./datasets.md) の作者本人が
公開している「使い方」notebook の内容まとめ。**TensorFlow/Keras で小型 CNN を組み、
`ImageDataGenerator` でフォルダから読み込んで 454 クラス分類を学習する**最小例。

このプロジェクトは [ブラウザ実行(ONNX/tfjs)](./browser-runtime.md) と
[部品分解ヘッド](./model-design.md) を狙うので最終構成は別物だが、
**「データの読み方・前処理パラメータ・作者公認の入力サイズ」の一次情報**として価値がある。

## 全体の流れ

1. `ImageDataGenerator().flow_from_directory()` で train/valid/test を読み込む(grayscale, 80×80)
2. データ拡張は `Resizing + Rescaling(1/255)` のみ実質有効(回転は定義だけして未使用)
3. 5 層 Conv の小型 CNN を `Sequential` で構築
4. `Adam(lr=1e-5)` + `categorical_crossentropy` で 50 epoch 学習
5. 学習曲線を描画 → `.h5` 保存 → test で `evaluate`

## データの読み方(ここが一次情報)

```python
train_path = '/kaggle/input/sinhala-letter-454/Dataset454/train'
valid_path = '/kaggle/input/sinhala-letter-454/Dataset454/valid'
test_path  = '/kaggle/input/sinhala-letter-454/Dataset454/test'

img_height = 80
img_weight = 80   # ※ typo。実際は width

train_batches = ImageDataGenerator().flow_from_directory(
    directory=train_path, target_size=(80,80), batch_size=32, color_mode="grayscale")
# valid/test も同様。test だけ shuffle=False
```

- **作者推奨の入力サイズ = 80×80 grayscale**。[datasets.md](./datasets.md) の実測(80×80 JPEG)と一致。
  リサイズ不要でそのまま使える、というのが作者の意図。
- `ImageDataGenerator()` に**正規化引数を渡していない**(rescale なし)。
  代わりにモデル内の `Rescaling(1./255)` 層で正規化している。二重正規化はしていない。
- ディレクトリ構造前提も明記:「train/test/valid に分けたフォルダで読む」。
  → フォルダ名(クラス ID)順 = Keras の `class_indices` 順で one-hot される。

## クラスラベル配列(`sinhala_classes`)— 要注意

notebook 内に長さ **454** の文字列配列がハードコードされている。
「配列 index = クラスラベル番号」と作者は書いているが、**素直には使えない**。

- **34 件が Singlish フォールバック**(`hda`, `,da`, `j%da`, `Yda`, `Õda`, `Kda` …)。
  フォント未対応で Unicode 表示できなかった合字を、**Wijesekara キーボードのキーコード文字列のまま**置いてある。
  notebook も markdown で「Unicode 表示できないものは Singlish 値をラベルにし、
  使うときは別レイヤで Unicode 変換せよ」と注意している。
- **重複ラベルが 4 件**: `බ්‍රෝ` ×2 / `රැ` ×2 / `ළූ` ×2 / `ෆූ` ×2(タイプミス起因と思われる)。
- 先頭に空白が混じる(`"ද "`, `" ඳ්"` など)エントリも散見。

→ **この配列はそのまま信用しない**。クラス↔文字の対応はこのプロジェクト側で
[decomposition-table.md](./decomposition-table.md)(`TRUE_LABEL`)として作り直し済みなので、そちらを正とする。

## データ拡張

```python
resize_and_rescale = tf.keras.Sequential([
    tf.keras.layers.Resizing(80, 80),
    tf.keras.layers.Rescaling(1./255),
])
data_augmentation = tf.keras.Sequential([
    tf.keras.layers.RandomRotation(0.1, fill_mode="constant", seed=20),
])
```

- `data_augmentation`(±0.1 rad 回転)は**定義されているがモデルでコメントアウト**され、
  実際の学習には効いていない。可視化セルで効果を表示するだけ。
- 実効的に効くのは `Resizing + Rescaling` のみ。

## モデル構造(小型 CNN)

```python
Sequential([
    Input(shape=(80,80,1)),
    resize_and_rescale,                              # data_augmentation はコメントアウト
    Conv2D(32, (7,7), 'relu', padding='same'),
    Conv2D(32, (7,7), 'relu', padding='same'),
    MaxPool2D(pool_size=(8,8), strides=(2,2)),       # ← pool 8×8 / stride 2 と大きめ
    Conv2D(64, (7,7), 'relu', padding='same'),
    Conv2D(64, (7,7), 'relu', padding='same'),
    MaxPool2D(pool_size=(2,2), strides=(2,2)),
    Conv2D(128, (7,7), 'relu', padding='same'),
    Flatten(),
    Dense(1000, 'relu'),
    Dense(454, 'softmax'),                            # len(sinhala_classes)
])
model.compile(optimizer=Adam(learning_rate=0.00001),
              loss='categorical_crossentropy', metrics=['accuracy'])
```

- **7×7 という大きめカーネルを多用**、BatchNormalization はコメントアウトで未使用。
- `Flatten → Dense(1000)` で全結合が重い。パラメータ数は大きめ。
- **学習率 1e-5 は小さい**。これで 50 epoch なので収束は遅め。

## 学習・評価

```python
history = model.fit(x=train_batches, steps_per_epoch=len(train_batches),
                    validation_data=valid_batches, epochs=50, verbose=0)
model.save('model_test.h5')
model.evaluate(test_batches)
```

- 学習後に train/valid の accuracy・loss 曲線を matplotlib で描画。
- **最終精度(test, `model.evaluate`)**: `accuracy ≈ 0.952 / loss ≈ 0.508`。
  - Kaggle ウェブ上の実行済みバージョンに表示される出力(`341/341 ... accuracy: 0.9519 - loss: 0.5080`)。
    341 step × batch 32 ≒ 10,912 枚で [datasets.md](./datasets.md) の test 10,896 枚とほぼ一致する。
  - 注意: `kaggle kernels pull` で落とす `.ipynb` ソースには**出力セルが含まれない**ため、CLI 版からはこの数値は読めない(Web 表示でのみ確認できる)。
- → **下限ベースラインで test 95% 程度**。[datasets.md](./datasets.md) の見通し(小型 CNN で 90%台後半)とも整合。
  loss 0.5 はまだ高めで、チューニング(後述)で上積みの余地が大きい。

## このプロジェクトへの示唆

- **80×80 grayscale をそのまま入力**にしてよい(作者公認・実測一致)。リサイズ前処理は不要。
- 正規化は `/255` だけで足りる(サンプルも実質これだけ)。
- ハードコードのクラス配列は**使わない**。Singlish 混入・重複・空白ノイズがある。
  → [decomposition-table.md](./decomposition-table.md) を正とする。
- この CNN は**ベースラインの下限で test accuracy ≈ 95%**(loss 0.5 と高め)。
  7×7 カーネル多用・lr 1e-5・拡張ほぼ無し・BN 無しとチューニング余地が大きいので、
  性能の参考にはなっても設計の手本にはしない。本プロジェクトの設計は [model-design.md](./model-design.md)。
- ライブラリは TensorFlow/Keras 前提。本プロジェクトのブラウザ推論は
  [browser-runtime.md](./browser-runtime.md)(ONNX / tfjs)で別途検討。
