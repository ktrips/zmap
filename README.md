# Zapper — 地図と郵便番号当てゲーム(リポジトリ名 zmap)

ランダムな郵便番号の場所を、ストリートビューと地図のヒントが徐々に広がっていく中で当てる GeoGuessr 風ゲーム。
対応国: 日本 / アメリカ / イギリス / インド。

- ステータス: 🔍 設計中(MVP 未着手)
- 設計の詳細: [docs/design.md](docs/design.md)
- 公開先: https://zmap.ktrips.net(ゲーム本体は [demo/index.html](demo/index.html)。API キーなしで開くと練習用の5問で動く)
- 由来: [ktrips/Aapp](https://github.com/ktrips/Aapp) のアイデア置き場(`ideas/zipcode-geoguessr.md`)から卒業

## ゲームの流れ(「ひろがれ!郵便番号」モード)
1. ランダムな郵便番号を1つ選ぶ。
2. 最初のヒントは、その郵便番号の範囲だけを塗った地図と、狭い視野のストリートビュー。
3. 時間経過か「広げる」ボタンで、郵便番号を**下の桁から1つずつ外し**、地図のハイライト範囲とストリートビューの視野を段階的に広げる。
4. 好きなタイミングで**都道府県**(モードによっては市区町村・番地)を答える。国はダーツが刺さった時点で決まり、答えには含まない。当てたときに見えていた郵便番号の桁数で得点が決まる。

| 見えている桁数 | 7桁 | 6桁 | 5桁 | 4桁 | 3桁 | 外れ |
|---|---|---|---|---|---|---|
| 得点 | 10 | 8 | 6 | 4 | 2 | 0 |

5問で最大50点。

### 答えが分かってしまう情報は出さない
- 地図は地名・道路名・施設などのラベルを消したスタイルだけを使う(ラベルを出す `?mapstyle=off` は localhost でしか効かない)。
- ストリートビューは住所欄・道路名・撮影日を出さない。
- 地図のピンは推理用の目印で、ピンの住所は表示も自動入力もしない。
- 市区町村・町名は選択肢を並べず入力にする(選択肢に正解が混ざると絞れてしまうため)。「金沢」「金沢市」、漢数字と算用数字などの揺れは正解として扱う。

## モード
1投目の前に選ぶ(ゲームの途中では変えられない。前回のモードを覚えておく)。得点表はどちらも同じ。

| モード | 答える欄 |
|---|---|
| 都道府県(デフォルト) | 都道府県(州)を全件から選ぶ |
| 市区町村 | 市区町村を入力(都道府県・郡・「市」「町」は省略可。都道府県を書いた場合はそれも合っている必要あり) |
| Very difficult | 市区町村 + 町名 + 丁目・番地(全部合っていて当たり) |

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
   キー設定時は、日本の陸地からランダムに点を選び、近くに Google のストリートビューがある地点だけを出題にする(1回の読み込みでストリートビューの検索が最大48回、逆ジオコーディングがその成功数ぶん)。正解の郵便番号と住所は、その地点を逆ジオコーディングして決める。うまく集まらないときは郵便番号プール(`ZIP_POOL`)、それも失敗したら練習用の5問に切り替える。

### Google Map モード(逆ジオコーディング)
キー設定済みなら地図は本物の Google Map になり、ピンを立てると Geocoding API で住所を逆引きして回答欄(国・県・市区町村・町名・番地)を自動入力します(「回答する」で判定)。キー未設定時は SVG のダミー地図で、固定地点の近くだけ簡易的に逆引きします。

## Firebase Hosting へのデプロイ
公開ディレクトリは `dist/`(`scripts/build.sh` が `demo/` から生成)。

### 手動デプロイ
```bash
# 1. プロジェクト ID は .firebaserc に設定済み(zmaprj)
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
| Variable | `FIREBASE_PROJECT_ID` | Firebase のプロジェクト ID(任意。未設定なら `zmaprj`) |

デプロイ先は https://zmaprj.web.app(カスタムドメイン設定後は https://zmap.ktrips.net)。

### カスタムドメイン(zmap.ktrips.net)
Firebase Hosting のカスタムドメインは、Firebase コンソールと DNS の操作が必要で、`firebase.json` やこのリポジトリのコードでは設定できない。次の手順で行う。

1. 先にデプロイを済ませる(`npm run deploy` か GitHub Actions)。
2. Firebase コンソール → **Hosting** → **ドメインを追加** → `zmap.ktrips.net` を入力。
3. コンソールに表示される DNS レコード(所有権確認用の TXT と、A レコード)を、`ktrips.net` の DNS(レジストラ/DNS プロバイダ)に追加する。値は必ずコンソールに表示されたものを使う。
4. 検証と SSL 証明書の発行を待つ(数分〜最大24時間程度)。完了すると https://zmap.ktrips.net で開ける。
5. **Maps API キーのリファラ制限に追加する(重要):** Google Cloud コンソール → 認証情報 → 該当キー → HTTP リファラに
   `https://zmap.ktrips.net/*` を追加する。忘れると、本番で地図が読み込めない。

## デイリー問題
`?daily=1` を付けて開くと、端末の日付から決まる5問を出題する(同じ日は全員同じ問題)。画面右上の「📅 今日の問題」から切り替えられる。

## iPhone アプリ(`ios/`)
画面は https://zmap.ktrips.net をそのまま表示し、ネイティブは次だけを受け持つ。Web からは `demo/native.js` 経由で呼び、ブラウザで開いたときは何もしない(共有だけは Web Share API かクリップボードで代わりにする)。

| 機能 | いつ |
|---|---|
| 振動 | ピンを立てたとき・ヒントが広がったとき(軽く)、正解・不正解のとき |
| Game Center | 起動時にサインイン。ゲーム終了時にスコアを送り、終了画面の「ランキング」で表示 |
| 共有シート | 終了画面の「結果を共有」(例: `zmap デイリー 2026-11-26 23.4点 🟨⬜🟩🟩⬜`) |
| 通知 | 初めて遊び終えたときに1回だけ許可を聞き、毎朝9時にデイリー問題を知らせる。タップでデイリー問題を開く |

アイコン: 元は [demo/favicon.svg](demo/favicon.svg)(鹿撃ち帽とパイプの虫眼鏡で地図を推理する探偵)。PNG は `rsvg-convert -w 1024 -h 1024 demo/favicon.svg | magick - -alpha remove -alpha off PNG24:ios/Sources/App/Assets.xcassets/AppIcon.appiconset/icon-1024.png` のように作る(App Store のアイコンは透過なし)。

ローカルで開く: `brew install xcodegen && cd ios && DEVELOPMENT_TEAM=XXXXXXXXXX xcodegen && open Zmap.xcodeproj`

### Apple 側の準備(初回のみ)
1. [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list) で App ID `net.ktrips.zmap` を作り、**Game Center** を有効にする。
2. App Store Connect で新規アプリ(バンドル ID `net.ktrips.zmap`)を作る。プライバシーポリシーの URL は `https://zmap.ktrips.net/privacy.html`。
3. App Store Connect → アプリ → **Game Center** でランキングを2つ作る。スコアは合計点の10倍の整数で送るので、書式は「固定小数点・小数第1位」にする。
   - `zmap.daily`: 繰り返し(毎日リセット)。デイリー問題のスコアだけが入る
   - `zmap.best`: 通常(最高スコアを残す)。すべてのゲームのスコアが入る
4. App Store Connect → ユーザとアクセス → 統合 → **App Store Connect API** でキー(アクセス: App Manager)を作り、`.p8` をダウンロードする。

### TestFlight に配信する
リポジトリの Settings → Secrets and variables → Actions に次を登録し、Actions → **ios-testflight** → Run workflow で実行する(ビルド番号は実行回数で自動的に増える)。`ios/` を変更して push すると **ios-build** が署名なしのビルド確認だけを行う。

| 種類 | 名前 | 内容 |
|---|---|---|
| Secret | `ASC_KEY_ID` | API キーの ID |
| Secret | `ASC_ISSUER_ID` | Issuer ID |
| Secret | `ASC_KEY_P8` | `.p8` ファイルの中身 |
| Variable | `DEVELOPMENT_TEAM` | Apple Developer の Team ID |
| Secret | `DIST_CERT_P12` | 配布用証明書(Apple Distribution)の p12 を base64 にしたもの |
| Secret | `DIST_CERT_PASSWORD` | 上の p12 のパスワード |
| Secret | `APPSTORE_PROFILE` | `net.ktrips.zmap` の App Store プロファイルを base64 にしたもの |

下の3つは、API キーにクラウド署名の権限がなく `Cloud signing permission error` で書き出しが失敗するときに使う(あれば手動署名、なければ自動署名)。証明書とプロファイルは App Store Connect API で作成済みで、元のファイルは `~/.appstoreconnect/zmap-signing/` にある。プロファイルの期限は証明書と同じ1年。
