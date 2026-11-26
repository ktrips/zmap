#!/usr/bin/env bash
# demo/ を dist/ にコピーし、API キーを config.js として書き出す(Firebase Hosting の公開ディレクトリ = dist)
set -euo pipefail
cd "$(dirname "$0")/.."

# ローカル用の .env があれば読み込む(コミットしない)
if [ -f .env ]; then set -a; . ./.env; set +a; fi
KEY="${GOOGLE_MAPS_API_KEY:-${VITE_GOOGLE_MAPS_API_KEY:-}}"
# Secret に貼り付けたときに入りやすい前後の空白・改行・引用符は取り除く
KEY="$(printf '%s' "$KEY" | tr -d '[:space:]"'"'")"

# キーは英数字・_・- のみ許可(JS への埋め込み事故防止)
if [ -n "$KEY" ] && ! [[ "$KEY" =~ ^[A-Za-z0-9_-]+$ ]]; then
  case "$KEY" in AIza*) head=yes;; *) head=no;; esac
  echo "GOOGLE_MAPS_API_KEY の形式が不正です(${#KEY} 文字、AIza で始まる: ${head}。英数字・_・- 以外が含まれています)" >&2; exit 1
fi

rm -rf dist
mkdir -p dist
cp -r demo/. dist/
printf 'window.ZMAP_CONFIG = { googleMapsApiKey: "%s" };\n' "$KEY" > dist/config.js

if [ -z "$KEY" ]; then
  echo "⚠ GOOGLE_MAPS_API_KEY が未設定です(ダミーデータのデモとして動作します)"
else
  echo "✔ API キーを dist/config.js に設定しました"
fi
echo "✔ dist/ を作成しました"
