<div align="center">
  <img src="https://raw.githubusercontent.com/lmy414/ai-girl-stickers/main/dist/avatar.png" width="112" alt="Blue Big Fish サイトアイコン">
  <h1>Blue Big Fish · 公開画像アーカイブ</h1>
  <p><strong>Blue Big Fish の画像公開、投稿、削除依頼の窓口</strong></p>
  <p>
    <a href="https://xn--pssy23gqgbz2d718b.com/"><img src="https://img.shields.io/website?url=https%3A%2F%2Fxn--pssy23gqgbz2d718b.com%2F&style=for-the-badge&label=site&up_message=online&down_message=offline" alt="サイトのオンライン状態"></a>
    <a href=".github/ISSUE_TEMPLATE/sticker-submission.yml"><img src="https://img.shields.io/badge/submissions-GitHub%20Issue%20Forms-2f81f7?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Issue フォームから投稿"></a>
    <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/formats-PNG%20%7C%20JPG%20%7C%20GIF%20%7C%20WebP%20%7C%20APNG-6f42c1?style=for-the-badge" alt="PNG、JPG、GIF、WebP、APNG に対応"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/docs%20license-MIT-2ea44f?style=for-the-badge" alt="文書は MIT ライセンス"></a>
  </p>
  <p>
    <a href="README.md">简体中文</a> ·
    <a href="README.en.md">English</a> ·
    <strong>日本語</strong>
  </p>
</div>

---

このリポジトリには、Blue Big Fish で使用する投稿原画、派生画像、公開画像素材を保存します。GitHub からの投稿と削除依頼の窓口も兼ねています。サイト、構造化データ、アプリケーションコードは別リポジトリ [lmy414/bluedafeiyu](https://github.com/lmy414/bluedafeiyu) にあります。

## プロジェクト概要

| 項目 | 内容 |
| --- | --- |
| 役割 | 公開画像アーカイブと GitHub 投稿窓口 |
| 原画の取得 | 作品詳細ページから GitHub Raw 経由でダウンロード |
| 投稿フォーム | GitHub Issue Forms |
| 対応形式 | PNG、JPG、GIF、WebP、APNG |
| 画像の権利 | 原作者に帰属。作品ごとの出典とライセンスを確認 |

## 主なリンク

| 用途 | リンク |
| --- | --- |
| オンラインで閲覧 | <https://xn--pssy23gqgbz2d718b.com/> |
| 作品を投稿 | <https://github.com/lmy414/ai-girl-stickers/issues/new?template=sticker-submission.yml> |
| クレジット修正・削除依頼 | <https://github.com/lmy414/ai-girl-stickers/issues/new?template=takedown-request.yml> |
| サイトのソース | <https://github.com/lmy414/bluedafeiyu> |

## リポジトリの内容

`dist/` はサイトが参照するコンテンツ用ディレクトリです。ビルド生成物ではありません。サイトのビルド時に、画像とテンプレートをこの固定パスから同期します。

| パス | 内容 |
| --- | --- |
| `.github/ISSUE_TEMPLATE/` | 投稿、クレジット修正、削除依頼のフォーム |
| `dist/submissions/originals/` | 投稿原画。オンラインでは GitHub Raw からダウンロード |
| `dist/submissions/large/` | 詳細ページ用の派生画像。長辺 1280 ピクセル以下の WebP |
| `dist/submissions/previews/` | 一覧と検索で使う約 480 ピクセルの WebP サムネイル |
| `owner-picks/` | 「サイト運営者のおすすめ」用の原画 |
| `dist/owner-picks/previews/` | 「サイト運営者のおすすめ」用のプレビュー |
| `dist/data/blue-fish/previews/` | 最初の Blue Big Fish アーカイブ作品のプレビュー |
| `blue-fish-originals/` | 最初の収録作品のうち、このリポジトリで管理する原画。それ以外は [EDMOK/blue-fish-archive](https://github.com/EDMOK/blue-fish-archive) にあります |
| `assets/` | サイトアイコンの元素材 |
| `dist/favicon.ico`、`dist/favicon.png`、`dist/avatar.png`、`dist/qq-group.png` | サイトアイコン、アバター、QQ グループの QR コード |

対応形式、容量、内容のルールは [`CONTRIBUTING.md`](CONTRIBUTING.md) を参照してください。

## ブランド素材

このリポジトリですべての公開サイトアイコンを管理します。README のヘッダーでは `dist/avatar.png` を使用しています。

| ファイル | サイズ | 用途 |
| --- | --- | --- |
| [`dist/avatar.png`](https://github.com/lmy414/ai-girl-stickers/blob/main/dist/avatar.png) | 96 × 96 | サイトのアバターと README ロゴ |
| [`dist/favicon.ico`](https://github.com/lmy414/ai-girl-stickers/blob/main/dist/favicon.ico) | 256 × 256 | ブラウザータブのアイコン |
| [`dist/favicon.png`](https://github.com/lmy414/ai-girl-stickers/blob/main/dist/favicon.png) | 512 × 512 | 高解像度のサイトアイコン |
| [`dist/qq-group.png`](https://github.com/lmy414/ai-girl-stickers/blob/main/dist/qq-group.png) | 518 × 518 | QQ グループの QR コード |

## 画像パス

サイト、作品詳細ページ、外部からの参照は、固定の Raw URL で原画を取得します。収録後の画像は名前変更や移動をしないでください。変更すると、サイト上の画像、外部リンク、既存のコメントスレッドが壊れる可能性があります。

```text
https://raw.githubusercontent.com/lmy414/ai-girl-stickers/main/dist/submissions/originals/<キャラクター>/<ファイル名>
https://raw.githubusercontent.com/lmy414/ai-girl-stickers/main/owner-picks/<ファイル名>
```

閲覧とダウンロードには、できるだけオンラインサイトを使用してください。原画を引用する場合は、作品詳細ページに表示されるリンクを優先してください。

## 投稿と削除依頼

投稿に fork や Git の知識は必要ありません。投稿フォームを開き、画像を直接アップロードして、作品名とキャラクターを入力します。任意で一言説明を追加できます。タグ、カテゴリ、出典、ライセンスは管理者が審査時に補充します。

PNG、JPG、GIF、WebP、APNG に対応しています。1 枚あたり 10 MB 以下を推奨します。AI キャラクターと無関係な一般スタンプ、実写の人物肖像、未許諾の商用素材は収録しません。

原作者または委任を受けた方は、クレジット修正・削除依頼フォームから、クレジットの追加、出典の修正、作品の削除を依頼できます。詳しい手順は [`CONTRIBUTING.md`](CONTRIBUTING.md) を参照してください。

## 著作権

これは非公式の同人アーカイブです。画像の著作権は常に原作者に帰属します。このリポジトリで公開されたことやサイトに掲載されたことによって、画像に MIT ライセンスが自動的に付与されることはありません。再利用する前に、各作品の個別ページに記載された出典とライセンスを確認してください。

このリポジトリの文書素材は [`LICENSE`](LICENSE) に基づいて公開しています。このライセンスは画像、キャラクターデザイン、第三者素材には適用されません。
