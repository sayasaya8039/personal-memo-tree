import { useState, useEffect, useRef } from "react";
import type { MemoNode } from "../types";

interface MemoEditorProps {
  node: MemoNode | null;
  onUpdate: (node: MemoNode) => void;
}

// シンプルなMarkdownプレビュー
const renderMarkdown = (text: string): string => {
  if (!text) return "";
  
  return text
    // コードブロック
    .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
    // インラインコード
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // 太字
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // 斜体
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // リンク
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>')
    // リスト
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>")
    // 見出し
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // 改行
    .replace(/\n/g, "<br>");
};

export const MemoEditor = ({ node, onUpdate }: MemoEditorProps) => {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [isPreview, setIsPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (node) {
      setName(node.name);
      setContent(node.content);
    }
  }, [node?.id]);

  const handleSave = () => {
    if (!node) return;
    onUpdate({
      ...node,
      name,
      content,
      updatedAt: Date.now(),
    });
  };

  // 自動保存（デバウンス）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (node && (name !== node.name || content !== node.content)) {
        handleSave();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [name, content]);

  if (!node) {
    return (
      <div className="memo-editor empty">
        <p>メモを選択してください</p>
      </div>
    );
  }

  return (
    <div className="memo-editor">
      <input
        type="text"
        className="node-name-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="メモタイトル"
      />
      <div className="editor-toolbar">
        <div className="tab-buttons">
          <button
            className={`tab-btn ${!isPreview ? "active" : ""}`}
            onClick={() => setIsPreview(false)}
          >
            編集
          </button>
          <button
            className={`tab-btn ${isPreview ? "active" : ""}`}
            onClick={() => setIsPreview(true)}
          >
            プレビュー
          </button>
        </div>
        <div className="format-hints">
          **太字** | *斜体* | `コード` | - リスト
        </div>
      </div>
      {isPreview ? (
        <div
          className="preview"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
      ) : (
        <textarea
          ref={textareaRef}
          className="content-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="メモ内容を入力... (Markdown対応)"
        />
      )}
      <div className="editor-footer">
        <span className="timestamp">
          更新: {new Date(node.updatedAt).toLocaleString("ja-JP")}
        </span>
      </div>
    </div>
  );
};
