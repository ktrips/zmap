# Mapp(マップップ)— 地図と郵便番号当てゲーム

読みは「マップップ」。リポジトリ名は `zmap`、以前の名前は Zapper。

ランダムな場所を、ストリートビューと地図のヒントが徐々に広がっていく中で当てるゲーム。対応は日本とアメリカの2つで、最初の画面の国旗で切り替える。日本は日本語、アメリカは英語になる。

- ステータス: Web 版を公開中。iPhone アプリ(`ios/`)は TestFlight で配布している
- 公開先: https://zmap.ktrips.net(同じ内容が https://zmaprj.web.app)
- ゲーム本体: [demo/index.html](demo/index.html)(CSS と JavaScript を1ファイルにまとめている)。API キーなしで開くと練習用の問題で動く
- 初期の設計メモ: [docs/design.md](docs/design.md)(いまの実装と一致しない部分がある。遊べる内容は本書が正)

## 遊び方
1. 最初の画面で国旗とモードを選ぶ。郵便番号のモードでは、上1〜3桁を入れてからダーツを投げる。
2. 地球儀にダーツが刺さると、その場所のストリートビュー(狭い視野)と、地名を消した地図が出る。
3. 20秒ごと、または「ヒントを広げる」で、郵便番号を下の桁から1つずつ外す。地図の範囲とストリートビューの視野が段階的に広がる。
4. 好きなタイミングで答える。当てたときに見えていた桁数で得点が決まる。5問で最大50点。

| 見えている桁(日本 / アメリカ) | 7 / 5桁 | 6 / 4桁 | 5 / 3桁 | 4 / 2桁 | 3 / 1桁 | 外れ |
|---|---|---|---|---|---|---|
| 得点 | 10 | 8 | 6 | 4 | 2 | 0 |

回答後は、正解の場所を広域の地図で見せる。日本では都道府県の名産・名所([demo/meibutsu.js](demo/meibutsu.js))と、市区町村の紹介(Wikipedia の要約。取れなければ出さない)も出す。アメリカは英語版 Wikipedia の要約だけ。得点はこの端末の履歴に最新30件まで残る(localStorage。サーバーには送らない)。

モードと言語は1投目の前にだけ変えられる。選んだ内容は端末に覚えておく。

## モード

| 国旗 | モード | 答えるもの |
|---|---|---|
| 日本 | 都道府県当て | 都道府県を全件から選ぶ |
| 日本 | 郵便番号街当て | 上1〜3桁の範囲に入る市区町村か街の名前を入力する |
| アメリカ | States | 州を全件から選ぶ |
| アメリカ | Zipcodes | 上1〜3桁の範囲に入る city か town を入力する(大文字小文字・空白・記号の違いは無視) |

日本の郵便番号は7桁、アメリカは5桁。日本を選んでいるときは州当ては出さない。アメリカを選んでいるときは都道府県当ては出さない。

デイリー問題(`?daily=1`、または右上メニューの「今日の問題」)は、端末の日付から決まる日本の5問。同じ日は同じ問題になる。

### 郵便番号の範囲の見せ方
郵便番号街当てと Zipcodes では、桁を入れるたびにその範囲を地図に緑で描く。

- **日本**は市区町村の境界([demo/muni/](demo/muni/) のポリゴン)。上1〜3桁のどれでも、その桁で始まる郵便番号を含む市区町村をまとめて塗る。複数の3桁にまたがる市区町村は全体を塗り、名前に「(一部)」を付ける(地図では薄い色)。
- **アメリカ**は ZIP3 ごとの凸包([demo/us-zip3.json](demo/us-zip3.json))。区域線ではなく、おおよその範囲。

境界は正確な郵便区ではない。日本は、GeoNames の郵便番号の緯度経度を市区町村ポリゴンに当てて対応を作っているので、境目では誤差が出ることがある。郵便番号 100 のように離島を含む範囲は、表示のズームからは外している。

### 答えが分かってしまう情報は出さない
- 地図は地名・道路名・施設などのラベルを消したスタイルだけを使う(ラベルを出す `?mapstyle=off` は localhost でしか効かない)。
- ストリートビューは住所欄・道路名・撮影日を出さない。
- 地図のピンは推理用の目印で、ピンの住所は表示も自動入力もしない。
- 市区町村・街の名前は選択肢を並べず入力にする。「金沢」「金沢市」、漢数字と算用数字などの揺れは正解として扱う。都道府県を一緒に書いた場合は、それも合っている必要がある。

## データ
地図・ストリートビュー・出題地点は **Google Maps Platform** を使う。郵便番号の範囲を塗るデータは、次のスクリプトで手元に生成し、`demo/` にコミットしてある(実行のたびに再生成する必要はない)。

| スクリプト | 入力 | 出力 |
|---|---|---|
| [scripts/gen-zip3.mjs](scripts/gen-zip3.mjs) | 国土数値情報の市区町村境界(SmartNews 配布の GeoJSON)と GeoNames の `JP.txt` | [demo/zip3.json](demo/zip3.json)、[demo/muni/](demo/muni/) |
| [scripts/gen-us-zip3.mjs](scripts/gen-us-zip3.mjs) | GeoNames の `US.txt`(本土48州と DC) | [demo/us-zip3.json](demo/us-zip3.json) |

```bash
node scripts/gen-zip3.mjs /path/to/n03.json /path/to/JP.txt
node scripts/gen-us-zip3.mjs /path/to/US.txt
```

## API キー
ブラウザで使う Google Maps Platform のキー(ブラウザに出るため、制限が必須)。

