import { useState, useEffect, useCallback } from "react";
import { MemoTree } from "./components/MemoTree";
import { MemoEditor } from "./components/MemoEditor";
import type { PageMemoTree, MemoNode, Settings, ExportFormat } from "./types";
import {
  getStorageData,
  getPageMemoTree,
  createPageMemoTree,
  updatePageMemoTree,
  createMemoNode,
  getAllPageMemoTrees,
  deletePageMemoTree,
  updateSettings,
} from "./utils/storage";
import { exportTree, downloadExport, exportAllTrees } from "./utils/export";
import "./styles/app.css";

interface TabInfo {
  url: string;
  title: string;
  favicon?: string;
}

export const App = () => {
  const [currentTab, setCurrentTab] = useState<TabInfo | null>(null);
  const [currentTree, setCurrentTree] = useState<PageMemoTree | null>(null);
  const [allTrees, setAllTrees] = useState<PageMemoTree[]>([]);
  const [selectedNode, setSelectedNode] = useState<MemoNode | null>(null);
  const [settings, setSettings] = useState<Settings>({
    theme: "system",
    autoSave: true,
    syncEnabled: true,
    defaultExpanded: true,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"current" | "all">("current");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // 現在のタブ情報を取得
  const fetchCurrentTab = useCallback(async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: "GET_CURRENT_TAB" });
      if (response?.url) {
        setCurrentTab(response);
      }
    } catch {
      // 開発環境用のフォールバック
      setCurrentTab({
        url: window.location.href,
        title: document.title,
      });
    }
  }, []);

  // ストレージからデータ読み込み
  const loadData = useCallback(async () => {
    const data = await getStorageData();
    setSettings(data.settings);
    setAllTrees(data.pageMemoTrees);

    if (currentTab?.url) {
      let tree = await getPageMemoTree(currentTab.url);
      if (!tree) {
        tree = await createPageMemoTree(
          currentTab.url,
          currentTab.title,
          currentTab.favicon
        );
        setAllTrees((prev) => [...prev, tree!]);
      }
      setCurrentTree(tree);
    }
  }, [currentTab]);

  useEffect(() => {
    fetchCurrentTab();
  }, [fetchCurrentTab]);

  useEffect(() => {
    if (currentTab) {
      loadData();
    }
  }, [currentTab, loadData]);

  // タブ変更リスナー
  useEffect(() => {
    const handleMessage = (message: { type: string; data: TabInfo }) => {
      if (message.type === "TAB_CHANGED" || message.type === "TAB_UPDATED") {
        setCurrentTab(message.data);
      }
    };
    chrome.runtime?.onMessage?.addListener(handleMessage);
    return () => chrome.runtime?.onMessage?.removeListener(handleMessage);
  }, []);

  // テーマ適用
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.setAttribute("data-theme", isDark ? "dark" : "light");
    } else {
      root.setAttribute("data-theme", settings.theme);
    }
  }, [settings.theme]);

  // ノード更新
  const handleNodeUpdate = async (nodes: MemoNode[]) => {
    if (!currentTree) return;
    const updatedTree = { ...currentTree, rootNodes: nodes };
    setCurrentTree(updatedTree);
    await updatePageMemoTree(updatedTree);
  };

  // 選択ノード更新
  const handleSelectedNodeUpdate = async (node: MemoNode) => {
    if (!currentTree) return;

    const updateNode = (nodeList: MemoNode[]): MemoNode[] => {
      return nodeList.map((n) => {
        if (n.id === node.id) return node;
        if (n.children) return { ...n, children: updateNode(n.children) };
        return n;
      });
    };

    const updatedNodes = updateNode(currentTree.rootNodes);
    await handleNodeUpdate(updatedNodes);
    setSelectedNode(node);
  };

  // 新規ルートノード追加
  const handleAddRootNode = async () => {
    if (!currentTree) return;
    const newNode = createMemoNode("新しいメモ");
    const updatedNodes = [...currentTree.rootNodes, newNode];
    await handleNodeUpdate(updatedNodes);
    setSelectedNode(newNode);
  };

  // エクスポート
  const handleExport = (format: ExportFormat) => {
    if (viewMode === "current" && currentTree) {
      const content = exportTree(currentTree, format);
      downloadExport(content, currentTree.title || "memo", format);
    } else if (viewMode === "all") {
      const content = exportAllTrees(allTrees, format);
      downloadExport(content, "all-memos", format);
    }
    setShowExportMenu(false);
  };

  // NotebookLM Web Importer拡張機能のID
  const NOTEBOOKLM_IMPORTER_ID = "ijdefdijdmghafocfmmdojfghnpelnfn";

  // NotebookLM Web Importerに送信を試みる
  const tryNotebookLMImporter = async (content: string): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        if (!chrome.runtime?.sendMessage) {
          resolve(false);
          return;
        }

        // 外部拡張機能にメッセージを送信
        chrome.runtime.sendMessage(
          NOTEBOOKLM_IMPORTER_ID,
          {
            type: "IMPORT_TEXT",
            action: "importText",
            text: content,
            title: currentTree?.title || "メモツリー",
            source: "個人メモツリー拡張機能"
          },
          (response) => {
            // エラーチェック（拡張機能が存在しない場合など）
            if (chrome.runtime.lastError) {
              console.log("NotebookLM Web Importer not available:", chrome.runtime.lastError.message);
              resolve(false);
              return;
            }
            if (response?.success) {
              resolve(true);
            } else {
              resolve(false);
            }
          }
        );

        // タイムアウト（2秒で応答がなければフォールバック）
        setTimeout(() => resolve(false), 2000);
      } catch {
        resolve(false);
      }
    });
  };

  // NotebookLMに直接エクスポート
  const handleExportToNotebookLM = async () => {
    let content: string;
    if (viewMode === "current" && currentTree) {
      content = exportTree(currentTree, "notebooklm");
    } else {
      content = exportAllTrees(allTrees, "notebooklm");
    }

    // まずNotebookLM Web Importerへの送信を試みる
    const importerSuccess = await tryNotebookLMImporter(content);

    if (importerSuccess) {
      alert("NotebookLM Web Importerにメモを送信しました！\n\nNotebookLMでインポートを完了してください。");
      setShowExportMenu(false);
      return;
    }

    // フォールバック：クリップボード + 新しいタブ
    try {
      await navigator.clipboard.writeText(content);

      const notebookLMUrl = "https://notebooklm.google.com/";
      if (chrome.tabs) {
        chrome.tabs.create({ url: notebookLMUrl });
      } else {
        window.open(notebookLMUrl, "_blank");
      }

      alert("メモをクリップボードにコピーしました！\n\nNotebookLMで:\n1.「ソースを追加」→「コピーしたテキスト」\n2. Ctrl+V で貼り付け\n\n💡 NotebookLM Web Importer拡張機能をインストールすると、より簡単にインポートできます。");
    } catch (err) {
      console.error("クリップボードへのコピーに失敗:", err);
      alert("クリップボードへのコピーに失敗しました");
    }
    setShowExportMenu(false);
  };

  // テーマ切り替え
  const handleThemeChange = async (theme: Settings["theme"]) => {
    const newSettings = { ...settings, theme };
    setSettings(newSettings);
    await updateSettings(newSettings);
  };

  // ツリー削除
  const handleDeleteTree = async (id: string) => {
    if (!confirm("このメモツリーを削除しますか？")) return;
    await deletePageMemoTree(id);
    setAllTrees((prev) => prev.filter((t) => t.id !== id));
    if (currentTree?.id === id) {
      setCurrentTree(null);
      setSelectedNode(null);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>メモツリー</h1>
        <div className="header-actions">
          <input
            type="text"
            className="search-input"
            placeholder="検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            className="icon-btn"
            onClick={() => setShowExportMenu(!showExportMenu)}
            title="エクスポート"
          >
            Export
          </button>
          <button
            className="icon-btn"
            onClick={() => setShowSettings(!showSettings)}
            title="設定"
          >
            Settings
          </button>
        </div>
      </header>

      {showExportMenu && (
        <div className="dropdown-menu">
          <button onClick={() => handleExport("json")}>JSON形式</button>
          <button onClick={() => handleExport("markdown")}>Markdown形式</button>
          <div className="dropdown-divider" />
          <button onClick={handleExportToNotebookLM} className="highlight">
            NotebookLMに送信
          </button>
          <button onClick={() => handleExport("notebooklm")}>NotebookLM用(.txt)</button>
        </div>
      )}

      {showSettings && (
        <div className="settings-panel">
          <h3>設定</h3>
          <div className="setting-item">
            <label>テーマ</label>
            <select
              value={settings.theme}
              onChange={(e) => handleThemeChange(e.target.value as Settings["theme"])}
            >
              <option value="light">ライト</option>
              <option value="dark">ダーク</option>
              <option value="system">システム</option>
            </select>
          </div>
          <button className="close-btn" onClick={() => setShowSettings(false)}>
            閉じる
          </button>
        </div>
      )}

      <div className="view-tabs">
        <button
          className={`view-tab ${viewMode === "current" ? "active" : ""}`}
          onClick={() => setViewMode("current")}
        >
          このページ
        </button>
        <button
          className={`view-tab ${viewMode === "all" ? "active" : ""}`}
          onClick={() => setViewMode("all")}
        >
          すべて
        </button>
      </div>

      {currentTab && viewMode === "current" && (
        <div className="current-page-info">
          {currentTab.favicon && (
            <img src={currentTab.favicon} alt="" className="favicon" />
          )}
          <span className="page-title">{currentTab.title}</span>
        </div>
      )}

      <div className="main-content">
        {viewMode === "current" ? (
          <>
            <div className="tree-panel">
              <div className="panel-header">
                <span>メモ一覧</span>
                <button className="add-btn" onClick={handleAddRootNode}>
                  + 追加
                </button>
              </div>
              <MemoTree
                nodes={currentTree?.rootNodes || []}
                onNodeSelect={setSelectedNode}
                onNodeUpdate={handleNodeUpdate}
                selectedNodeId={selectedNode?.id}
                searchQuery={searchQuery}
              />
            </div>
            <div className="editor-panel">
              <MemoEditor node={selectedNode} onUpdate={handleSelectedNodeUpdate} />
            </div>
          </>
        ) : (
          <div className="all-trees-panel">
            {allTrees.length === 0 ? (
              <div className="empty-state">
                <p>保存されたメモがありません</p>
              </div>
            ) : (
              allTrees
                .filter(
                  (tree) =>
                    !searchQuery ||
                    tree.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    tree.url.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((tree) => (
                  <div
                    key={tree.id}
                    className={`tree-item ${tree.id === currentTree?.id ? "current" : ""}`}
                  >
                    <div className="tree-item-info">
                      <span className="tree-title">{tree.title}</span>
                      <span className="tree-url">{tree.url}</span>
                      <span className="tree-count">
                        {tree.rootNodes.length} メモ
                      </span>
                    </div>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteTree(tree.id)}
                      title="削除"
                    >
                      Delete
                    </button>
                  </div>
                ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
