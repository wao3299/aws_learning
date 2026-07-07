# bun 移行 設計ドキュメント

日付: 2026-07-07

## 目的

パッケージ管理とタスク実行を npm から bun に移行し、ローカル開発と CI の依存インストールを高速化する。

## 方針

bun は**パッケージマネージャ兼タスクランナー**として使う。astro CLI の実行ランタイムは従来通り Node.js（Astro 公式の Bun レシピと同じ形）。Astro 公式ドキュメントは Bun ランタイム利用について「may reveal rough edges」と注意しているため、Astro を Bun ランタイムで動かす構成にはしない。

例外として `scripts/validate.js` は自前の単純なスクリプト（fs / JSON 処理のみ）なので、Bun ランタイムで直接実行する形に変える。これにより CI の validate ジョブは Node のセットアップが不要になる。

## 変更内容

1. **lockfile 移行**
   - `bun install` を実行して `bun.lock` を生成する（手書きせず正規コマンド経由で生成）
   - `package-lock.json` を削除する
2. **package.json**
   - `validate` script を `node scripts/validate.js` → `bun scripts/validate.js` に変更
   - 他の scripts（`dev` / `build` / `preview`）は変更しない（`astro dev` 等はランナー非依存）
3. **`.github/workflows/deploy.yml`**
   - `actions/setup-node@v4` → `oven-sh/setup-bun@v2`
   - `npm ci` → `bun install --frozen-lockfile`
   - `npm run build` → `bun run build`
4. **`.github/workflows/validate.yml`**
   - `actions/setup-node@v4` → `oven-sh/setup-bun@v2`
   - `node scripts/validate.js` → `bun run validate`
5. **README.md**
   - コマンド記載を `bun install` / `bun run dev` 等に更新
6. **`.claude/CLAUDE.md`**
   - コマンド記載（`npm install` / `npm run dev` 等）を bun に更新
   - validate の説明で `scripts/validate.js` の実行が bun になる点を反映

## 変更しないもの

- Astro の実行ランタイム（Node のまま。deploy.yml のビルドは setup-bun のランナーにプリインストールされた Node を astro が使う）
- 問題データ・クイズエンジン・ページ類（今回の移行とは無関係）

## 検証

- ローカルで `bun install` → `bun run validate` → `bun run build` が成功すること
- `bun run dev` で http://localhost:4321/aws_learning/ が表示されること
- CI（validate.yml / deploy.yml）は PR / マージ後に GitHub Actions 上で確認

## 参考

- Astro 公式 Bun レシピ: https://docs.astro.build/en/recipes/bun/
- 将来 Cloudflare Pages に載せる場合: テキスト形式 `bun.lock` が自動検出されない問題（2025 年時点）があるため、ビルドコマンドを `bun install && bun run build` と明示する
