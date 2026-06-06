# 1文字単位 手書き文字認識 — ブラウザ実行環境の調査

手書きキャンバスで書いた 1 文字を認識する ML 機能の、**ブラウザでの推論実行環境**に関する技術選定と調査結果をまとめる。訓練(training)側の詳細やデータ収集の段階計画は別途。ここは「学習済みモデルをどうブラウザで動かすか」に絞る。

調査時点: 2026-06。情報は陳腐化しうるので、採用前に再確認すること。

## スコープと前提

- **対象は当面シンハラのみ**。ただし関連コンポーネント(キャンバス入力・前処理・推論ラッパ・スコア表示)は**言語非依存**に設計し、将来の日本語(かな + 常用漢字)モードへ差し替えで拡張できる形にする。
- **入力は手書き**(Pointer Events でストローク取得)。画像 OCR ではない。
- **このアプリ自体は推論のみ**を担当。訓練は別(PyTorch を想定、別リポジトリ or `training/`)。アプリは成果物の `.onnx` を受け取るだけの疎結合にする。
- デプロイ先は **GitHub Pages**(SPA mode, base path 自動検出済み)。

## 結論

| 項目 | 採用 | 理由 |
| --- | --- | --- |
| 推論ランタイム | **onnxruntime-web (ORT Web)** | フレームワーク非依存。PyTorch 訓練 → ONNX → ブラウザの可搬パス。Microsoft が活発に開発 |
| 実行プロバイダ (EP) | **WASM (SIMD)、シングルスレッド** | 1 文字 CNN は CPU で十分。GitHub Pages の制約(後述)とも整合。WebGPU は当面不要 |
| 入力解像度 | **64〜128px グレースケール** | 128 で上限。64〜96 でも足りることが多い |
| モデル | **小型 CNN(数十万〜数百万 param)** | 量子化すれば数 MB。CPU で数 ms/推論 |

WebGPU は「将来 embedding 方式や日本語の漢字数千クラスに拡張して重くなったら足す」予備という位置づけ。**現スコープでは載せない**(バンドルも軽くなる)。

## ランタイム選定の比較

| 候補 | 評価 | 備考 |
| --- | --- | --- |
| **ONNX Runtime Web** | ✅ 採用 | PyTorch/TF どちらで訓練しても `.onnx` 経由で載る。WebGPU→WASM 自動フォールバックを持つ。標準フォーマットで可搬性最高 |
| TensorFlow.js | ⚠️ 回避 | WebGPU backend の最終リリースが約 1 年前(4.22.0)で停滞。Google の投資は JAX / LiteRT.js へ移行。新規採用は非推奨 |
| WebNN API | ⏳ 時期尚早 | 2026-01 に W3C Candidate Recommendation 入りも、Chrome/Edge の実験的サポートのみ・GPU/NPU はフラグ必須。本番不可。将来 ORT Web のバックエンドとして透過的に効くのを待つ |
| LiteRT.js / Transformers.js | — 用途違い | LiteRT.js は未成熟。Transformers.js は内部 ORT Web の Transformer/LLM 向け高レベル API で、自前 CNN には過剰 |

## なぜ CPU(WASM)で十分か

1 文字認識の計算量は小さく、GPU を使うほどでもない。

- 入力 128×128×1 = 16,384 画素。MobileNet の 224×224×3 = 150,528 の **約 1/9**。手書き 1 文字は情報が単純で 64〜96px でも足りることが多い。
- モデルは畳み込み 3〜5 層 + FC 程度、演算量は数十〜数百 MFLOPs/推論(MobileNet 同等以下)。
- WASM SIMD で **1 推論あたり数 ms〜十数 ms** のオーダー。
- 手書きは「書き終わったら判定」なので毎フレーム推論する必要がない。1 回 10ms でも体感は瞬時。

> ボトルネックはむしろ**前処理**(ストローク → 128×128 へのラスタライズ・正規化・中心化)になりがち。判定タイミングを描き終わり等に絞れば無視できる。

## ORT Web の実行プロバイダ フォールバック

ORT Web は初期化時に環境を検出し、使える最速の手段へ自動で落とす。

```
WebGPU 使える?  ─Yes→ WebGPU (GPU, 最速)
   │No
   ▼
WASM(SIMD + マルチスレッド)使える?  ─Yes→ CPU 高速版
   │No
   ▼
WASM(プレーン)  ← どのブラウザでも動く最終フォールバック
```

- **WASM が CPU 実行のデフォルト**。WebGPU が無くても必ずここで動く = 可搬性の保証。
- 本アプリは EP を WASM に固定して問題ない(WebGPU を載せない構成にする)。

## WebGPU の対応状況(2026、参考)

将来 WebGPU を足す判断の参考に記録。現スコープでは使わない。

| 環境 | 対応率/状況 |
| --- | --- |
| デスクトップ全体 | ~85%(Chrome/Edge 113+・Firefox 147・Safari 26 標準対応) |
| モバイル全体 | ~60〜71% |
| iOS/iPadOS Safari | **iOS 26 で標準対応**(長年の最大の穴が解消)。古い iOS は非対応 |
| Android Chrome | 約 78% のユーザーが利用可(Adreno 600 系/Mali-G78 以降が必要)。古い・廉価端末は非対応 |
| Firefox | Win/macOS 対応。Linux/Android は 2026 中対応予定 |

