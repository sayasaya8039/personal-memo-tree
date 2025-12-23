# Claude Code Skills

このディレクトリにはカスタムスキル（スラッシュコマンド）が含まれます。

## 利用可能なスキル

### 開発ワークフロー

| コマンド | 説明 | ファイル |
|----------|------|----------|
| `/commit` | Git操作を自動化（add, commit, push） | [commit.md](./commit.md) |
| `/review` | コードレビューと改善提案 | [review.md](./review.md) |
| `/deploy` | Cloudflare Workersへデプロイ | [deploy.md](./deploy.md) |
| `/note` | note記事の作成 | [note.md](./note.md) |

### プロジェクト作成・初期化

| コマンド | 説明 | ファイル |
|----------|------|----------|
| `/init` | 新規プロジェクトを素早く初期化 | [init.md](./init.md) |
| `/scaffold` | プロジェクトの足場を作成 | [scaffold.md](./scaffold.md) |

### コード品質・メンテナンス

| コマンド | 説明 | ファイル |
|----------|------|----------|
| `/quickfix` | よくあるエラーを素早く修正 | [quickfix.md](./quickfix.md) |
| `/optimize` | パフォーマンス分析と最適化 | [optimize.md](./optimize.md) |
| `/format` | コードフォーマット | [format.md](./format.md) |
| `/clean` | 不要コード・依存関係をクリーンアップ | [clean.md](./clean.md) |
| `/testgen` | テストコードを自動生成 | [testgen.md](./testgen.md) |

### Bun（パッケージ管理・ランタイム・バンドラー）

| コマンド | 説明 | ファイル |
|----------|------|----------|
| `/bun` | Bun全機能の概要・クイックリファレンス | [bun.md](./bun.md) |
| `/bun-install` | パッケージ管理（install, add, remove） | [bun-install.md](./bun-install.md) |
| `/bun-run` | スクリプト・ファイル実行 | [bun-run.md](./bun-run.md) |
| `/bun-test` | テスト実行（Jest互換） | [bun-test.md](./bun-test.md) |
| `/bun-build` | バンドル・コンパイル | [bun-build.md](./bun-build.md) |
| `/bun-init` | プロジェクト初期化 | [bun-init.md](./bun-init.md) |

## 使い方

Claude Codeのチャットで `/コマンド名` を入力するとスキルが実行されます。

```bash
# 開発ワークフロー
/commit              # 変更をコミット・プッシュ
/review src/index.ts # 特定ファイルをレビュー
/deploy              # 本番環境にデプロイ
/note "テーマ"       # note記事を作成

# プロジェクト作成
/init web-react --name my-app    # Reactアプリを作成
/scaffold hono my-api            # Hono APIの足場を作成

# コード品質・メンテナンス
/quickfix                        # エラーを自動修正
/optimize --frontend             # フロントエンドを最適化
/format --check                  # フォーマットチェック
/clean --deps                    # 依存関係をクリーンアップ
/testgen src/utils/              # テストを自動生成

# Bun操作
/bun                 # Bunの概要・コマンド一覧
/bun-install         # パッケージインストール
/bun-run dev         # スクリプト実行
/bun-test            # テスト実行
/bun-build           # ビルド
/bun-init            # プロジェクト作成
```

## スキルの追加方法

1. このディレクトリに `スキル名.md` ファイルを作成
2. 以下の形式で記述：

```markdown
# /スキル名 スキル

スキルの説明

## 実行内容

1. ステップ1
2. ステップ2
...

## オプション

\`\`\`bash
/スキル名            # 基本実行
/スキル名 --option   # オプション付き
\`\`\`
```

3. このREADME.mdにスキルを追加

## 参考リンク

- [Bun公式ドキュメント](https://bun.sh/docs)
- [Claude Code Skills Complete Guide](https://www.cursor-ide.com/blog/claude-code-skills)
- [awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills)
