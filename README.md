# 個人メモツリー

ページ/タブごとにメモを関連づけて、階層ツリー構造で管理するChrome拡張機能

## 機能

- **ページ関連づけ**: 閲覧中のページURLにメモを自動紐付け
- **階層ツリー構造**: 無制限のネスト階層でメモを整理
- **ドラッグ&ドロップ**: メモの並び替え・階層移動
- **Markdown対応**: 太字、斜体、コード、リストなど
- **自動保存**: chrome.storage.syncでクラウド同期
- **全文検索**: ツリー内のメモを即座に検索
- **エクスポート**: JSON / Markdown / NotebookLM形式で出力
- **ダークモード**: システム設定に連動

## インストール

### 開発版

```bash
# 依存関係インストール
bun install

# ビルド
bun run build
```

1. Chrome で `chrome://extensions` を開く
2. 「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」
4. `個人メモツリー` フォルダを選択

## 使い方

1. 拡張機能アイコンをクリックしてSide Panelを開く
2. 「+ 追加」でルートメモを作成
3. ノードの「+」で子メモを追加
4. メモを選択して右側のエディタで編集
5. 「すべて」タブで全ページのメモを一覧表示

## エクスポート形式

| 形式 | 用途 |
|------|------|
| JSON | バックアップ、他ツール連携 |
| Markdown | Notion、Obsidian等へインポート |
| NotebookLM用 | Google NotebookLMへアップロード |

## 技術スタック

- React 19
- TypeScript
- Vite
- Chrome Extension Manifest V3
- Side Panel API
- chrome.storage.sync

## ディレクトリ構成

```
個人メモツリー表示/
├── src/
│   ├── components/     # Reactコンポーネント
│   ├── utils/          # ユーティリティ関数
│   ├── types/          # 型定義
│   ├── styles/         # CSS
│   ├── App.tsx         # メインアプリ
│   └── sidepanel.tsx   # エントリーポイント
├── public/
│   ├── manifest.json   # 拡張機能マニフェスト
│   └── icons/          # アイコン
└── 個人メモツリー/     # ビルド出力
```

## ライセンス

MIT