非対応が残る層: 古い iOS、GPU が古い/廉価な Android、Firefox の Android/Linux、企業の古い環境。**いずれも WASM フォールバックでカバーされる。**

## GitHub Pages 固有の懸念と対策

結論: **動く。ただし以下 3 点を事前に潰す。**

### ① WASM ファイルの配信パス(最重要・最もハマる)

ORT Web は `.wasm` を実行時に別途フェッチする。GitHub Pages は `https://pokutuna.github.io/sinhala-alphabet-trainer/` のように**リポジトリ名のサブパス配下**で配信されるため、取得先が `/ort-wasm-*.wasm`(ルート)を指すと **404** になる。

- 本プロジェクトは `vite.config.ts` で base path を `GITHUB_REPOSITORY` から自動検出済み。
- **対策**: `ort.env.wasm.wasmPaths` を base path 込みで設定する、または `.wasm` を `public/` に同梱して相対パスで配信する。
- 「ローカルでは動くが Pages で WASM だけ 404」が定番事故。**最初に検証すべき唯一の "やってみないと分からない" ポイント**。

### ② COOP/COEP ヘッダが付けられない → マルチスレッド不可

GitHub Pages は任意のレスポンスヘッダを設定できない。WASM マルチスレッドに必要な `crossOriginIsolated`(COOP/COEP)を満たせない。

- → **シングルスレッド WASM になる**。
- 1 文字 CNN は **SIMD だけで CPU 十分**なので実害ほぼなし。
- ORT Web は自動でシングルスレッドにフォールバックする(クラッシュしない)。`ort.env.wasm.numThreads = 1` を明示しておくと無駄な分岐が減って安心。

### ③ モデルファイル(.onnx)の配置とサイズ

- `public/models/` に置けば静的アセットとして base path 込みで配信される。
- GitHub Pages の目安は 1 ファイル < 100MB、リポジトリ全体 ~1GB。小型 CNN は**数 MB** で全く問題なし。int8 量子化でさらに縮む。

### 問題にならない点

- **SPA ルーティング**: 既に SPA mode 稼働実績あり。ORT とは無関係。
- **Vite バンドル**: `onnxruntime-web` は npm 配布で Vite と相性良好。
- **CORS**: 同一オリジン(自分の Pages)から WASM/モデルを配信する限り発生しない。

## 想定アーキテクチャ(言語非依存の切り口)

```
┌─────────────────────────────────────────┐
│ UI 層 (React)                            │  言語非依存
│  CanvasInput / ScoreDisplay / Feedback   │
├─────────────────────────────────────────┤
│ 認識コア (言語非依存)                     │
│  ・ストローク取得 (pointer events)        │
│  ・正規化 / リサンプリング / ラスタライズ │
│  ・推論ラッパ (onnxruntime-web)           │
│  ・スコアラ / 確信度                      │
├─────────────────────────────────────────┤
│ Recognizer インターフェース ◀━ 差し替え点 │
├─────────────────────────────────────────┤
│ 言語パック (言語固有)                     │
│  シンハラ: 字種定義 + モデル/お手本        │  今回
│  日本語  : 〃 (後で追加)                  │  枠のみ
└─────────────────────────────────────────┘
```

`Recognizer` インターフェースを 1 枚噛ませることで、言語追加もフェーズ移行(テンプレ照合 → ML)もこの裏側に閉じ込める。

## 次のアクション(リスク順)

1. **ダミーの小さい `.onnx` で「Pages 上で推論が走るか」を先に通す** — 上記 ① のリスクを最初に消す。
2. Stage 0: データ生成・前処理(入力解像度 64/96/128 の決定はここで)。
3. 以降の訓練段階(小型 CNN → データ拡張 → ブラウザ推論 → embedding)は別ドキュメントで管理。

## 確定した技術スタック

- 訓練: **PyTorch → ONNX エクスポート**
- 推論: **onnxruntime-web(WASM/SIMD、シングルスレッド)**
- 配信: **GitHub Pages**(WASM パスを base path 込みで解決、`public/models/` に `.onnx` 配置)
- 入力: **64〜128px グレースケール、小型 CNN**

## 参考

- [Using WebGPU | onnxruntime](https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html)
- [The 'env' Flags and Session Options | onnxruntime](https://onnxruntime.ai/docs/tutorials/web/env-flags-and-session-options.html)
- [ONNX Runtime Web—running your ML model in browser | Microsoft](https://opensource.microsoft.com/blog/2021/09/02/onnx-runtime-web-running-your-machine-learning-model-in-browser/)
- [WebGPU | Can I use](https://caniuse.com/webgpu)
- [WebGPU is now supported in major browsers | web.dev](https://web.dev/blog/webgpu-supported-major-browsers)
- [News from WWDC25: WebKit in Safari 26 beta | WebKit](https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/)
- [AI In Browser With WebGPU: 2025 Developer Guide](https://aicompetence.org/ai-in-browser-with-webgpu/)
