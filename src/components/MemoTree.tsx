import type { MemoNode } from "../types";

interface MemoTreeProps {
  nodes: MemoNode[];
  onNodeSelect: (node: MemoNode) => void;
  onNodeUpdate: (nodes: MemoNode[]) => void;
  selectedNodeId?: string;
  searchQuery?: string;
}

// ノードが検索にマッチするか
const matchesSearch = (node: MemoNode, query: string): boolean => {
  if (!query) return true;
  const lowerQuery = query.toLowerCase();
  if (node.name.toLowerCase().includes(lowerQuery)) return true;
  if (node.content.toLowerCase().includes(lowerQuery)) return true;
  if (node.children?.some((child) => matchesSearch(child, query))) return true;
  return false;
};

// ツリーノードコンポーネント
const TreeNode = ({
  node,
  depth,
  onSelect,
  onToggle,
  onAddChild,
  onDelete,
  selectedId,
  searchQuery,
}: {
  node: MemoNode;
  depth: number;
  onSelect: (node: MemoNode) => void;
  onToggle: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string) => void;
  selectedId?: string;
  searchQuery?: string;
}) => {
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = node.id === selectedId;
  const matches = matchesSearch(node, searchQuery || "");

  if (!matches && searchQuery) return null;

  return (
    <div className="tree-node">
      <div
        className={`node-item ${isSelected ? "selected" : ""}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(node)}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("nodeId", node.id);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const draggedId = e.dataTransfer.getData("nodeId");
          if (draggedId !== node.id) {
            // ドラッグ&ドロップのハンドリングは親で処理
          }
        }}
      >
        <button
          className="toggle-btn"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(node.id);
          }}
        >
          {hasChildren ? (node.isExpanded ? "▼" : "▶") : "•"}
        </button>
        <span className="node-name">{node.name}</span>
        <div className="node-actions">
          <button
            className="action-btn"
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(node.id);
            }}
            title="子メモを追加"
          >
            +
          </button>
          <button
            className="action-btn delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.id);
            }}
            title="削除"
          >
            ×
          </button>
        </div>
      </div>
      {hasChildren && node.isExpanded && (
        <div className="children">
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              onToggle={onToggle}
              onAddChild={onAddChild}
              onDelete={onDelete}
              selectedId={selectedId}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const MemoTree = ({
  nodes,
  onNodeSelect,
  onNodeUpdate,
  selectedNodeId,
  searchQuery,
}: MemoTreeProps) => {
  // ノードの展開/折りたたみ
  const handleToggle = (id: string) => {
    const toggleNode = (nodeList: MemoNode[]): MemoNode[] => {
      return nodeList.map((node) => {
        if (node.id === id) {
          return { ...node, isExpanded: !node.isExpanded };
        }
        if (node.children) {
          return { ...node, children: toggleNode(node.children) };
        }
        return node;
      });
    };
    onNodeUpdate(toggleNode(nodes));
  };

  // 子ノード追加
  const handleAddChild = (parentId: string) => {
    const newNode: MemoNode = {
      id: crypto.randomUUID(),
      name: "新しいメモ",
      content: "",
      children: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isExpanded: true,
    };

    const addChild = (nodeList: MemoNode[]): MemoNode[] => {
      return nodeList.map((node) => {
        if (node.id === parentId) {
          return {
            ...node,
            children: [...(node.children || []), newNode],
            isExpanded: true,
          };
        }
        if (node.children) {
          return { ...node, children: addChild(node.children) };
        }
        return node;
      });
    };
    onNodeUpdate(addChild(nodes));
    onNodeSelect(newNode);
  };

  // ノード削除
  const handleDelete = (id: string) => {
    const deleteNode = (nodeList: MemoNode[]): MemoNode[] => {
      return nodeList
        .filter((node) => node.id !== id)
        .map((node) => {
          if (node.children) {
            return { ...node, children: deleteNode(node.children) };
          }
          return node;
        });
    };
    onNodeUpdate(deleteNode(nodes));
  };

  return (
    <div className="memo-tree">
      {nodes.length === 0 ? (
        <div className="empty-state">
          <p>メモがありません</p>
          <p>「+」ボタンで新規メモを追加</p>
        </div>
      ) : (
        nodes.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            depth={0}
            onSelect={onNodeSelect}
            onToggle={handleToggle}
            onAddChild={handleAddChild}
            onDelete={handleDelete}
            selectedId={selectedNodeId}
            searchQuery={searchQuery}
          />
        ))
      )}
    </div>
  );
};
