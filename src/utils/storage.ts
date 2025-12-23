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
// メモデータはlocalに保存（容量制限が緩い: 5MB+）、設定はsyncに保存
export const getStorageData = async (): Promise<StorageData> => {
  const [localResult, syncResult] = await Promise.all([
    chrome.storage.local.get(["pageMemoTrees"]),
    chrome.storage.sync.get(["settings"]),
  ]);
  return {
    pageMemoTrees: (localResult.pageMemoTrees as PageMemoTree[] | undefined) || [],
    settings: (syncResult.settings as Settings | undefined) || DEFAULT_SETTINGS,
  };
};

// ストレージ全体を保存
export const saveStorageData = async (data: StorageData): Promise<void> => {
  await Promise.all([
    chrome.storage.local.set({ pageMemoTrees: data.pageMemoTrees }),
    chrome.storage.sync.set({ settings: data.settings }),
  ]);
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

// sync から local への移行（初回起動時）
export const migrateToLocalStorage = async (): Promise<void> => {
  try {
    const syncResult = await chrome.storage.sync.get(["pageMemoTrees"]);
    const localResult = await chrome.storage.local.get(["pageMemoTrees"]);

    const syncTrees = (syncResult.pageMemoTrees as PageMemoTree[] | undefined) || [];
    const localTrees = (localResult.pageMemoTrees as PageMemoTree[] | undefined) || [];

    // syncにデータがある場合は移行（localにマージ）
    if (syncTrees.length > 0) {
      console.log("個人メモツリー: Migrating data from sync to local storage...");

      // 既存のlocalデータとマージ（重複IDは除外）
      const existingIds = new Set(localTrees.map(t => t.id));
      const newTrees = syncTrees.filter(t => !existingIds.has(t.id));
      const mergedTrees = [...localTrees, ...newTrees];

      await chrome.storage.local.set({ pageMemoTrees: mergedTrees });
      // 移行後、syncからメモデータを削除（容量確保）
      await chrome.storage.sync.remove("pageMemoTrees");
      console.log(`個人メモツリー: Migration complete (${newTrees.length} trees migrated)`);
    }
  } catch (error) {
    console.error("個人メモツリー: Migration error", error);
  }
};