1. Google Cloud コンソールで **Maps JavaScript API / Geocoding API / Places API** を有効化し、キーを作る。
2. キーに制限をかける。
   - **アプリケーションの制限:** HTTP リファラ(`https://zmap.ktrips.net/*`、`https://zmaprj.web.app/*`、`https://zmaprj.firebaseapp.com/*`、`http://localhost:*/*`)
   - **API の制限:** 上の3つのみ
3. ローカルでは `.env` に書く(`.env` はコミットしない)。
   ```bash
   cp .env.example .env   # GOOGLE_MAPS_API_KEY=... を設定
   ```
4. `npm run build` が `dist/config.js` にキーを書き出す。未設定でも練習用の問題と簡易地図で動く。

キーがあるときは、陸地から点を選び、近くにストリートビューがある地点だけを出題にする。正解の郵便番号と住所は、その地点の逆ジオコーディングで決める。集まらないときは練習用の問題に切り替える。

## デプロイ
公開ディレクトリは `dist/`。[scripts/build.sh](scripts/build.sh) が `demo/` をコピーし、`dist/config.js` を書く。

```bash
npx firebase-tools@13 login   # 初回のみ。プロジェクト ID は .firebaserc の zmaprj
npm run deploy                # build + hosting のみ
```

`main` への push では [.github/workflows/deploy.yml](.github/workflows/deploy.yml) が同じデプロイをする。リポジトリの Settings に次を置く。

| 種類 | 名前 | 内容 |
|---|---|---|
| Secret | `FIREBASE_SERVICE_ACCOUNT` | Firebase のサービスアカウント鍵(JSON) |
| Secret | `GOOGLE_MAPS_API_KEY` | Maps のキー |
| Variable | `FIREBASE_PROJECT_ID` | 任意。未設定なら `zmaprj` |

ローカル確認は `npm run serve`(Hosting エミュレータ)、または `demo/` で `python3 -m http.server`。言語とモードは `?lang=en`、`?mode=expert` のように付けて開ける。

### カスタムドメイン(zmap.ktrips.net)
Firebase コンソールの Hosting で `zmap.ktrips.net` を追加し、表示された TXT と A レコードを `ktrips.net` の DNS に置く。証明書の発行後に https://zmap.ktrips.net で開ける。Maps のキーのリファラに `https://zmap.ktrips.net/*` を足さないと、本番で地図が読み込めない。

## iPhone アプリ(`ios/`)
画面は https://zmap.ktrips.net を表示する。ホーム画面の名前は Mapp。ネイティブが受け持つのは次だけで、Web からは [demo/native.js](demo/native.js) 経由で呼ぶ。ブラウザでは共有だけ Web Share API かクリップボードで代用し、ほかは何もしない。

| 機能 | いつ |
|---|---|
| 振動 | ピンを立てたとき、ヒントが広がったとき、正解・不正解のとき |
| Game Center | 起動時にサインイン。終了時にスコアを送り、終了画面の「ランキング」で表示 |
| 共有シート | 終了画面の「結果を共有」(例: `Mapp 都道府県当て 32点 🟨🟩⬜🟩⬜`) |
| 通知 | 初めて遊び終えたときに1回だけ許可を聞き、毎朝9時にデイリー問題を知らせる |

アイコンの元は [demo/favicon.svg](demo/favicon.svg)(地図を推理する探偵)。App Store 用の PNG は透過を外して作る。

```bash
brew install xcodegen
cd ios && DEVELOPMENT_TEAM=XXXXXXXXXX xcodegen && open Zmap.xcodeproj
```

ビルドは GitHub Actions の `xcode-27` ランナー(Xcode 27)で行う。Xcode 26 に戻すときは、ワークフローの `runs-on` を `macos-26` に、Xcode を選ぶステップの `Xcode_27*` を `Xcode_26*` に変える。

バンドル ID は `net.ktrips.zmap`、Xcode のプロジェクト名は Zmap のままにしてある。変えると Game Center と TestFlight の既存の登録が引き継げない。App Store Connect に出る名前は、コンソールのアプリ情報で Mapp に合わせる。

### Apple 側の準備(初回のみ)
1. [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list) で App ID `net.ktrips.zmap` を作り、**Game Center** を有効にする。
2. App Store Connect で新規アプリ(バンドル ID `net.ktrips.zmap`)を作る。プライバシーポリシーは `https://zmap.ktrips.net/privacy.html`。
3. Game Center のランキングを2つ作る。スコアは合計点の10倍の整数で送るので、書式は「固定小数点・小数第1位」。
   - `zmap.daily`: 毎日リセット。デイリー問題だけ
   - `zmap.best`: 最高スコアを残す。すべてのゲーム
4. App Store Connect API のキー(アクセス: App Manager)を作り、`.p8` をダウンロードする。

### TestFlight
Actions の **ios-testflight** を実行する(ビルド番号は実行回数で増える)。`ios/` を変えて push すると **ios-build** が署名なしのビルド確認だけをする。

| 種類 | 名前 | 内容 |
|---|---|---|
| Secret | `ASC_KEY_ID` | API キーの ID |
| Secret | `ASC_ISSUER_ID` | Issuer ID |
| Secret | `ASC_KEY_P8` | `.p8` の中身 |
| Variable | `DEVELOPMENT_TEAM` | Team ID |
| Secret | `DIST_CERT_P12` | 配布用証明書(Apple Distribution)の p12 を base64 にしたもの |
| Secret | `DIST_CERT_PASSWORD` | 上の p12 のパスワード |
| Secret | `APPSTORE_PROFILE` | `net.ktrips.zmap` の App Store プロファイルを base64 にしたもの |

下の3つは、API キーにクラウド署名の権限がなく `Cloud signing permission error` になるときに使う(あれば手動署名、なければ自動署名)。証明書とプロファイルの期限は1年。
