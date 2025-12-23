// メモノードの型定義
export interface MemoNode {
  id: string;
  name: string;
  content: string;
  children?: MemoNode[];
  createdAt: number;
  updatedAt: number;
  isExpanded?: boolean;
}

// ページに関連づけられたメモツリー
export interface PageMemoTree {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  rootNodes: MemoNode[];
  createdAt: number;
  updatedAt: number;
}

// ストレージデータ構造
export interface StorageData {
  pageMemoTrees: PageMemoTree[];
  settings: Settings;
}

// 設定
export interface Settings {
  theme: "light" | "dark" | "system";
  autoSave: boolean;
  syncEnabled: boolean;
  defaultExpanded: boolean;
}

// エクスポート形式
export type ExportFormat = "json" | "markdown" | "notebooklm";
