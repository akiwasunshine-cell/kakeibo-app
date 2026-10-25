# CLAUDE.md

このファイルは、このリポジトリで作業する Claude Code へのガイドです。

## プロジェクト概要

レシート読み込み家計簿アプリ（kakeibo-app）。レシート画像を Claude API で読み取り、商品・金額・日付をカテゴリ別に集計してグラフ表示する。

## 技術スタック・構成

npm workspaces のモノレポ構成。

- `server/` … Node.js + Express のバックエンド。`POST /api/receipts/analyze` で画像を受け取り、Claude API（`@anthropic-ai/sdk`、モデル `claude-haiku-5-5`）で読み取る。応答は Zod スキーマによる構造化出力（`messages.parse` + `zodOutputFormat`）。
- `client/` … React + Vite のフロントエンド。Chart.js（react-chartjs-2）で円グラフ・棒グラフを表示。データはローカルストレージ（キー `kakeibo-receipts`）に保存。
- カテゴリ一覧は `server/index.js` と `client/src/categories.js` の両方に定義しているため、変更時は両方を揃えること。
- APIキーはブラウザに渡さない。Claude API の呼び出しは必ずサーバー経由にする。

## コマンド

- `npm install` … 依存パッケージのインストール
- `npm run dev` … サーバー（:3001）とクライアント（:5173）を同時起動。`/api` は Vite のプロキシでサーバーへ転送
- `npm run build` … クライアントを `client/dist` にビルド
- `npm start` … サーバーを起動し、ビルド済みクライアントも配信

APIキーはプロジェクト直下の `.env`（`.env.example` をコピー）に `ANTHROPIC_API_KEY` として設定する。

## 開発方針

- コード内のコメント・UI 文言は日本語を基本とする。
- 金額は浮動小数点の誤差を避けるため、整数（円単位）で扱う。
- 日付はタイムゾーンを意識して扱う（基本は日本時間 / Asia/Tokyo）。
- 変更は小さく保ち、1 つの変更で 1 つの目的を達成する。

## Git 運用ルール

- **コードを変更するたびに、コミットして GitHub にプッシュすること。**
  1. `git status` / `git diff` で変更内容を確認する
  2. 関係するファイルだけを `git add` する（`git add -A` で不要なファイルを含めない）
  3. 変更内容がわかるコミットメッセージでコミットする
  4. `git push` で GitHub（`origin`）にプッシュする
- コミットメッセージは日本語で、1 行目に変更の要約を書く（例: `支出入力フォームにカテゴリ選択を追加`）。
- プッシュ前に、テストやビルドが用意されていれば実行して通ることを確認する。
- `.env` や認証情報などの秘密情報は絶対にコミットしない（`.gitignore` に追加する）。
- `git push --force` や履歴の書き換えは、ユーザーの明示的な指示がない限り行わない。
- プッシュに失敗した場合（リモート未設定・認証エラー・競合など）は、勝手に解決せずユーザーに報告する。
