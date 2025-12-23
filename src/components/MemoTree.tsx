import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent, DragOverEvent } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

// ツリーをフラット化してIDリストを取得
const flattenTree = (nodes: MemoNode[]): string[] => {
  const result: string[] = [];
  const traverse = (nodeList: MemoNode[]) => {
    for (const node of nodeList) {
      result.push(node.id);
      if (node.children && node.isExpanded) {
        traverse(node.children);
      }
    }
  };
  traverse(nodes);
  return result;
};

// IDでノードを検索
const findNodeById = (nodes: MemoNode[], id: string): MemoNode | null => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

// ノードを削除して返す
const removeNode = (nodes: MemoNode[], id: string): { nodes: MemoNode[]; removed: MemoNode | null } => {
  let removed: MemoNode | null = null;
  const newNodes = nodes.filter((node) => {
    if (node.id === id) {
      removed = node;
      return false;
    }
    return true;
  }).map((node) => {
    if (node.children) {
      const result = removeNode(node.children, id);
      if (result.removed) removed = result.removed;
      return { ...node, children: result.nodes };
    }
    return node;
  });
  return { nodes: newNodes, removed };
};

// ノードを特定の位置に挿入（子として）
const insertAsChild = (
  nodes: MemoNode[],
  nodeToInsert: MemoNode,
  targetId: string
): MemoNode[] => {
  return nodes.map((node) => {
    if (node.id === targetId) {
      return {
        ...node,
        children: [...(node.children || []), nodeToInsert],
        isExpanded: true,
      };
    }
    if (node.children) {
      return { ...node, children: insertAsChild(node.children, nodeToInsert, targetId) };
    }
    return node;
  });
};

// ソート可能なツリーノード
const SortableTreeNode = ({
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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasChildren = node.children && node.children.length > 0;
  const isSelected = node.id === selectedId;
  const matches = matchesSearch(node, searchQuery || "");

  if (!matches && searchQuery) return null;

  return (
    <div ref={setNodeRef} style={style} className="tree-node">
      <div
        className={`node-item ${isSelected ? "selected" : ""} ${isDragging ? "dragging" : ""} ${isOver ? "drop-target" : ""}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(node)}
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
        <span className="node-name drag-handle" {...attributes} {...listeners}>
          {node.name}
        </span>
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
            <SortableTreeNode
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
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // ドラッグ中のビジュアルフィードバック用
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const draggedId = active.id as string;
    const targetId = over.id as string;

    // 自分の子孫にドロップしようとしていないかチェック
    const isDescendant = (parentId: string, childId: string): boolean => {
      const parent = findNodeById(nodes, parentId);
      if (!parent?.children) return false;
      for (const child of parent.children) {
        if (child.id === childId) return true;
        if (isDescendant(child.id, childId)) return true;
      }
      return false;
    };

    if (isDescendant(draggedId, targetId)) return;

    // ノードを移動
    const { nodes: nodesAfterRemove, removed } = removeNode(nodes, draggedId);
    if (!removed) return;

    // ドロップ先の子として追加
    const newNodes = insertAsChild(nodesAfterRemove, removed, targetId);
    onNodeUpdate(newNodes);
  };

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

  const activeNode = activeId ? findNodeById(nodes, activeId) : null;
  const flatIds = flattenTree(nodes);

  return (
    <div className="memo-tree">
      {nodes.length === 0 ? (
        <div className="empty-state">
          <p>メモがありません</p>
          <p>「+」ボタンで新規メモを追加</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={flatIds} strategy={verticalListSortingStrategy}>
            {nodes.map((node) => (
              <SortableTreeNode
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
            ))}
          </SortableContext>
          <DragOverlay>
            {activeNode ? (
              <div className="node-item dragging-overlay">
                <span className="node-name">{activeNode.name}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
};
