# zmap — 郵便番号で場所を当てる地図ゲーム

ランダムな郵便番号の場所を、ストリートビューと地図のヒントが徐々に広がっていく中で当てる GeoGuessr 風ゲーム。
対応国: 日本 / アメリカ / イギリス / インド。

- ステータス: 🔍 設計中(MVP 未着手)
- 設計の詳細: [docs/design.md](docs/design.md)
- デモ: [demo/index.html](demo/index.html)(ダミーデータ・API キー不要。ブラウザで開くだけ)
- 由来: [ktrips/Aapp](https://github.com/ktrips/Aapp) のアイデア置き場(`ideas/zipcode-geoguessr.md`)から卒業

## ゲームの流れ(「ひろがれ!郵便番号」モード)
1. ランダムな郵便番号を1つ選ぶ。
2. 最初のヒントは、その郵便番号の範囲だけを塗った地図と、狭い視野のストリートビュー。
3. 時間経過か「広げる」ボタンで、郵便番号を**下の桁から1つずつ外し**、地図のハイライト範囲とストリートビューの視野を段階的に広げる。
4. 好きなタイミングで地図にピンを立てて回答。早く当てるほど高得点。

## 難易度
| 難易度 | 略称 | 当てる対象 |
|---|---|---|
| Very Easy | VE | 国 |
| Easy | Easy | 県(都道府県・州) |
| Mid | Mid | 市 |
| Difficult | Diff | 街の名前(町域) |
| Very Difficult | VD | **完全な住所**(番地・建物まで) |

## データ元
地図・ストリートビュー・郵便番号の位置情報はすべて **Google Maps Platform(API キー)** を使う。詳細は [docs/design.md](docs/design.md)。

## API キーの設定
ブラウザで使う Google Maps Platform のキーです(ブラウザに公開されるため、制限が必須)。

1. Google Cloud コンソールで **Maps JavaScript API / Geocoding API / Places API** を有効化し、キーを作成する。
2. キーに制限をかける:
   - **アプリケーションの制限:** HTTP リファラ(例: `https://zmap.ktrips.net/*`、`https://<project-id>.web.app/*`、`https://<project-id>.firebaseapp.com/*`、`http://localhost:*/*`)
   - **API の制限:** 上の3つのみ
3. ローカルでは `.env` にキーを書く(`.env` はコミットされない)。
   ```bash
   cp .env.example .env   # GOOGLE_MAPS_API_KEY=... を設定
   ```
4. `npm run build` で `dist/config.js` にキーが書き出される。キー未設定でもダミー5地点のデモとして動く(画面右上に「Maps APIキー: 設定済み/未設定」と表示)。
   キー設定時は、日本の郵便番号プール(`demo/index.html` の `ZIP_POOL`)からランダムに選び、Geocoding API で座標・都道府県・市区町村・町域に変換して毎回5問を出題する。取得に失敗した場合はダミー5地点にフォールバックする。

### Google Map モード(逆ジオコーディング)
キー設定済みなら地図は本物の Google Map になり、ピンを立てると Geocoding API で住所を逆引きして回答欄(国・県・市区町村・町名・番地)を自動入力します(「回答する」で判定)。キー未設定時は SVG のダミー地図で、固定地点の近くだけ簡易的に逆引きします。

## Firebase Hosting へのデプロイ
公開ディレクトリは `dist/`(`scripts/build.sh` が `demo/` から生成)。

### 手動デプロイ
```bash
# 1. .firebaserc の YOUR_FIREBASE_PROJECT_ID を自分のプロジェクト ID に書き換える
# 2. 初回のみログイン
npx firebase-tools@13 login
# 3. ビルド + デプロイ
npm run deploy
```
ローカル確認は `npm run serve`(Hosting エミュレータ)。

### GitHub Actions による自動デプロイ(`main` への push)
`.github/workflows/deploy.yml` を用意済み。リポジトリの Settings で次を設定する:
| 種類 | 名前 | 内容 |
|---|---|---|
| Secret | `FIREBASE_SERVICE_ACCOUNT` | Firebase のサービスアカウント鍵(JSON)。`firebase init hosting:github` で自動作成も可 |
| Secret | `GOOGLE_MAPS_API_KEY` | Maps のキー |
| Variable | `FIREBASE_PROJECT_ID` | Firebase のプロジェクト ID |

### カスタムドメイン(zmap.ktrips.net)
Firebase Hosting のカスタムドメインは、Firebase コンソールと DNS の操作が必要で、`firebase.json` やこのリポジトリのコードでは設定できない。次の手順で行う。

1. 先にデプロイを済ませる(`npm run deploy` か GitHub Actions)。
2. Firebase コンソール → **Hosting** → **ドメインを追加** → `zmap.ktrips.net` を入力。
3. コンソールに表示される DNS レコード(所有権確認用の TXT と、A レコード)を、`ktrips.net` の DNS(レジストラ/DNS プロバイダ)に追加する。値は必ずコンソールに表示されたものを使う。
4. 検証と SSL 証明書の発行を待つ(数分〜最大24時間程度)。完了すると https://zmap.ktrips.net で開ける。
5. **Maps API キーのリファラ制限に追加する(重要):** Google Cloud コンソール → 認証情報 → 該当キー → HTTP リファラに
   `https://zmap.ktrips.net/*` を追加する。忘れると、本番で地図が読み込めない。
