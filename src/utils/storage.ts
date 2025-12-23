import type { StorageData, PageMemoTree, MemoNode, Settings } from "../types";

const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  autoSave: true,
  syncEnabled: true,
  defaultExpanded: true,
};

// UUID生成
export const generateId = (): string => {
  return crypto.randomUUID();
};

// ストレージ全体を取得
export const getStorageData = async (): Promise<StorageData> => {
  const result = await chrome.storage.sync.get(["pageMemoTrees", "settings"]);
  return {
    pageMemoTrees: result.pageMemoTrees || [],
    settings: result.settings || DEFAULT_SETTINGS,
  };
};

// ストレージ全体を保存
export const saveStorageData = async (data: StorageData): Promise<void> => {
  await chrome.storage.sync.set(data);
};

// ページメモツリーを取得（URLで検索）
export const getPageMemoTree = async (url: string): Promise<PageMemoTree | undefined> => {
  const data = await getStorageData();
  return data.pageMemoTrees.find((tree) => tree.url === url);
};

// ページメモツリーを作成
export const createPageMemoTree = async (
  url: string,
  title: string,
  favicon?: string
): Promise<PageMemoTree> => {
  const data = await getStorageData();
  const newTree: PageMemoTree = {
    id: generateId(),
    url,
    title,
    favicon,
    rootNodes: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  data.pageMemoTrees.push(newTree);
  await saveStorageData(data);
  return newTree;
};

// ページメモツリーを更新
export const updatePageMemoTree = async (tree: PageMemoTree): Promise<void> => {
  const data = await getStorageData();
  const index = data.pageMemoTrees.findIndex((t) => t.id === tree.id);
  if (index !== -1) {
    data.pageMemoTrees[index] = { ...tree, updatedAt: Date.now() };
    await saveStorageData(data);
  }
};

// メモノードを作成
export const createMemoNode = (name: string, content: string = ""): MemoNode => {
  return {
    id: generateId(),
    name,
    content,
    children: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isExpanded: true,
  };
};

// ツリー内のノードを再帰的に検索
export const findNodeById = (nodes: MemoNode[], id: string): MemoNode | undefined => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
};

// 設定を更新
export const updateSettings = async (settings: Partial<Settings>): Promise<void> => {
  const data = await getStorageData();
  data.settings = { ...data.settings, ...settings };
  await saveStorageData(data);
};

// 全メモツリーを取得
export const getAllPageMemoTrees = async (): Promise<PageMemoTree[]> => {
  const data = await getStorageData();
  return data.pageMemoTrees;
};

// ページメモツリーを削除
export const deletePageMemoTree = async (id: string): Promise<void> => {
  const data = await getStorageData();
  data.pageMemoTrees = data.pageMemoTrees.filter((tree) => tree.id !== id);
  await saveStorageData(data);
};
