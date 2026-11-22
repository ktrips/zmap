# zmap — 郵便番号で場所を当てる地図ゲーム

ランダムな郵便番号の場所を、ストリートビューと地図のヒントが徐々に広がっていく中で当てる GeoGuessr 風ゲーム。
対応国: 日本 / アメリカ / イギリス / インド。

- ステータス: 🔍 設計中(MVP 未着手)
- 設計の詳細: [docs/design.md](docs/design.md)
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

## セットアップ(予定)
```bash
cp .env.example .env   # VITE_GOOGLE_MAPS_API_KEY を設定
```
