# exquisite-fish-corpse

優美な魚の屍骸

## 概要

[Wikipedia](https://ja.wikipedia.org/wiki/%E5%84%AA%E7%BE%8E%E3%81%AA%E5%B1%8D%E9%AA%B8)より引用:

> 優美な屍骸（ゆうびなしがい、フランス語: le cadavre exquis）とは、シュルレアリスムにおける作品の共同制作の手法で、複数の人間が互いに他の人間がどのようなものを制作しているかを知ることなしに自分のパートだけを制作するというもの。

これのごく短いテキスト版を、一人で遊べるアプリケーションとして実装したもの。

作者が昔遊んだ、絵画における優美な屍骸をテキストに置き換えるのがコンセプト。そのため、前後の文章の端を最低限開示して、そこに続く文章を考える形になっている。

## ドキュメント

- [要求仕様](docs/01_REQUIREMENT.md)

## パッケージ

- `packages/core`: コアライブラリ
- `packages/web`: Web UI
- `packages/cli`: CLI

## CLI

CLIを初めて使うときやソースを変更したときは、単体ファイルへビルドする。

```sh
pnpm build:cli
```

以降の `pnpm cli` はビルド済みのCLIをそのまま実行する。

```sh
pnpm cli --help
```

別の場所へ持ち出す場合は、生成された `packages/cli/dist/cli.mjs` だけをコピーする。

```sh
node cli.mjs --help
```

以下コマンドで新規ゲームを作成する。初期断片のフラグはそれぞれ複数回指定できる。

```sh
pnpm cli new \
  --state game.json \
  --seed 12345 \
  --beginning "昨今の情勢を鑑みるに、" \
  --middle "やっぱり借金って怖いもので、" \
  --end "彼はただ泣きそうな顔で笑った。" \
  --json
```

1ターンずつ遊ぶ場合は、以下を完成まで繰り返す。

```sh
pnpm cli next --state game.json --json
pnpm cli answer --state game.json --challenge-id ID --text "続きの断片" --json
pnpm cli result --state game.json --json
```

人間がターミナルで対話的に遊ぶ場合は `play` を使う。`new` と同じ初期断片・設定を指定できる。

```sh
pnpm cli play --state game.json --seed 12345 \
  --beginning "始まりは" --middle "魚が空を" --end "静かに眠った。"
```

コーディングエージェント向けの遊び方と禁止事項は `--llm` で出力できる。

```sh
pnpm cli --llm
```

## 生成AIの利用

このプロジェクトは、以下の生成AIツールの支援を受けて作成されている。

- GitHub Copilot
  - 手打ちでコード直すときの補完
  - ドキュメントの補完
- gpt-5-codex (Codexから) ※2025年11月
  - 全体的なコーディング
- GPT-5, GPT-5.1 (ChatGPTから) ※2025年11月
  - 最初のアイデアを要求仕様に落とし込む部分
  - これがシュルレアリスム足り得るかの議論
  - ほか雑多な相談事
- GPT-5.6 Sol (Codexから) ※2026年7月
  - CLI開発
- Gemma 4 26B A4B (Piから) ※2026年7月
  - CLIテストプレイ

人間が担当したのは以下の部分。

- 要求仕様の策定
- 技術選定
- 開発環境のセットアップ
- ドキュメント執筆 (GitHub Copilotの補完あり)
- コアライブラリの外部設計
- コアライブラリのE2Eテストの作成
- Web UIの外部設計およびデザイン
- コードレビュー
- サンプル用スニペットの作成
